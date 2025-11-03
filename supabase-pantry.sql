-- Pantry + normalized ingredients + suggestions
-- Run this in the SQL editor for your Supabase project

-- 1) Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

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
  -- compatibility columns used by the RN app
  position integer,
  ingredient_text text,
  cleaned_ingredient text,
  group_label text,
  quantity numeric,
  unit text,
  note text,
  is_optional boolean NOT NULL DEFAULT false,
  raw_text text, -- original line
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON public.recipe_ingredients(ingredient_id);
-- Allow multiple canonical ingredients for the same raw line (e.g., "salt and pepper")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='uq_recipe_ingredients_recipe_raw'
  ) THEN
    DROP INDEX public.uq_recipe_ingredients_recipe_raw;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_recipe_ingredients_recipe_raw_ing
  ON public.recipe_ingredients(recipe_id, raw_text, ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_cleaned
  ON public.recipe_ingredients(cleaned_ingredient);

-- Ensure compatibility columns exist for RN app
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recipe_ingredients' AND column_name='position'
  ) THEN
    ALTER TABLE public.recipe_ingredients ADD COLUMN position integer;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recipe_ingredients' AND column_name='ingredient_text'
  ) THEN
    ALTER TABLE public.recipe_ingredients ADD COLUMN ingredient_text text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recipe_ingredients' AND column_name='cleaned_ingredient'
  ) THEN
    ALTER TABLE public.recipe_ingredients ADD COLUMN cleaned_ingredient text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recipe_ingredients' AND column_name='group_label'
  ) THEN
    ALTER TABLE public.recipe_ingredients ADD COLUMN group_label text;
  END IF;
  -- allow raw_text to be nullable for RN inserts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recipe_ingredients' AND column_name='raw_text'
  ) THEN
    BEGIN
      ALTER TABLE public.recipe_ingredients ALTER COLUMN raw_text DROP NOT NULL;
    EXCEPTION WHEN others THEN
      -- ignore if already nullable or permissions limited
      NULL;
    END;
  END IF;
END $$;

-- User pantry (one row per user x ingredient)
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  ingredient_name text,
  cleaned_name citext, -- optional, lets clients upsert by name directly
  quantity text,
  unit text,
  notes text,
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

-- Auto-fill cleaned_ingredient/ingredient_text when missing
CREATE OR REPLACE FUNCTION public.recipe_ingredients_sync()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ingredient_text IS NULL AND NEW.raw_text IS NOT NULL THEN
    NEW.ingredient_text := NEW.raw_text;
  END IF;
  IF NEW.cleaned_ingredient IS NULL THEN
    NEW.cleaned_ingredient := public.canonicalize_ingredient_name(COALESCE(NEW.ingredient_text, NEW.raw_text));
  END IF;
  IF NEW.ingredient_id IS NULL THEN
    NEW.ingredient_id := public.find_canonical_ingredient(COALESCE(NEW.ingredient_text, NEW.raw_text));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recipe_ingredients_sync ON public.recipe_ingredients;
CREATE TRIGGER trg_recipe_ingredients_sync
BEFORE INSERT OR UPDATE ON public.recipe_ingredients
FOR EACH ROW EXECUTE FUNCTION public.recipe_ingredients_sync();

