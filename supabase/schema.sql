-- Backfire OS — Supabase schema
-- Run in Supabase SQL Editor after enabling the vector extension

create extension if not exists vector;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  slogan text not null,
  brand_values text,
  brief text,
  image_url text,
  created_at timestamptz default now()
);

create table if not exists simulation_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references campaigns(id) on delete cascade,
  status text default 'pending',
  backfire_score numeric,
  resonance numeric,
  backfire_risk numeric,
  memeability numeric,
  brand_safety_drift numeric,
  polarization_coefficient numeric,
  created_at timestamptz default now()
);

create table if not exists agent_verdicts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references simulation_runs(id) on delete cascade,
  agent_id text not null,
  agent_name text not null,
  severity integer not null check (severity between 0 and 100),
  reasoning text not null,
  sample_attack text not null,
  citation_ids text[] default '{}',
  created_at timestamptz default now()
);

create table if not exists memes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references simulation_runs(id) on delete cascade,
  caption text not null,
  image_url text,
  memeability_score integer check (memeability_score between 0 and 100),
  created_at timestamptz default now()
);

create table if not exists bnsentmix_samples (
  id text primary key,
  text text not null,
  sentiment text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

create index if not exists bnsentmix_samples_embedding_idx
  on bnsentmix_samples using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function match_bnsentmix(
  query_embedding vector(768),
  match_count int default 5
)
returns table (id text, text text, sentiment text, similarity float)
language sql stable
as $$
  select id, text, sentiment, 1 - (embedding <=> query_embedding) as similarity
  from bnsentmix_samples
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- PostgREST roles need explicit grants (tables created via SQL editor do not get them automatically)
grant usage on schema public to anon, authenticated, service_role;

grant all on table public.campaigns to anon, authenticated, service_role;
grant all on table public.simulation_runs to anon, authenticated, service_role;
grant all on table public.agent_verdicts to anon, authenticated, service_role;
grant all on table public.memes to anon, authenticated, service_role;
grant all on table public.bnsentmix_samples to anon, authenticated, service_role;

grant execute on function public.match_bnsentmix(vector, int) to anon, authenticated, service_role;
