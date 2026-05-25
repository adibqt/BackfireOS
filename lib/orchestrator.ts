import type { AgentVerdict, CampaignInput } from "./agents/types";
import { AGENTS } from "./agents/definitions";
import { formatRagExamples, retrieveBanglishExamples } from "./rag";
import { generateJson, describeImage, isGeminiConfigured } from "./gemini";

interface RawVerdict {
  severity: number;
  reasoning: string;
  sample_attack: string;
  citation_ids?: string[];
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
  } else if (agentId === "brand_purist") {
    severity = 63;
  }

  const attacks: Record<AgentVerdict["agentId"], string> = {
    meme_engineer: `POV: ${campaign.slogan} — screenshot ready meme template`,
    regional_outsider: "Dhaka-centric ad, Sylhet ar Chittagong e resonate korbe na",
    cynical_journalist: `EXCLUSIVE: Brand claims '${campaign.slogan}' but customers disagree`,
    rival_brand: `Thanks for the free slogan — our reply meme drops in 1 hour`,
    regulatory_activist: "Essential Commodities Act risk: scarcity language detected",
    brand_purist: `'${campaign.slogan}' contradicts your stated brand values — this is the definition of value drift`,
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

async function runAgentWithGemini(prompt: string): Promise<RawVerdict> {
  const raw = await generateJson<RawVerdict>(prompt);
  return {
    severity: Math.max(0, Math.min(100, Math.round(raw.severity))),
    reasoning: raw.reasoning,
    sample_attack: raw.sample_attack,
    citation_ids: raw.citation_ids ?? [],
  };
}

export async function parseCampaignImage(
  campaign: CampaignInput
): Promise<string> {
  if (campaign.imageDescription) return campaign.imageDescription;
  if (!campaign.imageBase64 && !campaign.imageUrl) {
    return "No visual provided — text-only campaign analysis.";
  }

  if (!isGeminiConfigured()) {
    return "Uploaded campaign visual (demo mode — add GEMINI_API_KEY for vision analysis).";
  }

  if (campaign.imageBase64) {
    return describeImage(
      "Describe this Bangladeshi ad campaign visual for brand safety analysis. Include visible text, people, setting, tone, and potential cultural tripwires. Be concise.",
      campaign.imageBase64
    );
  }

  return "Image URL provided but vision requires base64 upload in this demo build.";
}

export async function runAllAgents(
  campaign: CampaignInput,
  imageDescription: string,
  pastCampaigns: string,
  brandContext: string
): Promise<AgentVerdict[]> {
  const query = `${campaign.slogan} ${campaign.brief ?? ""} ${campaign.brandValues ?? ""}`;
  const ragSamples = await retrieveBanglishExamples(query, 5);
  const ragExamples = formatRagExamples(ragSamples);
  const ragIds = ragSamples.map((s) => s.id);

  const useLiveAi = isGeminiConfigured();

  const results = await Promise.all(
    AGENTS.map(async (agent) => {
      const prompt = agent.buildPrompt({
        slogan: campaign.slogan,
        brandValues: campaign.brandValues ?? "Not specified",
        brief: campaign.brief ?? "Not specified",
        imageDescription,
        ragExamples,
        pastCampaigns,
        brandContext,
      });

      try {
        if (!useLiveAi) {
          return mockVerdict(agent.id, agent.name, campaign, ragIds);
        }
        const raw = await runAgentWithGemini(prompt);
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
