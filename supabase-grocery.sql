-- Grocery integration tables for Supabase
-- Run this in the SQL editor for your Supabase project

-- 1) Enum for UK stores (optional; change as needed)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'grocery_store') then
    create type public.grocery_store as enum ('tesco','sainsburys','asda');
  end if;
end $$;

-- 2) Table to remember a user's preferred product for a normalized ingredient per store
create table if not exists public.product_mappings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store public.grocery_store not null,
  normalized_name text not null,
  product_url text not null,
  product_label text,
  last_price numeric(10,2),
  currency text not null default 'GBP',
  last_checked timestamptz
);

-- Upsert key: one mapping per user/store/normalized ingredient
create unique index if not exists product_mappings_user_store_name_key
  on public.product_mappings(user_id, store, normalized_name);

-- 3) RLS: per-user access only
alter table public.product_mappings enable row level security;

-- Drop old policies (if any) so creation never fails on reruns
drop policy if exists "product_mappings_select_own" on public.product_mappings;
drop policy if exists "product_mappings_insert_own" on public.product_mappings;
drop policy if exists "product_mappings_update_own" on public.product_mappings;
drop policy if exists "product_mappings_delete_own" on public.product_mappings;

create policy "product_mappings_select_own"
  on public.product_mappings for select
  using (user_id = auth.uid());

create policy "product_mappings_insert_own"
  on public.product_mappings for insert
  with check (user_id = auth.uid());

create policy "product_mappings_update_own"
  on public.product_mappings for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "product_mappings_delete_own"
  on public.product_mappings for delete
  using (user_id = auth.uid());

-- 4) Updated_at trigger
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists product_mappings_set_updated_at on public.product_mappings;
create trigger product_mappings_set_updated_at
  before update on public.product_mappings
  for each row execute procedure public.set_updated_at();

-- Optional: helpful view for debugging
create or replace view public.product_mappings_debug as
  select id, user_id, store, normalized_name, product_label, product_url, last_price, currency, updated_at
  from public.product_mappings;
