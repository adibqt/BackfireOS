import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BranchScores,
  Lang,
  PersistedAi,
  ScoreSource,
  StoredBranch,
  Tone,
  TopCritic,
} from "@/lib/branches/types";

const TABLE = "campaign_branches";

/** Editable creative content shared by create + update. */
export interface BranchFields {
  label: string;
  author: string;
  slogan: string;
  cast: string;
  tagline: string;
  cta: string;
  riskyLine: string;
  tone: Tone;
  language: Lang;
}

export interface BranchCreate extends BranchFields {
  id: string;
  parentId: string | null;
  campaignId: string | null;
  createdAt: number;
}

type DbBranch = {
  id: string;
  user_id: string;
  parent_id: string | null;
  campaign_id: string | null;
  label: string;
  author: string;
  slogan: string;
  cast_direction: string;
  tagline: string;
  cta: string;
  risky_line: string;
  tone: Tone;
  language: Lang;
  ai_source: ScoreSource | null;
  ai_scores: BranchScores | null;
  ai_top_critic: TopCritic | null;
  ai_content_key: string | null;
  ai_scored_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapBranch(row: DbBranch): StoredBranch {
  const ai: PersistedAi | null =
    row.ai_source && row.ai_scores
      ? {
          source: row.ai_source,
          scores: row.ai_scores,
          topCritic: row.ai_top_critic ?? null,
          contentKey: row.ai_content_key ?? "",
          scoredAt: row.ai_scored_at ?? row.updated_at,
        }
      : null;

  return {
    id: row.id,
    parentId: row.parent_id,
    campaignId: row.campaign_id,
    label: row.label,
    author: row.author,
    slogan: row.slogan,
    cast: row.cast_direction,
    tagline: row.tagline,
    cta: row.cta,
    riskyLine: row.risky_line,
    tone: row.tone,
    language: row.language,
    createdAt: new Date(row.created_at).getTime(),
    ai,
  };
}

/** Maps the editable creative fields onto their snake_case columns. */
function fieldsToRow(f: Partial<BranchFields>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (f.label !== undefined) row.label = f.label;
  if (f.author !== undefined) row.author = f.author;
  if (f.slogan !== undefined) row.slogan = f.slogan;
  if (f.cast !== undefined) row.cast_direction = f.cast;
  if (f.tagline !== undefined) row.tagline = f.tagline;
  if (f.cta !== undefined) row.cta = f.cta;
  if (f.riskyLine !== undefined) row.risky_line = f.riskyLine;
  if (f.tone !== undefined) row.tone = f.tone;
  if (f.language !== undefined) row.language = f.language;
  return row;
}

const SELECT = "*";

export async function dbListBranches(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string | null
): Promise<StoredBranch[]> {
  let query = supabase
    .from(TABLE)
    .select(SELECT)
    .eq("user_id", userId);
  query = campaignId === null
    ? query.is("campaign_id", null)
    : query.eq("campaign_id", campaignId);

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as DbBranch[] | null)?.map(mapBranch) ?? [];
}

export async function dbInsertBranch(
  supabase: SupabaseClient,
  userId: string,
  branch: BranchCreate
): Promise<StoredBranch> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: branch.id,
      user_id: userId,
      parent_id: branch.parentId,
      campaign_id: branch.campaignId,
      created_at: new Date(branch.createdAt).toISOString(),
      ...fieldsToRow(branch),
    })
    .select(SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapBranch(data as DbBranch);
}

export async function dbUpdateBranch(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  patch: Partial<BranchFields> & { ai?: PersistedAi | null }
): Promise<StoredBranch | null> {
  const row = fieldsToRow(patch);

  if (patch.ai !== undefined) {
    if (patch.ai === null) {
      row.ai_source = null;
      row.ai_scores = null;
      row.ai_top_critic = null;
      row.ai_content_key = null;
      row.ai_scored_at = null;
    } else {
      row.ai_source = patch.ai.source;
      row.ai_scores = patch.ai.scores;
      row.ai_top_critic = patch.ai.topCritic;
      row.ai_content_key = patch.ai.contentKey;
      row.ai_scored_at = patch.ai.scoredAt;
    }
  }

  if (Object.keys(row).length === 0) {
    // Nothing to update — return the current row.
    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapBranch(data as DbBranch) : null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update(row)
    .eq("user_id", userId)
    .eq("id", id)
    .select(SELECT)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapBranch(data as DbBranch) : null;
}

/**
 * Deletes a branch and its entire subtree. The DB FK cascade handles the
 * descendants when the root row is deleted; we still compute the id set first
 * so the caller (and the client) knows exactly which nodes vanished.
 */
export async function dbDeleteBranchSubtree(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, parent_id")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const rows = (data as { id: string; parent_id: string | null }[] | null) ?? [];
  const childrenOf = new Map<string, string[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const arr = childrenOf.get(r.parent_id) ?? [];
    arr.push(r.id);
    childrenOf.set(r.parent_id, arr);
  }

  const subtree: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    subtree.push(cur);
    for (const child of childrenOf.get(cur) ?? []) stack.push(child);
  }

  const { error: delError } = await supabase
    .from(TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("id", id); // cascade removes descendants

  if (delError) throw new Error(delError.message);
  return subtree;
}

/**
 * Bulk-seeds a fresh tree. Inserts sequentially in array order so every
 * parent exists before its children reference it (the seed array is ordered
 * parents-first).
 */
export async function dbSeedBranches(
  supabase: SupabaseClient,
  userId: string,
  branches: BranchCreate[]
): Promise<StoredBranch[]> {
  const out: StoredBranch[] = [];
  for (const branch of branches) {
    out.push(await dbInsertBranch(supabase, userId, branch));
  }
  return out;
}
