-- Pantry + normalized ingredients + suggestions
-- Run this in the SQL editor for your Supabase project

-- 1) Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- 2) Base tables

-- Canonical ingredients
CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name citext NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ingredients_name UNIQUE (name)
);

-- Recipe <-> Ingredient mapping (normalized)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity numeric,
  unit text,
  note text,
  is_optional boolean NOT NULL DEFAULT false,
  raw_text text NOT NULL, -- original line
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_recipe_ingredients_recipe_raw
  ON public.recipe_ingredients(recipe_id, raw_text);

-- User pantry (one row per user x ingredient)
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  cleaned_name citext, -- optional, lets clients upsert by name directly
  quantity numeric,
  unit text,
  note text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pantry_user_ingredient UNIQUE (user_id, ingredient_id)
);
-- If the table already existed from a prior version, ensure cleaned_name column exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_items' AND column_name='cleaned_name'
  ) THEN
    ALTER TABLE public.pantry_items ADD COLUMN cleaned_name citext;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_pantry_user ON public.pantry_items(user_id);
CREATE INDEX IF NOT EXISTS idx_pantry_ingredient ON public.pantry_items(ingredient_id);
-- also avoid duplicate names per user when using cleaned_name
CREATE UNIQUE INDEX IF NOT EXISTS uq_pantry_user_cleaned_name
  ON public.pantry_items(user_id, cleaned_name);

-- Ensure default for user_id exists even if table pre-existed
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    JOIN pg_class c ON c.oid = d.adrelid
    WHERE c.relname = 'pantry_items' AND a.attname = 'user_id'
  ) THEN
    ALTER TABLE public.pantry_items ALTER COLUMN user_id SET DEFAULT auth.uid();
  END IF;
END $$;

-- 3) Updated-at trigger (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingredients_updated ON public.ingredients;
CREATE TRIGGER trg_ingredients_updated
BEFORE UPDATE ON public.ingredients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_recipe_ingredients_updated ON public.recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_updated
BEFORE UPDATE ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_pantry_items_updated ON public.pantry_items;
CREATE TRIGGER trg_pantry_items_updated
BEFORE UPDATE ON public.pantry_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Keep ingredient_id and cleaned_name in sync so clients can use either
CREATE OR REPLACE FUNCTION public.pantry_items_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- On INSERT: if ingredient_id missing but cleaned_name provided, resolve/create ingredient
  IF TG_OP = 'INSERT' THEN
    IF NEW.ingredient_id IS NULL AND coalesce(NEW.cleaned_name::text,'') <> '' THEN
      SELECT id INTO NEW.ingredient_id FROM public.ingredients WHERE name = NEW.cleaned_name;
      IF NEW.ingredient_id IS NULL THEN
        INSERT INTO public.ingredients(name) VALUES (NEW.cleaned_name) RETURNING id INTO NEW.ingredient_id;
      END IF;
    END IF;
    -- If cleaned_name missing but ingredient provided, backfill from ingredients
    IF NEW.cleaned_name IS NULL AND NEW.ingredient_id IS NOT NULL THEN
      SELECT name INTO NEW.cleaned_name FROM public.ingredients WHERE id = NEW.ingredient_id;
    END IF;
  ELSE
    -- On UPDATE: if cleaned_name changed, update ingredient_id accordingly
    IF NEW.cleaned_name IS DISTINCT FROM OLD.cleaned_name AND coalesce(NEW.cleaned_name::text,'') <> '' THEN
      SELECT id INTO NEW.ingredient_id FROM public.ingredients WHERE name = NEW.cleaned_name;
      IF NEW.ingredient_id IS NULL THEN
        INSERT INTO public.ingredients(name) VALUES (NEW.cleaned_name) RETURNING id INTO NEW.ingredient_id;
      END IF;
    ELSIF NEW.ingredient_id IS DISTINCT FROM OLD.ingredient_id AND NEW.ingredient_id IS NOT NULL THEN
      SELECT name INTO NEW.cleaned_name FROM public.ingredients WHERE id = NEW.ingredient_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pantry_sync ON public.pantry_items;
CREATE TRIGGER trg_pantry_sync
BEFORE INSERT OR UPDATE ON public.pantry_items
FOR EACH ROW EXECUTE FUNCTION public.pantry_items_sync();

-- 4) RLS for pantry (private per-user)
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pantry select own" ON public.pantry_items;
CREATE POLICY "Pantry select own"
  ON public.pantry_items FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Pantry insert own" ON public.pantry_items;
CREATE POLICY "Pantry insert own"
  ON public.pantry_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Pantry update own" ON public.pantry_items;
CREATE POLICY "Pantry update own"
  ON public.pantry_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Pantry delete own" ON public.pantry_items;
CREATE POLICY "Pantry delete own"
  ON public.pantry_items FOR DELETE
  USING (user_id = auth.uid());

-- 5) Helper to extract a best-effort ingredient name from a raw line
CREATE OR REPLACE FUNCTION public.guess_ingredient_name(raw text)
RETURNS citext
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(
           regexp_replace(
             regexp_replace(
               regexp_replace(lower(coalesce(raw, '')), '\\([^)]*\\)', '', 'g'),         -- remove (...) notes
               '^\\s*(?:~?[\\dx/., ]+)?\\s*(?:x\\s*)?' ||
               '(?:tsp|tbsp|teaspoons?|tablespoons?|cups?|cup|g|kg|mg|l|ml|cl|dl|oz|ounce|ounces|lb|lbs|pounds?|pinch|pinches|' ||
               'clove|cloves|can|cans|packet|packets|stick|sticks|slice|slices|bunch|bunches|sprig|sprigs)\\.?\\s*', '', 'i' -- leading qty/unit
             ),
             '\\s+[,–-].*$', '', 'g'                                                   -- trailing after comma/dash
           )
         )::citext
