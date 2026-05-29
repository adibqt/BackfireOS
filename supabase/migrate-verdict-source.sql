-- Backfire OS — Verdict provenance migration
-- Run in Supabase SQL Editor after schema.sql / migrate-auth.sql
--
-- Adds a `source` column so degraded runs (where an agent fell back to the
-- demo/heuristic verdict because the model was unavailable or returned an
-- unusable response) can be distinguished from genuine model output.
-- Existing rows default to 'ai' to preserve prior behavior.

alter table agent_verdicts
  add column if not exists source text not null default 'ai'
  check (source in ('ai', 'mock'));
