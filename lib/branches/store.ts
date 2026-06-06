import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  branchContentKey,
  type BranchEvent,
  type CampaignSeed,
  type PersistedAi,
  type StoredBranch,
} from "./types";
import { seedBranches } from "./seed";
import {
  dbDeleteBranchSubtree,
  dbInsertBranch,
  dbListBranches,
  dbSeedBranches,
  dbUpdateBranch,
  type BranchCreate,
  type BranchFields,
} from "@/lib/db/branches";
import {
  dbInsertEvent,
  dbListEvents,
  type EventCreate,
} from "@/lib/db/branch-events";

/**
 * Branch persistence facade. Mirrors lib/store.ts: when a Supabase admin client
 * + userId are present it talks to Postgres; otherwise it falls back to a
 * process-global in-memory store so the feature still works in demo / no-auth
 * mode (ephemeral across restarts, which is the right trade for a demo).
 *
 * Trees are scoped per campaign. campaignId === null is the standalone demo
 * tree (the bKash seed); a real campaign id gets its own tree whose root is
 * seeded from that campaign — including its real verdict if it has been run.
 */

declare global {
  var __backfireBranchStore:
    | Map<string, Map<string, StoredBranch>>
    | undefined;
  var __backfireEventStore:
    | Map<string, (BranchEvent & { campaignId: string | null })[]>
    | undefined;
}

function memStore(): Map<string, Map<string, StoredBranch>> {
  return (globalThis.__backfireBranchStore ??= new Map());
}

const ownerKey = (userId: string | null) => userId ?? "__local__";

/** One bucket per owner; each branch carries its own campaignId for filtering. */
function memBucket(userId: string | null): Map<string, StoredBranch> {
  const key = ownerKey(userId);
  let bucket = memStore().get(key);
  if (!bucket) {
    bucket = new Map();
    memStore().set(key, bucket);
  }
  return bucket;
}

function createToStored(c: BranchCreate): StoredBranch {
  return {
    id: c.id,
    parentId: c.parentId,
    campaignId: c.campaignId,
    label: c.label,
    author: c.author,
    slogan: c.slogan,
    cast: c.cast,
    tagline: c.tagline,
    cta: c.cta,
    riskyLine: c.riskyLine,
    tone: c.tone,
    language: c.language,
    createdAt: c.createdAt,
    ai: null,
  };
}

/**
 * Turns the placeholder-id demo tree into insertable rows with real UUIDs,
 * remapping each parentId through the same id map so the tree stays intact.
 * Demo rows live under campaignId = null.
 */
function materializeDemoSeed(): BranchCreate[] {
  const raw = seedBranches();
  const idMap = new Map<string, string>();
  for (const b of raw) idMap.set(b.id, randomUUID());
  return raw.map((b) => ({
    id: idMap.get(b.id)!,
    parentId: b.parentId ? idMap.get(b.parentId) ?? null : null,
    campaignId: null,
    createdAt: b.createdAt,
    label: b.label,
    author: b.author,
    slogan: b.slogan,
    cast: b.cast,
    tagline: b.tagline,
    cta: b.cta,
    riskyLine: b.riskyLine,
    tone: b.tone,
    language: b.language,
  }));
}

/** Builds the single root branch for a campaign's tree from its seed data. */
function materializeCampaignRoot(
  campaignId: string,
  seed: CampaignSeed
): BranchCreate {
  return {
    id: randomUUID(),
    parentId: null,
    campaignId,
    createdAt: Date.now(),
    label: "v1.0 · main",
    author: "Campaign",
    slogan: seed.slogan,
    cast: "",
    tagline: seed.brief ? seed.brief.slice(0, 140) : "",
    cta: "",
    riskyLine: "",
    tone: "playful",
    language: "mixed",
  };
}

/** The root's persisted AI verdict, if the campaign already has real scores. */
function rootAiFromSeed(root: BranchCreate, seed: CampaignSeed): PersistedAi | null {
  if (!seed.scores) return null;
  return {
    source: "ai",
    scores: seed.scores,
    topCritic: seed.topCritic ?? null,
    contentKey: branchContentKey(root),
    scoredAt: new Date().toISOString(),
  };
}

/**
 * Lists a campaign's tree, seeding it on first visit. For the demo tree
 * (campaignId null) that's the bKash starter set; for a real campaign it's a
 * single root carrying the campaign's copy and — when available — its actual
 * verdict, so forks branch off the real result.
 */
