-- Backfire OS — Brand entities
-- Run in Supabase SQL Editor after migrate-auth.sql.
-- Adds the `brands` table, links campaigns to brands, and scopes RLS to brand owners.

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  stated_values text,
  created_at timestamptz not null default now(),
  constraint brands_user_name_unique unique (user_id, name)
);

create index if not exists brands_user_id_idx on brands(user_id);

alter table campaigns
  add column if not exists brand_id uuid references brands(id) on delete set null;

create index if not exists campaigns_brand_id_idx on campaigns(brand_id);

-- Row Level Security
alter table brands enable row level security;

drop policy if exists "Users view own brands" on brands;
drop policy if exists "Users insert own brands" on brands;
drop policy if exists "Users update own brands" on brands;
drop policy if exists "Users delete own brands" on brands;

create policy "Users view own brands"
  on brands for select
  using (auth.uid() = user_id);

create policy "Users insert own brands"
  on brands for insert
  with check (auth.uid() = user_id);

create policy "Users update own brands"
  on brands for update
  using (auth.uid() = user_id);

create policy "Users delete own brands"
  on brands for delete
  using (auth.uid() = user_id);

-- PostgREST role grants
grant select, insert, update, delete on table public.brands to anon, authenticated, service_role;
