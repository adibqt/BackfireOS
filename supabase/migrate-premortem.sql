-- Backfire OS — Pre-Mortem Generator
-- Persists the generated forward-dated post-mortem per simulation run. Every
-- generation is stored as a NEW row (one row per iteration) so a team can browse
-- the obituaries and compare how they change across re-runs.
-- Run in the Supabase SQL Editor.

create table if not exists premortem_reports (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references simulation_runs(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  -- 1-based sequence within a run, in save order.
  iteration int not null default 1,
  -- The slogan the report was written against.
  slogan text,
  -- Classified failure class (regulatory | cultural | reputational | competitive | brand).
  failure_type text,
  -- Full PreMortemReport (headline + dek + apology + sections + meta) as JSON.
  report jsonb not null,
  -- Provenance: 'ai' (live model) or 'mock' (scripted fallback).
  source text not null default 'ai' check (source in ('ai', 'mock')),
  created_at timestamptz default now()
);

-- Iterations are read newest-first per run.
create index if not exists premortem_reports_run_idx
  on premortem_reports (run_id, created_at desc);

-- PostgREST roles need explicit grants (tables created via the SQL editor do
-- not inherit them automatically).
grant all on table public.premortem_reports to anon, authenticated, service_role;
