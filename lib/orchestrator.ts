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

/**
 * Per-critic lexicons of genuine risk signals. The heuristic fallback only
 * raises a critic's severity when the campaign text actually contains tokens in
 * that critic's lane — so a clean campaign stays low instead of being flagged as
 * dangerous by default.
 */
const RISK_LEXICONS: Record<AgentVerdict["agentId"], string[]> = {
  meme_engineer: ["meme", "cash", "viral", "trend", "swag", "vibe", "epic", "lit"],
  regional_outsider: ["dhaka", "elite", "premium", "urban", "city", "english only"],
  cynical_journalist: [
    "best", "guarantee", "guaranteed", "100%", "pure", "natural", "eco",
    "green", "save the", "world's", "number one",
  ],
  rival_brand: ["beat", "better than", "only", "unbeatable", "no.1", "#1"],
  regulatory_activist: [
    "price", "prices", "limited", "stock up", "hoard", "scarcity", "double",
    "triple", "buy now", "last chance", "before your neighbors", "religion",
    "halal", "haram",
  ],
  brand_purist: ["new direction", "rebrand", "bold", "aggressive", "rich", "luxury"],
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches a risk signal against the campaign text. Pure single words are matched
 * on word boundaries so "lit" does not fire inside "sustainability". Phrases and
 * symbol/number tokens ("stock up", "100%", "#1") fall back to substring match.
 */
function matchesSignal(text: string, token: string): boolean {
  if (/^[a-z]+$/.test(token)) {
    return new RegExp(`\\b${escapeRegExp(token)}\\b`).test(text);
  }
  return text.includes(token);
}

/**
 * Heuristic fallback used only when the live model is unavailable. Unlike the
 * model, it cannot truly judge a campaign, so it must NOT fabricate alarming
 * scores: it starts from a low neutral baseline and only climbs when the
 * campaign text contains concrete risk signals in that critic's lane. Runs built
 * this way are flagged with source: "mock" so the UI can mark them as degraded.
 */
function mockVerdict(
  agentId: AgentVerdict["agentId"],
  agentName: string,
  campaign: CampaignInput,
  ragIds: string[]
): AgentVerdict {
  const text = [campaign.slogan, campaign.brief, campaign.brandValues]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Low neutral baseline — "no evidence of a problem", not "looks fine, ship it".
  const BASELINE = 22;
  const PER_SIGNAL = 16;
  const hits = RISK_LEXICONS[agentId].filter((token) =>
    matchesSignal(text, token)
  ).length;
  const severity = Math.min(85, BASELINE + hits * PER_SIGNAL);

  const attacks: Record<AgentVerdict["agentId"], string> = {
    meme_engineer: `POV: ${campaign.slogan} — screenshot ready meme template`,
    regional_outsider: "Dhaka-centric ad, Sylhet ar Chittagong e resonate korbe na",
    cynical_journalist: `EXCLUSIVE: Brand claims '${campaign.slogan}' but customers disagree`,
    rival_brand: `Thanks for the free slogan — our reply meme drops in 1 hour`,
    regulatory_activist: "Essential Commodities Act risk: scarcity language detected",
    brand_purist: `'${campaign.slogan}' contradicts your stated brand values — this is the definition of value drift`,
  };

  const band =
    severity >= 61 ? "elevated" : severity >= 38 ? "some" : "little";
  return {
    agentId,
    agentName,
    severity,
    reasoning: `Heuristic fallback for ${agentName} (live model unavailable): a keyword scan of '${campaign.slogan}' found ${band} risk signal in this critic's lane. Re-run with the model available for a real judgment.`,
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