-- Auto-sync recipe_ingredients from recipes.ingredients JSON on insert/update
CREATE OR REPLACE FUNCTION public.sync_recipe_ingredients_from_recipes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_array boolean;
BEGIN
  -- Only act when ingredients is present and is a JSON array
  IF NEW.ingredients IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT (jsonb_typeof(NEW.ingredients::jsonb) = 'array') INTO v_is_array;
  IF NOT v_is_array THEN
    RETURN NEW;
  END IF;

  -- Rebuild mapping for this recipe
  DELETE FROM public.recipe_ingredients WHERE recipe_id = NEW.id;

  -- Unnest ingredients and compute group labels from section headers (lines ending with ':')
  WITH items AS (
    SELECT e.val AS raw, e.ord AS ord
    FROM jsonb_array_elements_text(NEW.ingredients::jsonb) WITH ORDINALITY AS e(val, ord)
  ), marked AS (
    SELECT ord,
           raw,
           (raw ~* ':[\t ]*$') AS is_header,
           regexp_replace(raw, ':[\t ]*$', '', 'i') AS header_label
    FROM items
  ), grp AS (
    SELECT ord,
           raw,
           is_header,
           header_label,
           SUM(CASE WHEN is_header THEN 1 ELSE 0 END) OVER (ORDER BY ord ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS grp
    FROM marked
  ), headers AS (
    SELECT grp, header_label FROM grp WHERE is_header
  ), mapped AS (
    SELECT g.ord,
           g.raw,
           g.is_header,
           h.header_label AS group_label
    FROM grp g
    LEFT JOIN headers h ON h.grp = g.grp
  )
  INSERT INTO public.recipe_ingredients (recipe_id, raw_text, ingredient_text, cleaned_ingredient, position, group_label)
  SELECT NEW.id,
         m.raw AS raw_text,
         m.raw AS ingredient_text,
         public.canonicalize_ingredient_name(m.raw) AS cleaned_ingredient,
         m.ord - 1 AS position,
         NULLIF(btrim(m.group_label), '') AS group_label
  FROM mapped m
  WHERE coalesce(trim(m.raw), '') <> ''
    AND m.is_header = false -- skip section headers themselves
  ON CONFLICT (recipe_id, raw_text, ingredient_id) DO NOTHING;

  -- Add an explicit pepper row for 'salt and pepper' compound lines if pepper not already present
  INSERT INTO public.recipe_ingredients (recipe_id, raw_text, ingredient_text, cleaned_ingredient)
  SELECT NEW.id, t.raw_text, 'pepper', 'pepper'
  FROM (
    SELECT DISTINCT e2.val AS raw_text
    FROM jsonb_array_elements_text(NEW.ingredients::jsonb) AS e2(val)
    WHERE e2.val ILIKE '%salt%' AND e2.val ILIKE '%pepper%'
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recipe_ingredients ri
    WHERE ri.recipe_id = NEW.id AND ri.raw_text = t.raw_text AND ri.cleaned_ingredient = 'pepper'
  )
  ON CONFLICT (recipe_id, raw_text, ingredient_id) DO NOTHING;

  -- Add explicit oregano row for 'thyme and oregano' compound lines if missing
  INSERT INTO public.recipe_ingredients (recipe_id, raw_text, ingredient_text, cleaned_ingredient)
  SELECT NEW.id, t.raw_text, 'oregano', 'oregano'
  FROM (
    SELECT DISTINCT e3.val AS raw_text
    FROM jsonb_array_elements_text(NEW.ingredients::jsonb) AS e3(val)
    WHERE e3.val ILIKE '%thyme%' AND e3.val ILIKE '%oregano%'
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.recipe_ingredients ri
    WHERE ri.recipe_id = NEW.id AND ri.raw_text = t.raw_text AND ri.cleaned_ingredient = 'oregano'
  )
  ON CONFLICT (recipe_id, raw_text, ingredient_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recipes_sync_ingredients ON public.recipes;
CREATE TRIGGER trg_recipes_sync_ingredients
AFTER INSERT OR UPDATE OF ingredients ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.sync_recipe_ingredients_from_recipes();

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
  -- canonicalize cleaned_name
  IF NEW.cleaned_name IS NULL AND NEW.ingredient_name IS NOT NULL THEN
    NEW.cleaned_name := public.canonicalize_ingredient_name(NEW.ingredient_name)::citext;
  ELSIF NEW.cleaned_name IS NOT NULL THEN
    NEW.cleaned_name := public.canonicalize_ingredient_name(NEW.cleaned_name)::citext;
  END IF;

  -- link to canonical ingredient if possible
  IF NEW.ingredient_id IS NULL THEN
    NEW.ingredient_id := public.find_canonical_ingredient(COALESCE(NEW.ingredient_name, NEW.cleaned_name::text));
  END IF;

  -- if still null, create a canonical ingredient so pantry joins work
  IF NEW.ingredient_id IS NULL AND coalesce(NEW.cleaned_name::text,'') <> '' THEN
    INSERT INTO public.ingredients(name) VALUES (NEW.cleaned_name) RETURNING id INTO NEW.ingredient_id;
  END IF;

  -- backfill readable ingredient_name from canonical
  IF NEW.ingredient_name IS NULL AND NEW.ingredient_id IS NOT NULL THEN
    SELECT name::text INTO NEW.ingredient_name FROM public.ingredients WHERE id = NEW.ingredient_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pantry_sync ON public.pantry_items;
CREATE TRIGGER trg_pantry_sync
BEFORE INSERT OR UPDATE ON public.pantry_items
FOR EACH ROW EXECUTE FUNCTION public.pantry_items_sync();

-- 3a) Canonical alias table for ingredient normalization
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  alias citext NOT NULL,
  priority int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_alias UNIQUE(alias),
  CONSTRAINT uq_ingredient_alias UNIQUE(ingredient_id, alias)
);
CREATE INDEX IF NOT EXISTS idx_alias_alias ON public.ingredient_aliases(alias);

