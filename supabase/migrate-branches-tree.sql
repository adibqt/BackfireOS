-- Backfire OS — Counterfactual Branching ("Git for campaigns")
-- Run in Supabase SQL Editor after migrate-auth.sql.
--
-- Stores the campaign variant tree as an adjacency list: every fork is a row
-- whose parent_id points at the version it was branched from. The self-
-- referential FK with ON DELETE CASCADE prunes an entire subtree in one delete,
-- which is exactly the "prune branch" gesture in the UI.
--
-- The authoritative AI red-team verdict (from /api/branch-score) is denormalised
-- onto the row as jsonb so a saved tree rehydrates with its scores without
-- replaying the panel.

create table if not exists campaign_branches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Adjacency list. NULL parent = root commit. Cascade deletes descendants.
  parent_id uuid references campaign_branches(id) on delete cascade,

  -- Creative content (the levers a designer can pull).
  label text not null,
  author text not null default 'You',
  slogan text not null default '',
  cast_direction text not null default '',   -- "cast" is reserved in SQL
  tagline text not null default '',
  cta text not null default '',
  risky_line text not null default '',
  tone text not null default 'playful'
    check (tone in ('playful', 'formal', 'aggressive', 'warm')),
  language text not null default 'mixed'
    check (language in ('en', 'bn', 'mixed')),

  -- Denormalised AI verdict (null until the war room has scored this content).
  ai_source text check (ai_source in ('ai', 'mock', 'heuristic')),
  ai_scores jsonb,           -- BranchScores
  ai_top_critic jsonb,       -- TopCritic | null
  -- Plaintext content key the verdict belongs to; lets the client detect that
  -- the branch was edited after scoring (stale verdict) without re-hashing.
  ai_content_key text,
  ai_scored_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaign_branches_user_id_idx
  on campaign_branches(user_id);
create index if not exists campaign_branches_parent_id_idx
  on campaign_branches(parent_id);

-- Keep updated_at honest on every mutation.
create or replace function touch_campaign_branches_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists campaign_branches_set_updated_at on campaign_branches;
create trigger campaign_branches_set_updated_at
  before update on campaign_branches
  for each row execute function touch_campaign_branches_updated_at();

-- Row Level Security
alter table campaign_branches enable row level security;

drop policy if exists "Users view own branches" on campaign_branches;
drop policy if exists "Users insert own branches" on campaign_branches;
drop policy if exists "Users update own branches" on campaign_branches;
drop policy if exists "Users delete own branches" on campaign_branches;

create policy "Users view own branches"
  on campaign_branches for select
  using (auth.uid() = user_id);

create policy "Users insert own branches"
  on campaign_branches for insert
  with check (auth.uid() = user_id);

create policy "Users update own branches"
  on campaign_branches for update
  using (auth.uid() = user_id);

create policy "Users delete own branches"
  on campaign_branches for delete
  using (auth.uid() = user_id);

-- PostgREST role grants (tables created via SQL editor do not get them automatically)
grant select, insert, update, delete on table public.campaign_branches
  to anon, authenticated, service_role;
