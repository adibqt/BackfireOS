import type { AgentId, Brand, PastCampaignSnapshot } from "./types";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  weight: number;
  /**
   * The critic's role, lens, and any agent-specific rules. Composed into the
   * single panel prompt (see {@link buildPanelPrompt}) so all six verdicts come
   * back in one model call — the free tier only allows a handful of requests
   * per minute, and firing six parallel calls instantly exhausts the quota.
   */
  persona: string;
}

export function formatPastCampaigns(history: PastCampaignSnapshot[]): string {
  if (history.length === 0) {
    return "No prior completed simulations under this brand — this is the first audited campaign. Do not reference numbered prior campaigns ([1], [2], etc.).";
  }
  return history
    .map((c, i) => {
      const date = c.createdAt
        ? new Date(c.createdAt).toISOString().split("T")[0]
        : "unknown";
      return `[${i + 1}] (${date})
  Slogan: ${c.slogan}
  Stated values: ${c.brandValues ?? "(none)"}
  Brief: ${c.brief ?? "(none)"}`;
    })
    .join("\n\n");
}

export function formatBrandContext(brand: Brand | null): string {
  if (!brand) {
    return "No brand selected for this campaign. Judge consistency only against the brand values declared in the current campaign.";
  }
  return `Brand: ${brand.name}
Brand description: ${brand.description ?? "(not specified)"}
Canonical stated values: ${brand.statedValues ?? "(not specified)"}`;
}

// Shared 0-100 rubric so every critic reports severity on the same scale.
// These bands are aligned with the Brand Purist's domain-specific bands so the
// weighted Backfire Score aggregates a single, coherent quantity.
const SEVERITY_GUIDE = `Severity scale (the SAME scale every critic uses — calibrate against it, do not grade on your own private curve):
- 0-30: negligible — unlikely to draw criticism, mockery, or spread.
- 31-60: moderate — some friction, eye-rolls, or contained mockery; recoverable.
- 61-85: serious — likely public backlash, ratio, or sustained criticism in your lane.
- 86-100: severe — crisis-level, viral pile-on, or hard regulatory/brand breach.

Calibration discipline: score the campaign as it actually reads, not the worst campaign imaginable. Most ordinary, competent campaigns sit in 20-55; reserve 61+ for a concrete, nameable risk you can point to in the copy or visual, and 86+ only for a genuine crisis. If you cannot cite a specific tripwire, do not score above 40. A low score is a valid, expected verdict — do not inflate to seem useful.`;

export const AGENTS: AgentDefinition[] = [
  {
    id: "meme_engineer",
    name: "Dhaka Meme Engineer",
    weight: 1.2,
    persona: `The Dhaka Meme Engineer — a cynical Gen-Z Bangladeshi meme creator who spots viral parody potential in brand campaigns. Analyze memeability: exploitable visuals, awkward Banglish slogans, tone-deaf casting, screenshot-bait moments.`,
  },
  {
    id: "regional_outsider",
    name: "Regional Outsider",
    weight: 1.0,
    persona: `The Regional Outsider — you compare how campaigns land in Dhaka vs Sylhet vs Chittagong vs rural Bangladesh. Flag metro-centrism, class insensitivity, dialect mismatch, and regional cultural blind spots.`,
  },
  {
    id: "cynical_journalist",
    name: "Cynical Journalist",
    weight: 1.3,
    persona: `A cynical Bangladeshi investigative journalist. Write the most damaging plausible headline and angle about this campaign. Focus on hypocrisy, consumer harm, greenwashing, and social media backlash narratives.`,
  },
  {
    id: "rival_brand",
    name: "Rival Brand Social Team",
    weight: 1.1,
    persona: `The lead of a rival brand's social media team in Bangladesh. Show how a competitor would hijack, mock, or jiu-jitsu this campaign slogan online.`,
  },
  {
    id: "regulatory_activist",
    name: "Cultural/Regulatory Activist",
    weight: 1.4,
    persona: `A cultural and regulatory activist in Bangladesh. Scan for religion, labor, gender sensitivity tripwires and compliance risks under Digital Commerce Guidelines and Essential Commodities Act 2025 (price manipulation, hoarding language).`,
  },
  {
    id: "brand_purist",
    name: "Brand Purist",
    weight: 1.2,
    persona: `The Brand Purist — an internal brand-strategy watchdog who audits whether this new campaign contradicts the brand's own canonical values and prior campaigns.

You receive two sources of truth, in order of authority:
1. The brand's canonical stated values (the brand's own declared identity).
2. The brand's prior campaign history (what the brand has actually said in market).

Audit the current campaign against both. Look for:
- Stated values that have flipped, softened, or been abandoned
- Tone shifts (e.g., previously somber/ethical → now playful/aggressive)
- Audience pivots that betray earlier positioning
- Claims that conflict with prior promises
- Slogan/visual contradicting the brand's canonical description

In "reasoning":
- If contradicting the canonical values, quote the specific value violated.
- If contradicting prior campaigns, cite the entry number ("Contradicts [2]: previously claimed X, now claims Y").
- If prior campaign history states there are no prior completed simulations, audit only against canonical values. Do not cite [1], [2], or any numbered prior campaign, and do not invent prior campaigns.
- If both canonical values and prior campaign history are empty, judge slogan vs. in-campaign brand values and state that explicitly.

Use the shared severity scale; for this role it maps to: 0-30 fully consistent, 31-60 mild drift (defensible), 61-85 clear contradiction of at least one canonical value or prior campaign, 86-100 total reversal of the brand's public stance.`,
  },
];

/**
 * Builds a single prompt that asks the model to return one verdict per critic.
 * One request instead of six keeps a whole simulation inside the free-tier
 * rate limit.
 */
export function buildPanelPrompt(ctx: {
  slogan: string;
  brandValues: string;
  brief: string;
  imageDescription: string;
  ragExamples: string;
  pastCampaigns: string;
  brandContext: string;
}): string {
  const personas = AGENTS.map(
    (a, i) => `### Critic ${i + 1} — id: "${a.id}" (${a.name})
${a.persona}`
  ).join("\n\n");

  const ids = AGENTS.map((a) => a.id).join(", ");

  return `You are simulating a panel of ${AGENTS.length} distinct Bangladeshi red-team critics reviewing ONE ad campaign. Produce one independent verdict from EACH critic, fully in that critic's voice and lens. Do not blend the critics — each reasons only from its own role.

${personas}

${SEVERITY_GUIDE}

Reference Banglish sentiment examples (shared across critics):
${ctx.ragExamples}

Brand canonical context (only the Brand Purist needs this):
${ctx.brandContext}

Prior campaign history, most recent first (only the Brand Purist needs this):
${ctx.pastCampaigns}

Campaign under review:
Slogan: ${ctx.slogan}
Brand values (this campaign): ${ctx.brandValues}
Brief: ${ctx.brief}
Visual: ${ctx.imageDescription}

Return ONLY valid JSON (no markdown) — an array with EXACTLY one object per critic, in the order listed above:
[
  {
    "agent_id": "<one of: ${ids}>",
    "severity": <integer 0-100>,
    "reasoning": "<2-3 sentences in English>",
    "sample_attack": "<attack in Banglish where appropriate>",
    "citation_ids": ["<optional rag ids>"]
  }
]
Include every critic id exactly once.`;
}

export function getAgent(id: AgentId): AgentDefinition {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}
