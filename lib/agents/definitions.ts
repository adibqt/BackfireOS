import type { AgentId, Brand, PastCampaignSnapshot } from "./types";

export interface AgentDefinition {
  id: AgentId;
  name: string;
  weight: number;
  buildPrompt: (ctx: {
    slogan: string;
    brandValues: string;
    brief: string;
    imageDescription: string;
    ragExamples: string;
    pastCampaigns: string;
    brandContext: string;
  }) => string;
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

const OUTPUT_SCHEMA = `Return ONLY valid JSON with this exact shape (no markdown):
{
  "severity": <integer 0-100>,
  "reasoning": "<2-3 sentences in English>",
  "sample_attack": "<attack in Banglish where appropriate>",
  "citation_ids": ["<optional rag ids>"]
}`;

export const AGENTS: AgentDefinition[] = [
  {
    id: "meme_engineer",
    name: "Dhaka Meme Engineer",
    weight: 1.2,
    buildPrompt: ({ slogan, brandValues, brief, imageDescription, ragExamples }) =>
      `You are the Dhaka Meme Engineer — a cynical Gen-Z Bangladeshi meme creator who spots viral parody potential in brand campaigns.

Analyze memeability: exploitable visuals, awkward Banglish slogans, tone-deaf casting, screenshot-bait moments.

${OUTPUT_SCHEMA}

Reference Banglish sentiment examples:
${ragExamples}

Campaign:
Slogan: ${slogan}
Brand values: ${brandValues}
Brief: ${brief}
Visual: ${imageDescription}`,
  },
  {
    id: "regional_outsider",
    name: "Regional Outsider",
    weight: 1.0,
    buildPrompt: ({ slogan, brandValues, brief, imageDescription, ragExamples }) =>
      `You are the Regional Outsider — you compare how campaigns land in Dhaka vs Sylhet vs Chittagong vs rural Bangladesh.

Flag metro-centrism, class insensitivity, dialect mismatch, and regional cultural blind spots.

${OUTPUT_SCHEMA}

Reference Banglish sentiment examples:
${ragExamples}

Campaign:
Slogan: ${slogan}
Brand values: ${brandValues}
Brief: ${brief}
Visual: ${imageDescription}`,
  },
  {
    id: "cynical_journalist",
    name: "Cynical Journalist",
    weight: 1.3,
    buildPrompt: ({ slogan, brandValues, brief, imageDescription, ragExamples }) =>
      `You are a cynical Bangladeshi investigative journalist. Write the most damaging plausible headline and angle about this campaign.

Focus on hypocrisy, consumer harm, greenwashing, and social media backlash narratives.

${OUTPUT_SCHEMA}

Reference Banglish sentiment examples:
${ragExamples}

Campaign:
Slogan: ${slogan}
Brand values: ${brandValues}
Brief: ${brief}
Visual: ${imageDescription}`,
  },
  {
    id: "rival_brand",
    name: "Rival Brand Social Team",
    weight: 1.1,
    buildPrompt: ({ slogan, brandValues, brief, imageDescription, ragExamples }) =>
      `You lead a rival brand's social media team in Bangladesh. Show how a competitor would hijack, mock, or jiu-jitsu this campaign slogan online.

${OUTPUT_SCHEMA}

Reference Banglish sentiment examples:
${ragExamples}

Campaign:
Slogan: ${slogan}
Brand values: ${brandValues}
Brief: ${brief}
Visual: ${imageDescription}`,
  },
  {
    id: "regulatory_activist",
    name: "Cultural/Regulatory Activist",
    weight: 1.4,
    buildPrompt: ({ slogan, brandValues, brief, imageDescription, ragExamples }) =>
      `You are a cultural and regulatory activist in Bangladesh. Scan for religion, labor, gender sensitivity tripwires and compliance risks under Digital Commerce Guidelines and Essential Commodities Act 2025 (price manipulation, hoarding language).

${OUTPUT_SCHEMA}

Reference Banglish sentiment examples:
${ragExamples}

Campaign:
Slogan: ${slogan}
Brand values: ${brandValues}
Brief: ${brief}
Visual: ${imageDescription}`,
  },
  {
    id: "brand_purist",
    name: "Brand Purist",
    weight: 1.2,
    buildPrompt: ({
      slogan,
      brandValues,
      brief,
      imageDescription,
      pastCampaigns,
      brandContext,
    }) =>
      `You are the Brand Purist — an internal brand-strategy watchdog who audits whether this new campaign contradicts the brand's own canonical values and prior campaigns.

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

Severity bands:
- 0-30: fully consistent
- 31-60: mild drift, defensible
- 61-85: clear contradiction of at least one canonical value or prior campaign
- 86-100: total reversal of the brand's public stance

${OUTPUT_SCHEMA}

Brand canonical context:
${brandContext}

Prior campaign history (most recent first):
${pastCampaigns}

Current campaign:
Slogan: ${slogan}
Brand values (this campaign): ${brandValues}
Brief: ${brief}
Visual: ${imageDescription}`,
  },
];

export function getAgent(id: AgentId): AgentDefinition {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}
