import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { AgentVerdict, CampaignInput } from "./agents/types";
import { AGENTS } from "./agents/definitions";
import { formatRagExamples, retrieveBanglishExamples } from "./rag";

interface RawVerdict {
  severity: number;
  reasoning: string;
  sample_attack: string;
  citation_ids?: string[];
}

function parseVerdictJson(text: string): RawVerdict {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned) as RawVerdict;
  return {
    severity: Math.max(0, Math.min(100, Math.round(parsed.severity))),
    reasoning: parsed.reasoning,
    sample_attack: parsed.sample_attack,
    citation_ids: parsed.citation_ids ?? [],
  };
}

function mockVerdict(
  agentId: AgentVerdict["agentId"],
  agentName: string,
  campaign: CampaignInput,
  ragIds: string[]
): AgentVerdict {
  const slogan = campaign.slogan.toLowerCase();
  let severity = 45;

  if (agentId === "meme_engineer") {
    severity = slogan.includes("cash") || slogan.includes("meme") ? 82 : 68;
  } else if (agentId === "regulatory_activist") {
    severity =
      slogan.includes("price") || slogan.includes("limited") ? 88 : 55;
  } else if (agentId === "cynical_journalist") {
    severity = 74;
  } else if (agentId === "rival_brand") {
    severity = 61;
  } else if (agentId === "regional_outsider") {
    severity = slogan.includes("dhaka") ? 72 : 58;
  }

  const attacks: Record<AgentVerdict["agentId"], string> = {
    meme_engineer: `POV: ${campaign.slogan} — screenshot ready meme template`,
    regional_outsider: "Dhaka-centric ad, Sylhet ar Chittagong e resonate korbe na",
    cynical_journalist: `EXCLUSIVE: Brand claims '${campaign.slogan}' but customers disagree`,
    rival_brand: `Thanks for the free slogan — our reply meme drops in 1 hour`,
    regulatory_activist: "Essential Commodities Act risk: scarcity language detected",
  };

  return {
    agentId,
    agentName,
    severity,
    reasoning: `Demo analysis for ${agentName}: campaign '${campaign.slogan}' shows moderate-to-high backlash potential in Bangladesh social media context.`,
    sampleAttack: attacks[agentId],
    citationIds: ragIds,
  };
}

async function runAgentWithClaude(
  prompt: string
): Promise<RawVerdict> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text response from Claude");
  }
  return parseVerdictJson(block.text);
}

export async function parseCampaignImage(
  campaign: CampaignInput
): Promise<string> {
  if (campaign.imageDescription) return campaign.imageDescription;
  if (!campaign.imageBase64 && !campaign.imageUrl) {
    return "No visual provided — text-only campaign analysis.";
  }

  if (!process.env.OPENAI_API_KEY) {
    return "Uploaded campaign visual (demo mode — add OPENAI_API_KEY for vision analysis).";
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imageUrl = campaign.imageBase64
    ? `data:image/jpeg;base64,${campaign.imageBase64}`
    : campaign.imageUrl!;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Describe this Bangladeshi ad campaign visual for brand safety analysis. Include visible text, people, setting, tone, and potential cultural tripwires. Be concise.",
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content ?? "Visual analysis unavailable.";
}

export async function runAllAgents(
  campaign: CampaignInput,
  imageDescription: string
): Promise<AgentVerdict[]> {
  const query = `${campaign.slogan} ${campaign.brief ?? ""} ${campaign.brandValues ?? ""}`;
  const ragSamples = await retrieveBanglishExamples(query, 5);
  const ragExamples = formatRagExamples(ragSamples);
  const ragIds = ragSamples.map((s) => s.id);

  const useLiveAi = Boolean(process.env.ANTHROPIC_API_KEY);

  const results = await Promise.all(
    AGENTS.map(async (agent) => {
      const prompt = agent.buildPrompt({
        slogan: campaign.slogan,
        brandValues: campaign.brandValues ?? "Not specified",
        brief: campaign.brief ?? "Not specified",
        imageDescription,
        ragExamples,
      });

      try {
        if (!useLiveAi) {
          return mockVerdict(agent.id, agent.name, campaign, ragIds);
        }
        const raw = await runAgentWithClaude(prompt);
        return {
          agentId: agent.id,
          agentName: agent.name,
          severity: raw.severity,
          reasoning: raw.reasoning,
          sampleAttack: raw.sample_attack,
          citationIds: raw.citation_ids ?? ragIds,
        } satisfies AgentVerdict;
      } catch {
        return mockVerdict(agent.id, agent.name, campaign, ragIds);
      }
    })
  );

  return results;
}
