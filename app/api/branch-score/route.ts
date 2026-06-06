import { NextRequest } from "next/server";
import { z } from "zod";
import { runAllAgents } from "@/lib/orchestrator";
import { computeScores } from "@/lib/scoring";
import { formatBrandContext } from "@/lib/agents/definitions";
import { isGeminiConfigured } from "@/lib/gemini";
import type { AgentVerdict, CampaignInput } from "@/lib/agents/types";
import { scoreBranch } from "@/lib/branches/heuristic";
import { branchContentKey, runScoresToBranchScores } from "@/lib/branches/types";
import type {
  BranchScoreResponse,
  TopCritic,
} from "@/lib/branches/types";
import { getCached, hashContent, setCached } from "@/lib/branches/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const BranchSchema = z.object({
  slogan: z.string().max(400),
  cast: z.string().max(400),
  tagline: z.string().max(400),
  cta: z.string().max(400),
  riskyLine: z.string().max(400),
  tone: z.enum(["playful", "formal", "aggressive", "warm"]),
  language: z.enum(["en", "bn", "mixed"]),
});

type ScoredBranch = z.infer<typeof BranchSchema>;

const LANGUAGE_LABEL: Record<ScoredBranch["language"], string> = {
  en: "English",
  bn: "Bangla",
  mixed: "Banglish (Bangla–English code-mix)",
};

/**
 * Projects a campaign variant onto the engine's CampaignInput. The red-team
 * panel only reads slogan / brief / brandValues / imageDescription, so every
 * other lever a designer can pull (cast, tone, language, CTA, the risky line
 * under test) is woven into the brief and the visual description — otherwise
 * swapping the cast or dropping a provocation would not move the AI score.
 */
function toCampaignInput(b: ScoredBranch): {
  campaign: CampaignInput;
  imageDescription: string;
  campaignText: string;
} {
  const briefParts = [
    `Tagline: ${b.tagline || "(none)"}.`,
    `Call to action: ${b.cta || "(none)"}.`,
    `Cast / talent direction: ${b.cast || "(unspecified)"}.`,
    `Intended tone: ${b.tone}.`,
    `Copy language: ${LANGUAGE_LABEL[b.language]}.`,
  ];
  if (b.riskyLine.trim()) {
    briefParts.push(`Provocative line under test: "${b.riskyLine.trim()}".`);
  }

  const imageDescription = `No uploaded visual — counterfactual text variant. Casting direction: ${
    b.cast || "unspecified"
  }. Treat the cast as the on-screen talent for cultural read.`;

  const campaignText = [b.slogan, b.tagline, b.cta, b.riskyLine]
    .filter(Boolean)
    .join(" ");

  return {
    campaign: {
      slogan: b.slogan,
      brief: briefParts.join(" "),
      brandValues: "",
    },
    imageDescription,
    campaignText,
  };
}

function pickTopCritic(verdicts: AgentVerdict[]): TopCritic | null {
  if (verdicts.length === 0) return null;
  const worst = verdicts.reduce((a, b) => (b.severity > a.severity ? b : a));
  return {
    agentId: worst.agentId,
    agentName: worst.agentName,
    severity: worst.severity,
    reasoning: worst.reasoning,
    sampleAttack: worst.sampleAttack,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  let parsed: ScoredBranch;
  try {
    const body = await request.json();
    parsed = BranchSchema.parse(body?.branch ?? body);
  } catch {
    return json({ error: "Invalid branch payload" }, 400);
  }

  const contentHash = hashContent(branchContentKey(parsed));

  // Incremental-evaluation short-circuit: identical content (e.g. an unedited
  // fork, or copy reverted to a prior value) reuses the stored verdict.
  const cached = getCached(contentHash);
  if (cached) {
    return json({ ...cached, cached: true } satisfies BranchScoreResponse);
  }

  // No model configured anywhere — return the same deterministic estimate the
  // client renders live, so the contract still holds offline/in demo mode.
  if (!isGeminiConfigured()) {
    const payload: Omit<BranchScoreResponse, "cached"> = {
      scores: scoreBranch(parsed),
      source: "heuristic",
      contentHash,
      topCritic: null,
    };
    setCached(contentHash, payload);
    return json({ ...payload, cached: false } satisfies BranchScoreResponse);
  }

  const { campaign, imageDescription, campaignText } = toCampaignInput(parsed);

  let verdicts: AgentVerdict[];
  try {
    verdicts = await runAllAgents(
      campaign,
      imageDescription,
      formatPastCampaignsEmpty(),
      formatBrandContext(null)
    );
  } catch (error) {
    // Hard failure (network, etc.) — degrade to the heuristic rather than 500,
    // so the live tree keeps moving.
    console.error(
      "branch-score panel failed, using heuristic:",
      error instanceof Error ? error.message : error
    );
    const payload: Omit<BranchScoreResponse, "cached"> = {
      scores: scoreBranch(parsed),
      source: "heuristic",
      contentHash,
      topCritic: null,
    };
    return json({ ...payload, cached: false } satisfies BranchScoreResponse);
  }

  const scores = runScoresToBranchScores(
    computeScores(verdicts, [], campaignText, campaign.brandValues ?? "")
  );
  // If the engine itself fell back (no usable model output), every verdict is
  // tagged "mock" — surface that honestly instead of claiming an AI judgment.
  const source = verdicts.every((v) => v.source === "mock") ? "mock" : "ai";

  const payload: Omit<BranchScoreResponse, "cached"> = {
    scores,
    source,
    contentHash,
    topCritic: pickTopCritic(verdicts),
  };
  // Only memoize genuine AI verdicts; a transient mock shouldn't poison the
  // cache and deny a real judgment on the next try.
  if (source === "ai") setCached(contentHash, payload);

  return json({ ...payload, cached: false } satisfies BranchScoreResponse);
}

/** The Brand Purist's history slot — branches carry no prior-campaign chain. */
function formatPastCampaignsEmpty(): string {
  return "No prior completed simulations for this variant — judge against the campaign's own values only. Do not reference numbered prior campaigns ([1], [2], etc.).";
}