$$;

-- 6) One-shot migration of existing recipe ingredients (from recipes.ingredients JSON array)
WITH src AS (
  SELECT r.id AS recipe_id,
         jsonb_array_elements_text(r.ingredients::jsonb) AS raw_line
  FROM public.recipes r
  WHERE r.ingredients IS NOT NULL
    AND jsonb_typeof(r.ingredients::jsonb) = 'array'
    AND jsonb_array_length(r.ingredients::jsonb) > 0
),
names AS (
  SELECT DISTINCT public.guess_ingredient_name(raw_line) AS name
  FROM src
  WHERE coalesce(trim(raw_line), '') <> ''
)
INSERT INTO public.ingredients(name)
SELECT n.name
FROM names n
WHERE coalesce(n.name::text, '') <> ''
ON CONFLICT (name) DO NOTHING;

WITH src AS (
  SELECT r.id AS recipe_id,
         jsonb_array_elements_text(r.ingredients::jsonb) AS raw_line
  FROM public.recipes r
  WHERE r.ingredients IS NOT NULL
    AND jsonb_typeof(r.ingredients::jsonb) = 'array'
    AND jsonb_array_length(r.ingredients::jsonb) > 0
)
INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, raw_text)
SELECT s.recipe_id, i.id, s.raw_line
FROM src s
JOIN public.ingredients i
  ON i.name = public.guess_ingredient_name(s.raw_line)
ON CONFLICT (recipe_id, raw_text) DO NOTHING;

-- 7) What-can-I-make function for current user
CREATE OR REPLACE FUNCTION public.recipes_can_make()
RETURNS TABLE (
  recipe_id uuid,
  have_count int,
  need_count int,
  missing_count int,
  can_make boolean,
  missing_ingredients text[],
  have_ingredients text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH required AS (
    SELECT ri.recipe_id, ri.ingredient_id, i.name
    FROM public.recipe_ingredients ri
    JOIN public.ingredients i ON i.id = ri.ingredient_id
    WHERE coalesce(ri.is_optional, false) = false
  ),
  matches AS (
    SELECT r.recipe_id, r.ingredient_id
    FROM required r
    JOIN public.pantry_items p
      ON p.ingredient_id = r.ingredient_id
     AND p.user_id = auth.uid()
  )
  SELECT
    r.recipe_id,
    count(m.ingredient_id) AS have_count,
    count(r.ingredient_id) AS need_count,
    count(r.ingredient_id) - count(m.ingredient_id) AS missing_count,
    (count(r.ingredient_id) = count(m.ingredient_id)) AS can_make,
    array_agg(r.name) FILTER (WHERE m.ingredient_id IS NULL) AS missing_ingredients,
    array_agg(r.name) FILTER (WHERE m.ingredient_id IS NOT NULL) AS have_ingredients
  FROM required r
  LEFT JOIN matches m
    ON m.recipe_id = r.recipe_id
   AND m.ingredient_id = r.ingredient_id
  GROUP BY r.recipe_id
$$;

-- 8) Convenience view joining recipes with match status
CREATE OR REPLACE VIEW public.recipe_suggestions AS
SELECT
  rs.recipe_id,
  rec.title,
  rec.image_url,
  rec.source_url,
  rs.have_count,
  rs.need_count,
  rs.missing_count,
  rs.can_make,
  rs.missing_ingredients,
  rs.have_ingredients
FROM public.recipes rec
JOIN public.recipes_can_make() rs
  ON rs.recipe_id = rec.id
ORDER BY rs.can_make DESC, rs.missing_count ASC, rec.title;

-- 9) Helper to upsert pantry entries by ingredient name (case-insensitive)
CREATE OR REPLACE FUNCTION public.upsert_pantry_item(
  ingredient_name text,
  qty numeric DEFAULT NULL,
  unit text DEFAULT NULL,
  note text DEFAULT NULL
)
RETURNS public.pantry_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing_id uuid;
  v_row public.pantry_items;
BEGIN
  IF ingredient_name IS NULL OR btrim(ingredient_name) = '' THEN
    RAISE EXCEPTION 'ingredient_name is required';
  END IF;

  SELECT id INTO v_ing_id
  FROM public.ingredients
  WHERE name = ingredient_name::citext;

  IF v_ing_id IS NULL THEN
    INSERT INTO public.ingredients(name) VALUES (ingredient_name)
    RETURNING id INTO v_ing_id;
  END IF;

  INSERT INTO public.pantry_items(user_id, ingredient_id, quantity, unit, note)
  VALUES (auth.uid(), v_ing_id, qty, unit, note)
  ON CONFLICT (user_id, ingredient_id) DO UPDATE
     SET quantity = excluded.quantity,
         unit = excluded.unit,
         note = excluded.note,
         updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- How to use (examples):
-- SELECT upsert_pantry_item('Onion', 2, 'pc');
-- SELECT * FROM recipe_suggestions; -- suggestions for current user
-- SELECT * FROM recipes_can_make();  -- raw match status per recipe