DROP TRIGGER IF EXISTS trg_aliases_updated ON public.ingredient_aliases;
CREATE TRIGGER trg_aliases_updated
BEFORE UPDATE ON public.ingredient_aliases
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3b) Backfill/compat: ensure pantry_items has expected columns/types used by RN app
DO $$ BEGIN
  -- ingredient_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_items' AND column_name='ingredient_name'
  ) THEN
    ALTER TABLE public.pantry_items ADD COLUMN ingredient_name text;
  END IF;

  -- notes column: rename note->notes or add if missing
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_items' AND column_name='note'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_items' AND column_name='notes'
  ) THEN
    ALTER TABLE public.pantry_items RENAME COLUMN note TO notes;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_items' AND column_name='notes'
  ) THEN
    ALTER TABLE public.pantry_items ADD COLUMN notes text;
  END IF;

  -- quantity should be text for compatibility
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='pantry_items' AND column_name='quantity' AND data_type <> 'text'
  ) THEN
    ALTER TABLE public.pantry_items ALTER COLUMN quantity TYPE text USING quantity::text;
  END IF;
END $$;

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

-- 5a) Canonicalization helpers (aliases + fuzzy)
CREATE OR REPLACE FUNCTION public.normalize_ingredient_text(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(
           regexp_replace(
             regexp_replace(
               regexp_replace(unaccent(lower(coalesce(raw,''))), '\\([^)]*\\)', '', 'g'),
               '\\[[^\\]]*\\]', '', 'g'
             ),
             '[-,/:.;]+', ' ', 'g'
           )
         );
$$;

CREATE OR REPLACE FUNCTION public.base_ingredient_phrase(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH s AS (
    SELECT public.normalize_ingredient_text(raw) AS t
  ), a AS (
    SELECT regexp_replace(
             t,
             '^\\s*(?:~?[\\dx¼½¾⅓⅔⅛⅜⅝⅞/., ]+)?\\s*(?:x\\s*)?'
             || '(?:tsp|tbsp|teaspoons?|tablespoons?|cup|cups|g|kg|mg|l|ml|cl|dl|oz|ounce|ounces|lb|lbs|pound|pounds|pinch|clove|cloves|can|cans|packet|packets|stick|sticks|slice|slices|bunch|bunches|sprig|sprigs|cm|mm|inch|inches)\\.?\\s*',
             '', 'i'
           ) AS t
    FROM s
  ), b AS (
    SELECT regexp_replace(
             t,
             '\\b(all[- ]?purpose|plain|self[- ]?raising|extra|extra[- ]?virgin|fresh|ground|dried|minced|chopped|diced|sliced|grated|shredded|peeled|seeded|crushed|ripe|large|small|boneless|skinless|to taste|plus more|divided|cold|warm|hot)\\b',
             '', 'gi'
           ) AS t
    FROM a
  ), c AS (
    SELECT btrim(regexp_replace(t, '\\s{2,}', ' ', 'g')) AS t FROM b
  )
  SELECT t FROM c;
$$;

CREATE OR REPLACE FUNCTION public.canonicalize_ingredient_name(raw text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  WITH p AS (
    SELECT public.base_ingredient_phrase(raw) AS t
  ), canon AS (
    SELECT CASE
      WHEN t ~ '\\bolive oil\\b' THEN 'olive oil'
      WHEN t ~ '\\bbaking powder\\b' THEN 'baking powder'
      WHEN t ~ '\\bbaking soda\\b' THEN 'baking soda'
      WHEN t ~ '\\b(cocoa|cacao) powder\\b' THEN 'cocoa powder'
      WHEN t ~ '\\b(all[\\s-]?purpose|plain).*\\bflour\\b' THEN 'flour'
      WHEN t ~ '\\bflour\\b' THEN 'flour'
      WHEN t ~ '\\bmilk\\b' THEN 'milk'
      WHEN t ~ '\\bwater\\b' THEN 'water'
      WHEN t ~ '\\b(beef\\s+)?dripping\\b' THEN 'beef dripping'
      WHEN t ~ '\\bwhite\\s+pepper\\b' THEN 'pepper'
      WHEN t ~ '\\beggs?\\b' THEN 'eggs'
      WHEN t ~ '\\b(beef\\s+)?mince\\b|\\b(minced|ground)\\s+beef\\b' THEN 'beef mince'
      WHEN t ~ '\\b(crushed|canned|tinned).*tomato' THEN 'canned tomatoes'
      WHEN t ~ '\\btomato\\s+paste\\b|\\btomato\\s+pur(é|e)e?\\b' THEN 'tomato paste'
      WHEN t ~ '\\b(red\\s+)?wine\\b' THEN 'red wine'
      WHEN t ~ '\\b(beef\\s+)?(bouillon|stock)\\s+cubes?\\b' THEN 'beef stock cube'
      WHEN t ~ '\\b(chicken\\s+)?(bouillon|stock)\\s+cubes?\\b' THEN 'chicken stock cube'
      WHEN t ~ '\\bbay\\s+(leaf|leaves)\\b' THEN 'bay leaves'
      WHEN t ~ '\\bthyme\\b' THEN 'thyme'
      WHEN t ~ '\\boregano\\b' THEN 'oregano'
      WHEN t ~ '\\bcelery\\b' THEN 'celery'
      WHEN t ~ '\\bcarrots?\\b' THEN 'carrot'
      WHEN t ~ '\\bonions?\\b' THEN 'onion'
      WHEN t ~ '\\bgarlic\\b' THEN 'garlic'
      WHEN t ~ '\\bgruy(è|e)re\\b' THEN 'gruyere'
      WHEN t ~ '\\bcolby\\b' THEN 'colby'
      WHEN t ~ '\\bmonterey\\s+jack\\b' THEN 'monterey jack'
      WHEN t ~ '\\bparmesan\\b' THEN 'parmesan'
      WHEN t ~ '\\bmozzarella\\b' THEN 'mozzarella'
      WHEN t ~ '\\blasagn(a|e)\\s+sheets?\\b' THEN 'lasagna sheets'
      WHEN t ~ '\\bnutmeg\\b' THEN 'nutmeg'
      WHEN t ~ '\\bworcestershire\\b' THEN 'worcestershire sauce'
      WHEN t ~ '\\bcheese\\b' THEN 'cheese'
      ELSE t
    END AS t
    FROM p
  )
  SELECT btrim(regexp_replace(t, '\\s{2,}', ' ', 'g')) FROM canon;
$$;

CREATE OR REPLACE FUNCTION public.find_canonical_ingredient(raw text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_norm text;
  v_id uuid;
  v_best uuid;
  v_best_sim float;
BEGIN
  v_norm := public.canonicalize_ingredient_name(raw);

  -- alias exact
  SELECT ingredient_id INTO v_id
    FROM public.ingredient_aliases
   WHERE alias = v_norm
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- ingredient exact
  SELECT id INTO v_id
    FROM public.ingredients
   WHERE name = v_norm
   LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- fuzzy via aliases
  SELECT ia.ingredient_id, similarity(ia.alias::text, v_norm) AS sim
    INTO v_best, v_best_sim
  FROM public.ingredient_aliases ia
  ORDER BY similarity(ia.alias::text, v_norm) DESC
  LIMIT 1;

  IF v_best IS NOT NULL AND v_best_sim >= 0.55 THEN
    RETURN v_best;
  END IF;

  -- fuzzy via ingredient names
  SELECT i.id, similarity(i.name::text, v_norm) AS sim
    INTO v_best, v_best_sim
  FROM public.ingredients i
  ORDER BY similarity(i.name::text, v_norm) DESC
  LIMIT 1;

  IF v_best IS NOT NULL AND v_best_sim >= 0.6 THEN
    RETURN v_best;
  END IF;

  RETURN NULL;
END;
$$;

-- 6) One-shot migration of existing recipe ingredients (from recipes.ingredients JSON array)
WITH src AS (
  SELECT r.id AS recipe_id,
         e.raw_line AS raw_line,
         e.ord - 1 AS pos
  FROM public.recipes r
  CROSS JOIN LATERAL jsonb_array_elements_text(r.ingredients::jsonb) WITH ORDINALITY AS e(raw_line, ord)
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
         e.raw_line AS raw_line,
         e.ord - 1 AS pos
  FROM public.recipes r
  CROSS JOIN LATERAL jsonb_array_elements_text(r.ingredients::jsonb) WITH ORDINALITY AS e(raw_line, ord)
  WHERE r.ingredients IS NOT NULL
    AND jsonb_typeof(r.ingredients::jsonb) = 'array'
    AND jsonb_array_length(r.ingredients::jsonb) > 0
)
INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, raw_text, ingredient_text, cleaned_ingredient, position)
SELECT s.recipe_id, i.id, s.raw_line, s.raw_line, public.guess_ingredient_name(s.raw_line)::text, s.pos
FROM src s
JOIN public.ingredients i
  ON i.name = public.guess_ingredient_name(s.raw_line)
ON CONFLICT (recipe_id, raw_text, ingredient_id) DO NOTHING;

-- Expand common compound lines like "salt and pepper" into separate ingredients
WITH comp AS (
  SELECT ri.recipe_id, ri.raw_text
  FROM public.recipe_ingredients ri
  WHERE ri.raw_text ILIKE '%salt%' AND ri.raw_text ILIKE '%pepper%'
  GROUP BY ri.recipe_id, ri.raw_text
)
INSERT INTO public.recipe_ingredients (recipe_id, ingredient_id, raw_text, ingredient_text, cleaned_ingredient, position)
SELECT c.recipe_id,
       (SELECT id FROM public.ingredients WHERE name = 'pepper') AS ingredient_id,
       c.raw_text,
       'pepper' AS ingredient_text,
       'pepper' AS cleaned_ingredient,
       NULL AS position
FROM comp c
LEFT JOIN public.recipe_ingredients ri
  ON ri.recipe_id = c.recipe_id
 AND ri.raw_text = c.raw_text
 AND ri.cleaned_ingredient = 'pepper'
WHERE ri.id IS NULL;

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

DROP VIEW IF EXISTS public.recipe_suggestions;
-- 8) Convenience view joining recipes with match status
CREATE VIEW public.recipe_suggestions AS
WITH tot AS (
  SELECT ri.recipe_id, COUNT(*)::int AS total_ingredients
  FROM public.recipe_ingredients ri
  GROUP BY ri.recipe_id
),
matches AS (
  -- prefer matching by canonical ingredient_id; fallback to cleaned names where id is null
  SELECT user_id, recipe_id, SUM(pantry_matches)::int AS pantry_matches
  FROM (
    SELECT r.user_id, ri.recipe_id, COUNT(*)::int AS pantry_matches
    FROM public.recipe_ingredients ri
    JOIN public.recipes r ON r.id = ri.recipe_id
    JOIN public.pantry_items p ON p.user_id = r.user_id AND ri.ingredient_id IS NOT NULL AND p.ingredient_id = ri.ingredient_id
    GROUP BY r.user_id, ri.recipe_id
    UNION ALL
    SELECT r.user_id, ri.recipe_id, COUNT(*)::int AS pantry_matches
    FROM public.recipe_ingredients ri
    JOIN public.recipes r ON r.id = ri.recipe_id
    JOIN public.pantry_items p ON p.user_id = r.user_id AND ri.ingredient_id IS NULL AND p.cleaned_name IS NOT NULL AND lower(p.cleaned_name::text) = lower(ri.cleaned_ingredient)
    GROUP BY r.user_id, ri.recipe_id
  ) u
  GROUP BY user_id, recipe_id
)
SELECT
  r.user_id,
  r.id AS id,
  r.title,
  r.image_url,
  r.servings,
  r.prep_time,
  r.cook_time,
  r.source_url,
  COALESCE(t.total_ingredients, 0) AS total_ingredients,
  COALESCE(m.pantry_matches, 0) AS pantry_matches,
  CASE WHEN COALESCE(t.total_ingredients,0) = 0 THEN 0
       ELSE ROUND((COALESCE(m.pantry_matches,0)::numeric / t.total_ingredients::numeric) * 100, 1)
  END AS match_percentage
FROM public.recipes r
LEFT JOIN tot t ON t.recipe_id = r.id
LEFT JOIN matches m ON m.recipe_id = r.id AND m.user_id = r.user_id
ORDER BY match_percentage DESC, total_ingredients ASC, r.title;

-- 9) Helper to upsert pantry entries by ingredient name (case-insensitive)
CREATE OR REPLACE FUNCTION public.upsert_pantry_item(
  ingredient_name text,
  qty text DEFAULT NULL,
  unit text DEFAULT NULL,
  notes text DEFAULT NULL
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

  -- find canonical first
  v_ing_id := public.find_canonical_ingredient(ingredient_name);

  IF v_ing_id IS NULL THEN
    INSERT INTO public.ingredients(name) VALUES (public.canonicalize_ingredient_name(ingredient_name))
    RETURNING id INTO v_ing_id;
  END IF;

  INSERT INTO public.pantry_items(user_id, ingredient_id, quantity, unit, notes, ingredient_name, cleaned_name)
  VALUES (auth.uid(), v_ing_id, qty, unit, notes, ingredient_name, public.canonicalize_ingredient_name(ingredient_name)::text)
  ON CONFLICT (user_id, ingredient_id) DO UPDATE
     SET quantity = excluded.quantity,
         unit = excluded.unit,
         notes = excluded.notes,
         ingredient_name = excluded.ingredient_name,
         cleaned_name = excluded.cleaned_name,
         updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

-- 10) Backfill data to canonical forms (safe to re-run)
-- Fill recipe_ingredients normalized fields and link canonical ingredient_id
WITH src AS (
  SELECT r.id AS recipe_id,
         e.val AS raw_line,
         e.ord - 1 AS pos
  FROM public.recipes r
  CROSS JOIN LATERAL jsonb_array_elements_text(r.ingredients::jsonb) WITH ORDINALITY AS e(val, ord)
  WHERE r.ingredients IS NOT NULL
    AND jsonb_typeof(r.ingredients::jsonb) = 'array'
    AND jsonb_array_length(r.ingredients::jsonb) > 0
)
UPDATE public.recipe_ingredients ri
SET
  ingredient_text = COALESCE(ri.ingredient_text, ri.raw_text),
  cleaned_ingredient = COALESCE(ri.cleaned_ingredient, public.canonicalize_ingredient_name(COALESCE(ri.ingredient_text, ri.raw_text))),
  position = COALESCE(ri.position, src.pos),
  ingredient_id = COALESCE(ri.ingredient_id, public.find_canonical_ingredient(COALESCE(ri.ingredient_text, ri.raw_text)))
