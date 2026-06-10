/**
 * Pre-Mortem Generator — type contracts.
 *
 * Given a *completed* simulation run, the Pre-Mortem takes the worst plausible
 * outcome (the harshest red-team verdict + backfire risk + cultural stress
 * flags) and writes the forward-dated incident report the brand would be forced
 * to publish six months later: the headline that broke, the blowback timeline,
 * the root cause, the blast radius, the public apology, regulatory exposure, and
 * the corrective actions. The point is to confront the failure BEFORE it ships.
 *
 * These types are shared by the framework-free generation engine
 * (lib/premortem/engine.ts), the SSE route (app/api/premortem/route.ts), the
 * persistence layer (lib/db/premortem.ts), and the UI.
 */

/**
 * The class of failure the report dramatizes. Derived from which red-team critic
 * scored highest (see lib/premortem/strategies.ts). Picks the prompt-framing
 * strategy and the document's register, so a regulatory blow-up reads nothing
 * like a cultural one.
 */
export type FailureType =
  | "regulatory"
  | "cultural"
  | "reputational"
  | "competitive"
  | "brand";

/** One `## Heading` block of the generated document. */
export interface PreMortemSection {
  heading: string;
  body: string;
}

/**
 * A persisted pre-mortem. Every generation for a run is saved as its own
 * iteration (history is never overwritten), so a team can re-run it and compare
 * how the obituary changes — mirroring the Boardroom iteration model.
 */
export interface PreMortemReport {
  /** Unique id for this saved iteration. */
  id: string;
  runId: string;
  /** 1-based sequence within the run, in save order. */
  iteration: number;
  /** The campaign slogan the report was written against. */
  campaignSlogan: string;
  /**
   * Provenance when the report was written against a Counterfactual Branching
   * variant rather than the campaign's original copy. Null/undefined for the
   * original slogan.
   */
  branchId?: string | null;
  branchLabel?: string | null;
  failureType: FailureType;
  /** Forward-dated publish date (~6 months out), preformatted for display. */
  publishDate: string;
  /** The headline that broke (the `# ` line). */
  headline: string;
  /** Standfirst / sub-headline (the italic line under the headline). */
  dek: string;
  /** The public apology paragraph the brand is forced to publish. */
  apology: string;
  /** Remaining `## ` sections: timeline, root cause, blast radius, exposure, actions. */
  sections: PreMortemSection[];
  /** Worst-case red-team severity that seeded the report. */
  worstSeverity: number;
  /** Name of the harshest critic the report is grounded in. */
  topCriticName: string;
  /** "ai" = live model, "mock" = scripted fallback (no key / model unavailable). */
  source: "ai" | "mock";
  /** True when any part fell back to the scripted mock. */
  degraded: boolean;
  createdAt: string;
}

/**
 * Compact projection of a report for the browsable iteration timeline — enough
 * to render the list without shipping every report's full body.
 */
export interface PreMortemIterationSummary {
  id: string;
  iteration: number;
  slogan: string;
  branchId?: string | null;
  branchLabel?: string | null;
  failureType: FailureType;
  headline: string;
  worstSeverity: number;
  source: "ai" | "mock";
  createdAt: string;
}

/**
 * Immutable grounding passed to the generation engine. Assembled by the route
 * from the run's own campaign + red-team findings, so the report dramatizes the
 * real worst outcome rather than a hallucinated one.
 */
export interface PreMortemContext {
  slogan: string;
  brandValues: string;
  brief: string;
  /** Brand name to attribute the apology to, if any. */
  brandName: string;
  imageDescription: string;
  /** Condensed red-team verdicts (hardest-hit first). */
  redTeamSummary: string;
  /** Worst red-team severity across the panel. */
  worstSeverity: number;
  /** Name of the harshest critic. */
  topCriticName: string;
  /** The classified failure class — selects the prompt-framing strategy. */
  failureType: FailureType;
  /** The campaign's headline Backfire Score. */
  backfireScore: number;
  /** Compact summary of the highest-stress markets, when a stress map exists. */
  culturalFlags: string;
  /** The run's creation date (ISO) — the publish date is offset from this. */
  runCreatedAt: string;
  /** Forward-dated publish date (~6 months out), preformatted for display. */
  publishDate: string;
}
