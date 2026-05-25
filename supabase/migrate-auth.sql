-- Backfire OS — Auth + persistence migration
-- Run in Supabase SQL Editor after schema.sql

-- User ownership
alter table campaigns add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table simulation_runs add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table simulation_runs add column if not exists image_warning text;
alter table campaigns add column if not exists image_description text;
alter table memes add column if not exists image_fallback boolean default false;

create index if not exists campaigns_user_id_idx on campaigns(user_id);
create index if not exists simulation_runs_user_id_idx on simulation_runs(user_id);

-- Storage buckets for campaign visuals and generated memes
insert into storage.buckets (id, name, public)
values ('campaign-images', 'campaign-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('meme-images', 'meme-images', true)
on conflict (id) do nothing;

-- Row Level Security
alter table campaigns enable row level security;
alter table simulation_runs enable row level security;
alter table agent_verdicts enable row level security;
alter table memes enable row level security;

-- Drop open policies if re-running
drop policy if exists "Users view own campaigns" on campaigns;
drop policy if exists "Users insert own campaigns" on campaigns;
drop policy if exists "Users update own campaigns" on campaigns;
drop policy if exists "Users view own runs" on simulation_runs;
drop policy if exists "Users insert own runs" on simulation_runs;
drop policy if exists "Users update own runs" on simulation_runs;
drop policy if exists "Users view own verdicts" on agent_verdicts;
drop policy if exists "Users insert own verdicts" on agent_verdicts;
drop policy if exists "Users view own memes" on memes;
drop policy if exists "Users insert own memes" on memes;
drop policy if exists "Users upload campaign images" on storage.objects;
drop policy if exists "Users upload meme images" on storage.objects;
drop policy if exists "Public read campaign images" on storage.objects;
drop policy if exists "Public read meme images" on storage.objects;

create policy "Users view own campaigns"
  on campaigns for select
  using (auth.uid() = user_id);

create policy "Users insert own campaigns"
  on campaigns for insert
  with check (auth.uid() = user_id);

create policy "Users update own campaigns"
  on campaigns for update
  using (auth.uid() = user_id);

create policy "Users view own runs"
  on simulation_runs for select
  using (auth.uid() = user_id);

create policy "Users insert own runs"
  on simulation_runs for insert
  with check (auth.uid() = user_id);

create policy "Users update own runs"
  on simulation_runs for update
  using (auth.uid() = user_id);

create policy "Users view own verdicts"
  on agent_verdicts for select
  using (
    exists (
      select 1 from simulation_runs
      where simulation_runs.id = agent_verdicts.run_id
        and simulation_runs.user_id = auth.uid()
    )
  );

create policy "Users insert own verdicts"
  on agent_verdicts for insert
  with check (
    exists (
      select 1 from simulation_runs
      where simulation_runs.id = agent_verdicts.run_id
        and simulation_runs.user_id = auth.uid()
    )
  );

create policy "Users view own memes"
  on memes for select
  using (
    exists (
      select 1 from simulation_runs
      where simulation_runs.id = memes.run_id
        and simulation_runs.user_id = auth.uid()
    )
  );

create policy "Users insert own memes"
  on memes for insert
  with check (
    exists (
      select 1 from simulation_runs
      where simulation_runs.id = memes.run_id
        and simulation_runs.user_id = auth.uid()
    )
  );

create policy "Public read campaign images"
  on storage.objects for select
  using (bucket_id = 'campaign-images');

create policy "Users upload campaign images"
  on storage.objects for insert
  with check (
    bucket_id = 'campaign-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Public read meme images"
  on storage.objects for select
  using (bucket_id = 'meme-images');

create policy "Users upload meme images"
  on storage.objects for insert
  with check (
    bucket_id = 'meme-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Table grants for PostgREST roles (required — SQL Editor tables do not get these automatically)
grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.campaigns to anon, authenticated, service_role;
grant select, insert, update, delete on table public.simulation_runs to anon, authenticated, service_role;
grant select, insert, update, delete on table public.agent_verdicts to anon, authenticated, service_role;
grant select, insert, update, delete on table public.memes to anon, authenticated, service_role;
grant select, insert, update, delete on table public.bnsentmix_samples to anon, authenticated, service_role;

grant execute on function public.match_bnsentmix(vector, int) to anon, authenticated, service_role;
