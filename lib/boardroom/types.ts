/**
 * Boardroom Mode — type contracts for the multi-agent debate.
 *
 * The debate is the architectural backbone of this feature: synthetic personas
 * argue a campaign with each other as a live transcript, and a decision-maker
 * reads the exchange before greenlighting. These types are shared by the
 * framework-free state machine (lib/boardroom/engine.ts), the SSE route
 * (app/api/boardroom/route.ts), the persistence layer, and the UI.
 */

/** Stable identifiers for the debate participants. */
export type PersonaId =
  | "brand_manager"
  | "activist"
  | "journalist"
  | "brand_purist";

/** Which provider/model produced a given turn — drives the "compound" badge. */
export type DebateModel = "scout" | "compound";

export interface DebatePersona {
  id: PersonaId;
  name: string;
  /** One-line role shown under the name in the transcript. */
  role: string;
  /** Two-letter monogram for the avatar tile. */
  initials: string;
  /**
   * Which Groq model this persona runs on. Only the adversarial Activist is
   * assigned the agentic "compound" model; everyone else stays on the fast,
   * quota-friendly scout model. See lib/boardroom/personas.ts for the rationale.
   */
  model: DebateModel;
  /** The persona's voice, stance, and debate rules — its system prompt. */
  systemPrompt: string;
}

export interface DebateMessage {
  id: string;
  speakerId: PersonaId;
  speakerName: string;
  /** Which model spoke — lets the UI flag the agentic Activist turns. */
  model: DebateModel;
  content: string;
  /** 1-based debate round this turn belongs to. */
  round: number;
}

/** Final synthesized recommendation a decision-maker reads to greenlight. */
export type DebateDecision = "greenlight" | "revise" | "kill";

export interface DebateSynthesis {
  decision: DebateDecision;
  /** 0-100 confidence in the recommendation. */
  confidence: number;
  /** 2-4 sentence neutral summary of where the room landed. */
  summary: string;
  /** Concrete changes required before launch (empty for a clean greenlight). */
  conditions: string[];
  /** Provenance — a live model verdict vs. the scripted heuristic fallback. */
  source: "ai" | "mock";
}

/**
 * The persisted record of one debate iteration. Every time the room is
 * convened for a run a new transcript is saved (rather than overwriting the
 * previous one), so decision-makers can browse the full history — including
 * debates run against different counterfactual slogan variants.
 */
export interface BoardroomTranscript {
  /** Unique id for this saved iteration (lets the timeline address it). */
  id: string;
  runId: string;
  /** 1-based sequence within the run, in save order. */
  iteration: number;
  /** The slogan that was actually debated (the variant, when one was chosen). */
  campaignSlogan: string;
  /**
   * Provenance when the debated slogan came from a Counterfactual Branching
   * variant rather than the campaign's original copy. Null/undefined for the
   * original slogan.
   */
  branchId?: string | null;
  branchLabel?: string | null;
  messages: DebateMessage[];
  synthesis: DebateSynthesis;
  rounds: number;
  /** True when the debate halted early on detected convergence. */
  converged: boolean;
  /** Whether any turn fell back to the scripted mock (no model available). */
  degraded: boolean;
  createdAt: string;
}

/**
 * Lightweight summary of a saved iteration for the browsable timeline — enough
 * to render the list without shipping every transcript's full message body.
 */
export interface BoardroomIterationSummary {
  id: string;
  iteration: number;
  slogan: string;
  branchId?: string | null;
  branchLabel?: string | null;
  decision: DebateDecision;
  confidence: number;
  rounds: number;
  converged: boolean;
  degraded: boolean;
  createdAt: string;
}

/**
 * Shared short-term memory of the debate — the running message history plus the
 * immutable campaign grounding. Each persona reads this context, formulates a
 * response, and appends it; the engine advances the speaker pointer. No hidden
 * state, no framework: just an object passed turn to turn.
 */
export interface DebateContext {
  slogan: string;
  brandValues: string;
  /** Brief copy — carries the target audience, channels, and launch context. */
  brief: string;
  imageDescription: string;
  /** Brand name for the Brand Manager / Purist to defend, if any. */
  brandName: string;
  /**
   * Primary market the campaign is launching into (e.g. "Bangladesh"). Lets the
   * room reason about regional fit rather than judging the slogan in a vacuum.
   */
  region: string;
  /**
   * Per-market cultural-stress summary distilled from the simulation, so the room
   * argues how the slogan actually lands across Dhaka/Sylhet/Chittagong/rural —
   * not just against a single global severity number. Empty when unavailable.
   */
  marketSummary: string;
  /** Compact summary of the red-team verdicts, used to ground the arguments. */
  redTeamSummary: string;
  messages: DebateMessage[];
}
