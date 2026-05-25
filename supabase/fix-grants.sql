-- Backfire OS — Fix missing table grants
-- Run this in Supabase SQL Editor if you see:
--   "permission denied for table simulation_runs"
--
-- Tables created via the SQL editor do not automatically inherit PostgREST
-- role grants. bnsentmix_samples may work while campaigns/runs/memes do not.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.campaigns to anon, authenticated, service_role;
grant select, insert, update, delete on table public.simulation_runs to anon, authenticated, service_role;
grant select, insert, update, delete on table public.agent_verdicts to anon, authenticated, service_role;
grant select, insert, update, delete on table public.memes to anon, authenticated, service_role;
grant select, insert, update, delete on table public.bnsentmix_samples to anon, authenticated, service_role;

grant execute on function public.match_bnsentmix(vector, int) to anon, authenticated, service_role;

-- Re-apply RLS policies (safe to re-run migrate-auth.sql after this if needed)
