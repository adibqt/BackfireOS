import type { AgentVerdict, CampaignInput } from "./agents/types";
import { AGENTS, buildPanelPrompt } from "./agents/definitions";
import { formatRagExamples, retrieveBanglishExamples } from "./rag";
import { generateJson, describeImage, isGeminiConfigured } from "./gemini";

interface RawVerdict {
  agent_id?: string;
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
    source: "mock",
  };
}

/**
 * Validates a parsed model response before it is trusted. A response that is
 * syntactically valid JSON but missing/ill-typed fields (e.g. no `severity`)
 * must be rejected here — otherwise a non-numeric severity propagates as NaN
 * and poisons every downstream score.
 */
function isValidRawVerdict(raw: unknown): raw is RawVerdict {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  return (
    typeof r.severity === "number" &&
    Number.isFinite(r.severity) &&
    typeof r.reasoning === "string" &&
    r.reasoning.trim().length > 0 &&
    typeof r.sample_attack === "string" &&
    r.sample_attack.trim().length > 0
  );
}

function toVerdict(
  agentId: AgentVerdict["agentId"],
  agentName: string,
  raw: RawVerdict,
  ragIds: string[]
): AgentVerdict {
  const citationIds = Array.isArray(raw.citation_ids) ? raw.citation_ids : [];
  return {
    agentId,
    agentName,
    severity: Math.max(0, Math.min(100, Math.round(raw.severity))),
    reasoning: raw.reasoning,
    sampleAttack: raw.sample_attack,
    citationIds: citationIds.length > 0 ? citationIds : ragIds,
    source: "ai",
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

  const mockAll = () =>
    AGENTS.map((agent) =>
      mockVerdict(agent.id, agent.name, campaign, ragIds)
    );

  if (!isGeminiConfigured()) {
    return mockAll();
  }

  // One panel call returns all six verdicts. Firing six parallel calls would
  // instantly blow the free-tier per-minute request quota.
  const prompt = buildPanelPrompt({
    slogan: campaign.slogan,
    brandValues: campaign.brandValues ?? "Not specified",
    brief: campaign.brief ?? "Not specified",
    imageDescription,
    ragExamples,
    pastCampaigns,
    brandContext,
  });

  let panel: unknown;
  try {
    panel = await generateJson<unknown>(prompt);
  } catch (error) {
    console.error(
      "Red-team panel call failed — falling back to mock verdicts:",
      error instanceof Error ? error.message : error
    );
    return mockAll();
  }

  // Index the valid entries by agent_id so a single malformed/missing critic
  // only degrades that one verdict, not the whole panel.
  const byId = new Map<string, RawVerdict>();
  if (Array.isArray(panel)) {
    for (const item of panel) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as { agent_id?: unknown }).agent_id === "string" &&
        isValidRawVerdict(item)
      ) {
        byId.set((item as RawVerdict).agent_id as string, item as RawVerdict);
      }
    }
  }

  return AGENTS.map((agent) => {
    const raw = byId.get(agent.id);
    if (!raw) {
      console.error(
        `Agent ${agent.id} missing or malformed in panel response — using mock verdict.`
      );
      return mockVerdict(agent.id, agent.name, campaign, ragIds);
    }
    return toVerdict(agent.id, agent.name, raw, ragIds);
  });
}
