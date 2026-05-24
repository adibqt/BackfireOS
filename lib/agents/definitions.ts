import type { AgentId } from "./types";

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
  }) => string;
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
];

export function getAgent(id: AgentId): AgentDefinition {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent: ${id}`);
  return agent;
}
