import type { AgentVerdict, RunScores } from "./agents/types";
import { AGENTS } from "./agents/definitions";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function lexicalDrift(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 50;
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = overlap / union;
  return Math.round((1 - jaccard) * 100);
}

export function computeScores(
  verdicts: AgentVerdict[],
  memeScores: number[],
  campaignText: string,
  brandValues: string
): RunScores {
  const weightedSum = verdicts.reduce((sum, v) => {
    const agent = AGENTS.find((a) => a.id === v.agentId);
    return sum + v.severity * (agent?.weight ?? 1);
  }, 0);
  const totalWeight = verdicts.reduce((sum, v) => {
    const agent = AGENTS.find((a) => a.id === v.agentId);
    return sum + (agent?.weight ?? 1);
  }, 0);

  const severities = verdicts.map((v) => v.severity);
  const memeEngineer = verdicts.find((v) => v.agentId === "meme_engineer");
  const audienceAgents = verdicts.filter((v) =>
    ["regional_outsider", "meme_engineer"].includes(v.agentId)
  );

  const backfireScore = Math.round(weightedSum / Math.max(totalWeight, 1));
  const resonance = Math.round(100 - mean(audienceAgents.map((v) => v.severity)));
  const backfireRisk = Math.max(...severities, 0);
  const memeability = Math.round(
    Math.max(memeEngineer?.severity ?? 0, mean(memeScores))
  );
  const brandSafetyDrift = lexicalDrift(campaignText, brandValues || campaignText);
  const polarizationCoefficient = Math.round(stdev(severities));

  return {
    backfireScore,
    resonance: Math.max(0, Math.min(100, resonance)),
    backfireRisk,
    memeability,
    brandSafetyDrift,
    polarizationCoefficient,
  };
}

export function riskLevel(score: number): "low" | "medium" | "high" {
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}
