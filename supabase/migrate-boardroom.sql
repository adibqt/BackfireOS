-- Backfire OS — Boardroom Mode
-- Persists the multi-agent debate transcript per simulation run. Every time the
-- room is convened a NEW row is stored (one row per iteration) so a
-- decision-maker can browse the full debate history — including debates run
-- against different Counterfactual Branching slogan variants.
-- Run in the Supabase SQL Editor.

create table if not exists boardroom_debates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references simulation_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  -- 1-based sequence within a run, in save order.
  iteration int not null default 1,
  -- The slogan actually debated (a variant, when one was chosen).
  slogan text,
  -- Provenance when the debated slogan came from a counterfactual branch.
  branch_id text,
  branch_label text,
  -- Full BoardroomTranscript (messages + synthesis + meta) as JSON.
  transcript jsonb not null,
  decision text not null check (decision in ('greenlight', 'revise', 'kill')),
  converged boolean not null default false,
  degraded boolean not null default false,
  created_at timestamptz default now()
);

-- Migrate a pre-existing table created by an earlier version of this file:
-- it had a unique(run_id) constraint (one debate per run) and no iteration /
-- slogan / branch columns. These statements are idempotent.
alter table boardroom_debates add column if not exists iteration int not null default 1;
alter table boardroom_debates add column if not exists slogan text;
alter table boardroom_debates add column if not exists branch_id text;
alter table boardroom_debates add column if not exists branch_label text;

-- Drop the old "one debate per run" uniqueness so iterations can accumulate.
-- The constraint name is the Postgres default for `unique (run_id)`.
alter table boardroom_debates drop constraint if exists boardroom_debates_run_id_key;

-- Iterations are read newest-first per run.
create index if not exists boardroom_debates_run_idx
  on boardroom_debates (run_id, created_at desc);

-- PostgREST roles need explicit grants (tables created via the SQL editor do
-- not inherit them automatically).
grant all on table public.boardroom_debates to anon, authenticated, service_role;