export async function listOrSeedBranches(
  supabase: SupabaseClient | null,
  userId: string | null,
  campaignId: string | null,
  seed: CampaignSeed | null
): Promise<StoredBranch[]> {
  if (supabase && userId) {
    const existing = await dbListBranches(supabase, userId, campaignId);
    if (existing.length > 0) return existing;

    if (campaignId === null) {
      return dbSeedBranches(supabase, userId, materializeDemoSeed());
    }
    if (!seed) return [];

    const root = materializeCampaignRoot(campaignId, seed);
    const [inserted] = await dbSeedBranches(supabase, userId, [root]);
    const ai = rootAiFromSeed(root, seed);
    if (ai) {
      const withAi = await dbUpdateBranch(supabase, userId, root.id, { ai });
      return [withAi ?? inserted];
    }
    return [inserted];
  }

  const bucket = memBucket(userId);
  const forCampaign = () =>
    Array.from(bucket.values())
      .filter((b) => b.campaignId === campaignId)
      .sort((a, b) => a.createdAt - b.createdAt);

  if (forCampaign().length === 0) {
    if (campaignId === null) {
      for (const c of materializeDemoSeed()) bucket.set(c.id, createToStored(c));
    } else if (seed) {
      const root = materializeCampaignRoot(campaignId, seed);
      const stored = createToStored(root);
      stored.ai = rootAiFromSeed(root, seed);
      bucket.set(stored.id, stored);
    }
  }
  return forCampaign();
}

export async function createBranch(
  supabase: SupabaseClient | null,
  userId: string | null,
  branch: BranchCreate
): Promise<StoredBranch> {
  if (supabase && userId) {
    return dbInsertBranch(supabase, userId, branch);
  }
  const stored = createToStored(branch);
  memBucket(userId).set(stored.id, stored);
  return stored;
}

export async function updateBranch(
  supabase: SupabaseClient | null,
  userId: string | null,
  id: string,
  patch: Partial<BranchFields> & { ai?: PersistedAi | null }
): Promise<StoredBranch | null> {
  if (supabase && userId) {
    return dbUpdateBranch(supabase, userId, id, patch);
  }
  const bucket = memBucket(userId);
  const existing = bucket.get(id);
  if (!existing) return null;
  const next: StoredBranch = {
    ...existing,
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    ...(patch.author !== undefined ? { author: patch.author } : {}),
    ...(patch.slogan !== undefined ? { slogan: patch.slogan } : {}),
    ...(patch.cast !== undefined ? { cast: patch.cast } : {}),
    ...(patch.tagline !== undefined ? { tagline: patch.tagline } : {}),
    ...(patch.cta !== undefined ? { cta: patch.cta } : {}),
    ...(patch.riskyLine !== undefined ? { riskyLine: patch.riskyLine } : {}),
    ...(patch.tone !== undefined ? { tone: patch.tone } : {}),
    ...(patch.language !== undefined ? { language: patch.language } : {}),
    ...(patch.ai !== undefined ? { ai: patch.ai } : {}),
  };
  bucket.set(id, next);
  return next;
}

export async function deleteBranchSubtree(
  supabase: SupabaseClient | null,
  userId: string | null,
  id: string
): Promise<string[]> {
  if (supabase && userId) {
    return dbDeleteBranchSubtree(supabase, userId, id);
  }
  const bucket = memBucket(userId);
  const childrenOf = new Map<string, string[]>();
  for (const b of bucket.values()) {
    if (b.parentId) {
      const arr = childrenOf.get(b.parentId) ?? [];
      arr.push(b.id);
      childrenOf.set(b.parentId, arr);
    }
  }
  const subtree: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (!bucket.has(cur)) continue;
    subtree.push(cur);
    for (const child of childrenOf.get(cur) ?? []) stack.push(child);
  }
  for (const sid of subtree) bucket.delete(sid);
  return subtree;
}

/* ── Commit history (branch_events) ──────────────────────────────── */

function memEventBucket(
  userId: string | null
): (BranchEvent & { campaignId: string | null })[] {
  const key = ownerKey(userId);
  const store = (globalThis.__backfireEventStore ??= new Map());
  let bucket = store.get(key);
  if (!bucket) {
    bucket = [];
    store.set(key, bucket);
  }
  return bucket;
}

/** Lists a campaign's commit history, newest first. */
export async function listEvents(
  supabase: SupabaseClient | null,
  userId: string | null,
  campaignId: string | null,
  limit = 100
): Promise<BranchEvent[]> {
  if (supabase && userId) {
    return dbListEvents(supabase, userId, campaignId, limit);
  }
  return memEventBucket(userId)
    .filter((e) => e.campaignId === campaignId)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      type: e.type,
      message: e.message,
      ts: e.ts,
      branchId: e.branchId,
    }));
}

/** Appends a single commit to the history. */
export async function appendEvent(
  supabase: SupabaseClient | null,
  userId: string | null,
  event: EventCreate
): Promise<BranchEvent> {
  if (supabase && userId) {
    return dbInsertEvent(supabase, userId, event);
  }
  const stored: BranchEvent = {
    id: event.id,
    type: event.type,
    message: event.message,
    ts: event.ts,
    branchId: event.branchId,
  };
  memEventBucket(userId).push({ ...stored, campaignId: event.campaignId });
  return stored;
}
