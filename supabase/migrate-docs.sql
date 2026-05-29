-- Backfire OS — /docs module: access control, scheduling & team showcase
-- Run in Supabase SQL Editor after schema.sql + migrate-auth.sql

-- Singleton config row that powers the public /docs visibility + schedule window.
-- We keep a single row (id = 'singleton') so the admin panel reads/writes one record.
create table if not exists docs_config (
  id text primary key default 'singleton',
  -- 'on' = always public, 'off' = never public, 'scheduled' = public only inside [starts_at, ends_at]
  visibility text not null default 'scheduled' check (visibility in ('on', 'off', 'scheduled')),
  starts_at timestamptz,
  ends_at timestamptz,
  -- optional opaque token: /docs?token=<preview_token> bypasses the schedule for investor previews
  preview_token text,
  team_name text,
  -- editable team roster rendered in the YC "Team" slide. [{ id, name, role, email, avatarUrl }]
  team jsonb not null default '[]'::jsonb,
  -- free-form section content overrides keyed by section id (optional admin edits)
  content_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint docs_config_singleton check (id = 'singleton')
);

-- Seed the default judging window: June 10 (00:00) → June 14 (23:59) Asia/Dhaka (+06:00), 2026.
insert into docs_config (id, visibility, starts_at, ends_at)
values (
  'singleton',
  'scheduled',
  '2026-06-10T00:00:00+06:00',
  '2026-06-14T23:59:59+06:00'
)
on conflict (id) do nothing;

-- RLS: anyone may READ the config (the public /docs page needs it to resolve visibility),
-- but only the service role (used by the admin-gated API route) may WRITE it.
alter table docs_config enable row level security;

drop policy if exists "Anyone can read docs config" on docs_config;
create policy "Anyone can read docs config"
  on docs_config for select
  using (true);

-- No insert/update/delete policy for anon/authenticated → writes only via service_role,
-- which bypasses RLS. The API route enforces admin authorization before writing.

-- PostgREST grants (SQL Editor tables do not get these automatically)
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.docs_config to anon, authenticated, service_role;
grant insert, update, delete on table public.docs_config to service_role;
