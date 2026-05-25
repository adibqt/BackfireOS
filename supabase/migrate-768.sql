-- Fix: Gemini gemini-embedding-001 uses 768 dimensions, not 1536.
-- Run this in Supabase SQL Editor if seed fails with:
--   "expected 1536 dimensions, not 768"

drop index if exists bnsentmix_samples_embedding_idx;

truncate table bnsentmix_samples;

alter table bnsentmix_samples
  alter column embedding type vector(768);

create index bnsentmix_samples_embedding_idx
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

grant execute on function public.match_bnsentmix(vector, int) to anon, authenticated, service_role;