FROM src
WHERE src.recipe_id = ri.recipe_id
  AND src.raw_line = ri.raw_text
  AND (
    ri.ingredient_text IS NULL OR ri.cleaned_ingredient IS NULL OR ri.position IS NULL OR ri.ingredient_id IS NULL
  );

-- Fallback fill if not matched by raw_text
UPDATE public.recipe_ingredients ri
SET
  ingredient_text = COALESCE(ri.ingredient_text, ri.raw_text),
  cleaned_ingredient = COALESCE(ri.cleaned_ingredient, public.canonicalize_ingredient_name(COALESCE(ri.ingredient_text, ri.raw_text))),
  ingredient_id = COALESCE(ri.ingredient_id, public.find_canonical_ingredient(COALESCE(ri.ingredient_text, ri.raw_text)))
WHERE ri.ingredient_text IS NULL OR ri.cleaned_ingredient IS NULL OR ri.ingredient_id IS NULL;

-- Backfill pantry_items to canonical cleaned_name + link ingredient_id
UPDATE public.pantry_items p
SET
  ingredient_name = COALESCE(p.ingredient_name, p.cleaned_name::text),
  cleaned_name = public.canonicalize_ingredient_name(COALESCE(p.ingredient_name, p.cleaned_name::text))::citext
WHERE p.ingredient_name IS NULL OR p.cleaned_name IS NULL;

