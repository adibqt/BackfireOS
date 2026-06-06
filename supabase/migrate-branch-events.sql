-- Backfire OS — Branch commit history ("git log" for campaigns)
-- Run in Supabase SQL Editor after migrate-branches-campaign.sql.
--
-- An append-only audit log of every mutation to a campaign's variant tree:
-- fork, edit, prune, score, baseline. Scoped per user + campaign so the log
-- rebuilds exactly when a tree is reopened, and survives reloads.

create table if not exists branch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- NULL campaign = the standalone demo tree. Deleting a campaign clears its log.
  campaign_id uuid references campaigns(id) on delete cascade,
  -- The branch the event concerns. Deliberately NOT a foreign key: a "prune"
  -- event must outlive the branch it removed, so we keep the id as a plain
  -- reference rather than cascading the event away with the row.
  branch_id uuid,
  type text not null check (type in ('fork', 'edit', 'prune', 'score', 'baseline')),
  message text not null,
  created_at timestamptz not null default now()
);

-- Lookups are always "this user's events for this campaign, newest first".
create index if not exists branch_events_user_campaign_idx
  on branch_events(user_id, campaign_id, created_at desc);

-- Row Level Security
alter table branch_events enable row level security;

drop policy if exists "Users view own branch events" on branch_events;
drop policy if exists "Users insert own branch events" on branch_events;
drop policy if exists "Users delete own branch events" on branch_events;

create policy "Users view own branch events"
  on branch_events for select
  using (auth.uid() = user_id);

create policy "Users insert own branch events"
  on branch_events for insert
  with check (auth.uid() = user_id);

create policy "Users delete own branch events"
  on branch_events for delete
  using (auth.uid() = user_id);

-- PostgREST role grants
grant select, insert, delete on table public.branch_events
  to anon, authenticated, service_role;
