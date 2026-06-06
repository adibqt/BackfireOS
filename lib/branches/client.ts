import type {
  BranchEvent,
  BranchEventType,
  Lang,
  PersistedAi,
  StoredBranch,
  Tone,
} from "./types";

/**
 * Thin client for the /api/branches persistence endpoints. All mutations are
 * fire-and-forget from the UI's perspective — the component updates local state
 * optimistically and these calls reconcile the server in the background. A
 * failure logs but never blocks the interaction, so the tree stays responsive
 * even if a save hiccups.
 */

export interface BranchCreatePayload {
  id: string;
  parentId: string | null;
  campaignId: string | null;
  createdAt: number;
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

/** A selectable campaign for the tree picker. */
export interface CampaignOption {
  campaignId: string;
  slogan: string;
  createdAt: string;
  backfireScore: number | null;
}

export interface BranchPatchPayload {
  label?: string;
  author?: string;
  slogan?: string;
  cast?: string;
  tagline?: string;
  cta?: string;
  riskyLine?: string;
  tone?: Tone;
  language?: Lang;
  ai?: PersistedAi | null;
}

/**
 * Loads the persisted tree. Returns null when persistence is unavailable
 * (logged out → 401, or Supabase not configured → 503), signalling the caller
 * to fall back to the local-only demo tree.
 */
export async function loadBranches(
  campaignId: string | null
): Promise<StoredBranch[] | null> {
  try {
    const url = campaignId
      ? `/api/branches?campaign=${encodeURIComponent(campaignId)}`
      : "/api/branches";
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as { branches?: StoredBranch[] };
    return Array.isArray(data.branches) ? data.branches : null;
  } catch {
    return null;
  }
}

/**
 * Lists the user's past campaigns for the tree picker. Returns [] when
 * unavailable (logged out / no Supabase) — the picker then offers only the
 * demo tree.
 */
export async function listCampaigns(): Promise<CampaignOption[]> {
  try {
    const res = await fetch("/api/campaigns?list=true");
    if (!res.ok) return [];
    const data = (await res.json()) as {
      runs?: Array<{
        campaignId: string;
        createdAt: string;
        campaign?: { slogan?: string };
        scores?: { backfireScore?: number };
      }>;
    };
    const runs = Array.isArray(data.runs) ? data.runs : [];
    // One option per campaign; keep the most recent run per campaign.
    const byCampaign = new Map<string, CampaignOption>();
    for (const r of runs) {
      if (!r.campaignId || byCampaign.has(r.campaignId)) continue;
      byCampaign.set(r.campaignId, {
        campaignId: r.campaignId,
        slogan: r.campaign?.slogan ?? "(untitled campaign)",
        createdAt: r.createdAt,
        backfireScore: r.scores?.backfireScore ?? null,
      });
    }
    return Array.from(byCampaign.values());
  } catch {
    return [];
  }
}

export async function apiCreateBranch(payload: BranchCreatePayload): Promise<void> {
  try {
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Branch create sync failed:", e);
  }
}

export async function apiPatchBranch(
  id: string,
  patch: BranchPatchPayload
): Promise<void> {
  try {
    await fetch(`/api/branches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch (e) {
    console.error("Branch patch sync failed:", e);
  }
}

export async function apiDeleteBranch(id: string): Promise<void> {
  try {
    await fetch(`/api/branches/${id}`, { method: "DELETE" });
  } catch (e) {
    console.error("Branch delete sync failed:", e);
  }
}

/* ── Commit history ──────────────────────────────────────────────── */

export interface EventCreatePayload {
  id: string;
  campaignId: string | null;
  branchId: string | null;
  type: BranchEventType;
  message: string;
  ts: number;
}

/** Loads a campaign's commit history; [] when unavailable. */
export async function loadEvents(
  campaignId: string | null
): Promise<BranchEvent[]> {
  try {
    const url = campaignId
      ? `/api/branch-events?campaign=${encodeURIComponent(campaignId)}`
      : "/api/branch-events";
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { events?: BranchEvent[] };
    return Array.isArray(data.events) ? data.events : [];
  } catch {
    return [];
  }
}

export async function apiAppendEvent(payload: EventCreatePayload): Promise<void> {
  try {
    await fetch("/api/branch-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Event append sync failed:", e);
  }
}
