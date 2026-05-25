-- Backfire OS — Allow users to delete their own simulations
-- Run in Supabase SQL Editor after migrate-auth.sql

drop policy if exists "Users delete own campaigns" on campaigns;
drop policy if exists "Users delete own runs" on simulation_runs;
drop policy if exists "Users delete own verdicts" on agent_verdicts;
drop policy if exists "Users delete own memes" on memes;

create policy "Users delete own campaigns"
  on campaigns for delete
  using (auth.uid() = user_id);

create policy "Users delete own runs"
  on simulation_runs for delete
  using (auth.uid() = user_id);

create policy "Users delete own verdicts"
  on agent_verdicts for delete
  using (
    exists (
      select 1 from simulation_runs
      where simulation_runs.id = agent_verdicts.run_id
        and simulation_runs.user_id = auth.uid()
    )
  );

create policy "Users delete own memes"
  on memes for delete
  using (
    exists (
      select 1 from simulation_runs
      where simulation_runs.id = memes.run_id
        and simulation_runs.user_id = auth.uid()
    )
  );
