-- Ingredients Catalog + Autocomplete + Import staging (idempotent)
-- Run in Supabase SQL editor. Safe to re-run.

-- 0) Extensions (install in public schema on Supabase)
create extension if not exists "citext" with schema public;
create extension if not exists "unaccent" with schema public;
create extension if not exists "pg_trgm" with schema public;

-- 1) Canonical tables (aligns with existing schema if present)
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name citext not null,
  parent_name text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_ingredients_name unique (name)
);

-- Add missing columns if this table already existed
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredients' and column_name='parent_name') then
    alter table public.ingredients add column parent_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ingredients' and column_name='updated_at') then
    alter table public.ingredients add column updated_at timestamptz not null default now();
  end if;
end $$;

create table if not exists public.ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  alias citext not null,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_alias unique(alias),
  constraint uq_ingredient_alias unique(ingredient_id, alias)
);

-- 2) Updated-at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ingredients_updated on public.ingredients;
create trigger trg_ingredients_updated
before update on public.ingredients
for each row execute function public.set_updated_at();

drop trigger if exists trg_aliases_updated on public.ingredient_aliases;
create trigger trg_aliases_updated
before update on public.ingredient_aliases
for each row execute function public.set_updated_at();

-- 3) Search indexes
-- Immutable wrapper for unaccent() so it can be used in index expressions
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
as $$
  -- Call the 2-arg variant explicitly using the dictionary from the extensions schema
  select unaccent($1::text);
$$;

-- Recreate trigram indexes using the immutable wrapper
drop index if exists idx_ingredients_name_trgm;
create index idx_ingredients_name_trgm
  on public.ingredients using gin (public.immutable_unaccent(name::text) gin_trgm_ops);

drop index if exists idx_aliases_alias_trgm;
create index idx_aliases_alias_trgm
  on public.ingredient_aliases using gin (public.immutable_unaccent(alias::text) gin_trgm_ops);

-- 4) RLS (optional, read for all)
alter table public.ingredients enable row level security;
drop policy if exists "ingredients read" on public.ingredients;
create policy "ingredients read" on public.ingredients for select using (true);

alter table public.ingredient_aliases enable row level security;
drop policy if exists "ingredient_aliases read" on public.ingredient_aliases;
create policy "ingredient_aliases read" on public.ingredient_aliases for select using (true);

-- 5) Staging tables for CSV import (from OFF converter)
create table if not exists public.stg_offx_ingredients (
  canonical_name text,
  parent_en text
);
create table if not exists public.stg_offx_aliases (
  canonical_name text,
  alias text
);

-- 6) Load data from staging (run after you import CSVs via Table Editor)
-- Deduplicate by canonical_name and pick a single parent (prefer non-null)
insert into public.ingredients(name, parent_name)
select name, parent_name
from (
  select distinct on (canonical_name)
         trim(canonical_name)::citext as name,
         nullif(trim(parent_en),'') as parent_name
  from public.stg_offx_ingredients
  where canonical_name is not null and btrim(canonical_name) <> ''
  order by canonical_name,
           case when nullif(trim(parent_en),'') is not null then 0 else 1 end
) s
on conflict (name) do update
  set parent_name = coalesce(excluded.parent_name, public.ingredients.parent_name);

-- Deduplicate aliases for the same canonical to avoid processing repeated rows
insert into public.ingredient_aliases(ingredient_id, alias)
select i.id, a.alias
from (
  select distinct on (canonical_name, alias)
         trim(canonical_name) as canonical_name,
         trim(alias) as alias
  from public.stg_offx_aliases
  where alias is not null and btrim(alias) <> ''
) a
join public.ingredients i on i.name = a.canonical_name
on conflict (alias) do nothing;

-- 7) Autocomplete RPC (name + aliases, ranked)
create or replace function public.ingredient_autocomplete(q text, max_results int default 8)
returns table(
  ingredient_id uuid,
  name text,
  matched text,
  source text,
  score real
)
language sql
stable
as $$
  with p as (
    select lower(public.immutable_unaccent(coalesce(q,''))) q, coalesce(max_results,8) lim
  ),
  nm as (
    select i.id, i.name::text name, null::text matched, 'name' source,
           (case when i.name ilike p.q||'%' then 0.7 else 0 end
            + greatest(similarity(i.name::text,p.q), word_similarity(i.name::text,p.q)))::real score
    from public.ingredients i, p
    where p.q<>'' and (i.name ilike '%'||p.q||'%' or similarity(i.name::text,p.q) > 0.2)
  ),
  al as (
    select a.ingredient_id id, i.name::text name, a.alias::text matched, 'alias' source,
           (case when a.alias ilike p.q||'%' then 0.7 else 0 end
            + greatest(similarity(a.alias::text,p.q), word_similarity(a.alias::text,p.q)))::real score
    from public.ingredient_aliases a
    join public.ingredients i on i.id = a.ingredient_id, p
    where p.q<>'' and (a.alias ilike '%'||p.q||'%' or similarity(a.alias::text,p.q) > 0.2)
  )
  select id as ingredient_id, name, matched, source, score
  from (select * from nm union all select * from al) u
  order by score desc, length(name), name
  limit (select lim from p)
$$;

-- 8) Save-by-id helper (RPC used by the app)
create or replace function public.upsert_pantry_item_by_id(
  p_ingredient_id uuid,
  qty text default null,
  unit text default null,
  notes text default null
)
returns public.pantry_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.pantry_items;
begin
  if p_ingredient_id is null then
    raise exception 'ingredient_id is required';
  end if;

  insert into public.pantry_items(user_id, ingredient_id, quantity, unit, notes)
  values (auth.uid(), p_ingredient_id, qty, unit, notes)
  on conflict (user_id, ingredient_id) do update
    set quantity = excluded.quantity,
        unit = excluded.unit,
        notes = excluded.notes,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- NOTES
-- 1) Import flow
--    - Run this file once to create tables and staging.
--    - Upload CSVs generated by tools/offx_to_csv.mjs into stg_offx_ingredients and stg_offx_aliases.
--    - Re-run section 6 (or the whole file) to load into the live tables.
-- 2) Autocomplete RPC: call ingredient_autocomplete(q => 'tom', max_results => 8)
-- 3) Save-by-id: call upsert_pantry_item_by_id(p_ingredient_id => '...', qty => '2', notes => '...')
