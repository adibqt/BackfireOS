/**
 * Shared vocabulary for Counterfactual Branching ("Git for campaigns").
 *
 * These types are imported by BOTH the client component (for the instant,
 * keystroke-responsive heuristic estimate) and the server route (for the
 * authoritative AI "war room" score). Keeping them in one module guarantees the
 * estimate and the real verdict speak the same shape.
 */

export type Tone = "playful" | "formal" | "aggressive" | "warm";
export type Lang = "en" | "bn" | "mixed";

/** A single node in the campaign variant tree. */
export interface Branch {
  id: string;
  parentId: string | null;
  label: string;
  author: string;
  slogan: string;
  cast: string;
  tagline: string;
  cta: string;
  riskyLine: string;
  tone: Tone;
  language: Lang;
  createdAt: number;
}

/**
 * Scores rendered on every branch. Field-for-field compatible with the engine's
 * {@link import("../agents/types").RunScores} so an AI verdict can drop straight
 * into the same UI cells as the heuristic estimate:
 *   polarization  ↔ RunScores.polarizationCoefficient
 *   drift         ↔ RunScores.brandSafetyDrift
 */
export interface BranchScores {
  resonance: number;
  backfireRisk: number;
  backfireScore: number;
  memeability: number;
  polarization: number;
  drift: number;
}

/** The fields that actually influence a score — the cache/identity surface. */
export const SCORED_FIELDS = [
  "slogan",
  "cast",
  "tagline",
  "cta",
  "riskyLine",
  "tone",
  "language",
] as const;

export type ScoredField = (typeof SCORED_FIELDS)[number];

/** The harshest critic on the panel, surfaced for the UI callout. */
export interface TopCritic {
  agentId: string;
  agentName: string;
  severity: number;
  reasoning: string;
  sampleAttack: string;
}

export type ScoreSource = "ai" | "mock" | "heuristic";

/**
 * An AI verdict as persisted onto a branch row. `contentKey` is the plaintext
 * {@link branchContentKey} the verdict was produced for, so a rehydrated client
 * can tell at a glance whether the branch was edited since (a stale verdict)
 * without re-running any hashing.
 */
export interface PersistedAi {
  source: ScoreSource;
  scores: BranchScores;
  topCritic: TopCritic | null;
  contentKey: string;
  scoredAt: string;
}

/** A branch as it travels between the persistence layer and the client. */
export interface StoredBranch extends Branch {
  ai: PersistedAi | null;
  /**
   * Which campaign's tree this branch belongs to. `null` = the standalone demo
   * tree (logged-out / no Supabase), keyed separately from every real campaign.
   */
  campaignId: string | null;
}

/**
 * The data used to seed a campaign's root branch on first visit: the campaign's
 * own copy, plus (if it has a completed simulation) its real AI verdict so the
 * root node opens showing the actual scores the campaign earned.
 */
export interface CampaignSeed {
  slogan: string;
  brief?: string;
  scores?: BranchScores;
  topCritic?: TopCritic | null;
}

/**
 * Projects the engine's RunScores onto the branch UI's BranchScores. The two
 * differ only in field names: polarizationCoefficient ↔ polarization,
 * brandSafetyDrift ↔ drift.
 */
export function runScoresToBranchScores(s: {
  resonance: number;
  backfireRisk: number;
  backfireScore: number;
  memeability: number;
  brandSafetyDrift: number;
  polarizationCoefficient: number;
}): BranchScores {
  return {
    resonance: s.resonance,
    backfireRisk: s.backfireRisk,
    backfireScore: s.backfireScore,
    memeability: s.memeability,
    polarization: s.polarizationCoefficient,
    drift: s.brandSafetyDrift,
  };
}

/** Response shape of POST /api/branch-score. */
export interface BranchScoreResponse {
  scores: BranchScores;
  /**
   * "ai"        — a live model panel judged this variant.
   * "mock"      — the model was unavailable; engine heuristic fallback ran.
   * "heuristic" — no model configured at all; the same deterministic estimate
   *               the client shows live.
   */
  source: ScoreSource;
  /** True when this exact content was already scored and served from cache. */
  cached: boolean;
  /** Stable hash of the scored content this response corresponds to. */
  contentHash: string;
  /** The single harshest verdict, for the "most damaging critic" callout. */
  topCritic: TopCritic | null;
}

/**
 * Canonical, order-stable serialization of the fields that affect a score.
 * Two branches with the same creative content (even different ids/authors)
 * hash identically — which is what lets an unedited fork reuse its parent's
 * cached verdict instead of paying for another model call.
 */
export function branchContentKey(branch: Pick<Branch, ScoredField>): string {
  return SCORED_FIELDS.map((f) => `${f}=${String(branch[f]).trim()}`).join("");
}
