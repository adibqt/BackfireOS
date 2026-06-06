-- Backfire OS — Scope the variant tree to a campaign
-- Run in Supabase SQL Editor after migrate-branches-tree.sql.
--
-- Each previously-run campaign now gets its OWN counterfactual tree. A branch
-- row with campaign_id = NULL is the standalone "demo tree" (the bKash seed),
-- preserving the logged-out / no-Supabase experience.
--
-- ON DELETE CASCADE: deleting a campaign tears down its whole variant tree.

alter table campaign_branches
  add column if not exists campaign_id uuid
    references campaigns(id) on delete cascade;

-- Lookups are always "this user's branches for this campaign".
create index if not exists campaign_branches_user_campaign_idx
  on campaign_branches(user_id, campaign_id);
