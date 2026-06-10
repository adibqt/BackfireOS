/**
 * Pre-Mortem strategies — the "Strategy via Lookup Map" pattern.
 *
 * Instead of OOP Strategy classes, the failure class selects a prompt-framing
 * function from a plain `Record<FailureType, fn>`. Each strategy steers the
 * generated obituary: the headline register, which real-world risks and
 * regulations to foreground, and what a "blast radius" actually means for that
 * class of failure. The class itself is derived from the run's OWN red-team
 * findings (`classifyFailure`), so the report dramatizes the real worst outcome.
 */
import type { AgentId, AgentVerdict, CulturalStressMap } from "@/lib/agents/types";
import type { FailureType, PreMortemContext } from "./types";

/**
 * Which red-team critic's lane each failure class belongs to. The harshest
 * critic on a run decides how the failure plays out in public.
 */
const AGENT_TO_FAILURE: Record<AgentId, FailureType> = {
  regulatory_activist: "regulatory",
  regional_outsider: "cultural",
  cynical_journalist: "reputational",
  meme_engineer: "reputational",
  rival_brand: "competitive",
  brand_purist: "brand",
};

/**
 * Maps a single critic to its failure class, tolerant of an unknown agent id
 * (e.g. a branch verdict whose critic isn't in the canonical panel). Defaults to
 * the most general public-facing failure.
 */
export function failureForAgent(agentId: string): FailureType {
  return (AGENT_TO_FAILURE as Record<string, FailureType>)[agentId] ?? "reputational";
}

/** Human label for a failure class — used in badges and the report header. */
export const FAILURE_LABELS: Record<FailureType, string> = {
  regulatory: "Regulatory Breach",
  cultural: "Cultural Backlash",
  reputational: "Reputational Crisis",
  competitive: "Competitive Hijack",
  brand: "Brand-Integrity Collapse",
};

/**
 * Classifies the failure class for a run. The harshest red-team verdict picks
 * the lane; a cultural stress map breaks ties toward "cultural" when a market's
 * severity outranks the worst verdict (a campaign can read clean to the panel
 * yet detonate in one region). Defaults to "reputational" — the most general
 * public-facing failure — when there is nothing to go on.
 */
export function classifyFailure(
  verdicts: AgentVerdict[] | undefined,
  stressMap?: CulturalStressMap | null
): FailureType {
  let worst: AgentVerdict | null = null;
  for (const v of verdicts ?? []) {
    if (!worst || v.severity > worst.severity) worst = v;
  }

  const worstMarket = (stressMap?.markets ?? []).reduce(
    (max, m) => (m.severity > (max?.severity ?? -1) ? m : max),
    null as CulturalStressMap["markets"][number] | null
  );

  if (worstMarket && worstMarket.severity > (worst?.severity ?? 0)) {
    return "cultural";
  }
  if (worst) return failureForAgent(worst.agentId);
  return "reputational";
}

/**
 * Per-class framing injected into the generation prompt. Keeps the strategies
 * declarative: each one names the angle the failure takes, the concrete
 * real-world stakes, and the regulations/forces a credible post-mortem would
 * have to reckon with for that class.
 */
const STRATEGY: Record<FailureType, (ctx: PreMortemContext) => string> = {
  regulatory: () => `FAILURE CLASS: Regulatory breach.
Frame the disaster as a compliance failure that drew enforcement. The campaign's
language tripped a real rule. Foreground:
- The Essential Commodities Act 2025 (price-manipulation, scarcity/hoarding language) and the
  Digital Commerce Guidelines (misleading or unsubstantiated claims) — cite whichever the copy
  actually implicates.
- A regulator's notice, a fine or suspension, and the legal/PR scramble that followed.
The blast radius is legal exposure: penalties, a forced takedown, and an executive hauled before
a regulator.`,

  cultural: () => `FAILURE CLASS: Cultural backlash.
Frame the disaster as the campaign reading as tone-deaf to a region, class, faith, or community in
Bangladesh — the city talking down to the village, or a sacred/sensitive line crossed. Foreground:
- The exact copy or visual that offended, and who it othered.
- How outrage spread from one community outward (local press → national → diaspora).
The blast radius is trust: boycotts, community statements, and a brand suddenly seen as not "for us."`,

  reputational: () => `FAILURE CLASS: Reputational crisis.
Frame the disaster as a claim the brand could not back up, exposed in public. A journalist or an
ordinary customer held the slogan to its word and it broke. Foreground:
- The specific promise in the copy, and the moment reality contradicted it.
- The headline a cynical newsroom ran, and how the screenshot outlived the campaign.
The blast radius is credibility: a viral debunk, lost media goodwill, and a slogan turned into a punchline.`,

  competitive: () => `FAILURE CLASS: Competitive hijack.
Frame the disaster as a rival weaponizing the campaign against the brand — a reply meme, a sharper
counter-line, a comparison the brand invited and lost. Foreground:
- The opening the copy handed a competitor, and the exact counter-move.
- How the rival's response out-traveled the original.
The blast radius is market share and mindshare: the brand funded its rival's best week.`,

  brand: () => `FAILURE CLASS: Brand-integrity collapse.
Frame the disaster as the campaign contradicting the brand's own stated values and back catalogue —
value drift made public. Foreground:
- The exact contradiction between this slogan and what the brand has always claimed to stand for.
- Loyal customers and staff calling out the hypocrisy.
The blast radius is internal and loyal-base trust: a brand that no longer recognizes itself.`,
};

/** Returns the framing block for a failure class. */
export function strategyFraming(ctx: PreMortemContext): string {
  return STRATEGY[ctx.failureType](ctx);
}