UPDATE public.pantry_items p
SET ingredient_id = COALESCE(p.ingredient_id, public.find_canonical_ingredient(COALESCE(p.ingredient_name, p.cleaned_name::text)))
WHERE p.ingredient_id IS NULL;

-- 11) Seed a few common aliases (extend as needed)
INSERT INTO public.ingredients(name) VALUES ('flour') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='flour'), a.alias
FROM (VALUES ('all-purpose flour'), ('all purpose flour'), ('plain flour'), ('ap flour')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('olive oil') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='olive oil'), a.alias
FROM (VALUES ('extra virgin olive oil'), ('extra-virgin olive oil'), ('virgin olive oil')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('milk') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='milk'), a.alias
FROM (VALUES ('whole milk'), ('full fat milk'), ('semi skimmed milk'), ('semi-skimmed milk'), ('skimmed milk'), ('skim milk')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('water') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='water'), a.alias
FROM (VALUES ('cold water'), ('warm water'), ('hot water')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('pepper') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='pepper'), a.alias
FROM (VALUES ('white pepper'), ('black pepper'), ('ground pepper')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('eggs') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='eggs'), a.alias
FROM (VALUES ('egg'), ('large eggs'), ('free-range eggs'), ('free range eggs')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('beef dripping') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='beef dripping'), a.alias
FROM (VALUES ('dripping'), ('beef drippings')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('sugar') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='sugar'), a.alias
FROM (VALUES ('granulated sugar'), ('white sugar')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('brown sugar') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='brown sugar'), a.alias
FROM (VALUES ('light brown sugar'), ('dark brown sugar')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('butter') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='butter'), a.alias
FROM (VALUES ('unsalted butter'), ('salted butter')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

-- How to use (examples):
-- SELECT upsert_pantry_item('Onion', 2, 'pc');
-- SELECT * FROM recipe_suggestions; -- suggestions for current user
-- SELECT * FROM recipes_can_make();  -- raw match status per recipe
-- Ragu / Lasagna staples
INSERT INTO public.ingredients(name) VALUES ('beef mince') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='beef mince'), a.alias
FROM (VALUES ('minced beef'), ('ground beef')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('canned tomatoes') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='canned tomatoes'), a.alias
FROM (VALUES ('crushed tomatoes'), ('canned crushed tomato'), ('canned tomatoes'), ('tinned tomatoes'), ('passata'), ('tomato passata')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('tomato paste') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='tomato paste'), a.alias
FROM (VALUES ('tomato puree'), ('tomato purée'), ('tomato concentrate')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('red wine') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='red wine'), a.alias
FROM (VALUES ('pinot noir'), ('dry red wine')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('beef stock cube') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='beef stock cube'), a.alias
FROM (VALUES ('beef bouillon cube'), ('bouillon cubes'), ('stock cubes'), ('beef stock cubes')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('bay leaves') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='bay leaves'), a.alias
FROM (VALUES ('bay leaf')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('thyme') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('oregano') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('chicken stock cube') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='chicken stock cube'), a.alias
FROM (VALUES ('chicken bouillon cube'), ('chicken stock cubes'), ('chicken stock')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('worcestershire sauce') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('onion') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('carrot') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('celery') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('garlic') ON CONFLICT (name) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('butter') ON CONFLICT (name) DO NOTHING; -- already seeded above
INSERT INTO public.ingredients(name) VALUES ('cheese') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('gruyere') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='gruyere'), a.alias
FROM (VALUES ('gruyère')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('colby') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('cheddar') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('monterey jack') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('parmesan') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('mozzarella') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('lasagna sheets') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredient_aliases(ingredient_id, alias)
SELECT (SELECT id FROM public.ingredients WHERE name='lasagna sheets'), a.alias
FROM (VALUES ('lasagne sheets')) AS a(alias)
ON CONFLICT (alias) DO NOTHING;

INSERT INTO public.ingredients(name) VALUES ('parsley') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('basil') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.ingredients(name) VALUES ('nutmeg') ON CONFLICT (name) DO NOTHING;
