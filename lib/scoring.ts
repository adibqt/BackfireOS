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

/**
 * Mean of the N highest values. Used to estimate the "worst credible outcome"
 * without letting a single outlier critic define it: averaging the top few
 * severities is robust to one lone harsh voice, yet still rises sharply when
 * several critics independently agree a campaign is dangerous.
 */
function meanOfTopN(values: number[], n: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => b - a);
  return mean(sorted.slice(0, Math.max(1, Math.min(n, sorted.length))));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
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

/**
 * Brand-safety drift = how far the campaign strays from the brand's identity.
 *
 * The Brand Purist agent already judges this *semantically* (against canonical
 * values and prior campaigns), so its severity is the primary signal. Lexical
 * Jaccard distance is kept only as a lightweight corroborating signal, and only
 * when brand values are actually supplied — a bag-of-words score alone would
 * flag aligned-but-differently-worded copy as a violation, so it can't stand on
 * its own. When no brand values exist we fall back to the Purist's judgment
 * (which still runs against in-campaign values) rather than comparing the text
 * to itself, which previously always reported "0 / perfectly safe".
 */
function computeBrandSafetyDrift(
  verdicts: AgentVerdict[],
  campaignText: string,
  brandValues: string
): number {
  const purist = verdicts.find((v) => v.agentId === "brand_purist");
  const hasBrandValues = brandValues.trim().length > 0;
  const lexical = hasBrandValues
    ? lexicalDrift(campaignText, brandValues)
    : null;

  if (purist && lexical != null) {
    return Math.round(purist.severity * 0.7 + lexical * 0.3);
  }
  if (purist) return purist.severity;
  if (lexical != null) return lexical;
  return 0;
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

  // Backfire *risk* = likelihood of a serious public backlash event. We estimate
  // it from the worst credible outcomes (mean of the two harshest critics)
  // rather than the single maximum: with six adversarial critics the raw max is
  // almost always high, so it flagged even benign campaigns as dangerous. The
  // top-2 mean is robust to one lone harsh voice while still climbing when
  // multiple critics agree.
  const backfireRisk = Math.round(meanOfTopN(severities, 2));

  // Memeability blends the meme specialist's judgment with the average score of
  // the generated parody concepts. Previously this took the max of the two,
  // which inflated the metric whenever either signal spiked.
  const memeSignal = memeScores.length > 0 ? mean(memeScores) : null;
  const engineerSignal = memeEngineer?.severity ?? null;
  const memeability = Math.round(
    engineerSignal != null && memeSignal != null
      ? engineerSignal * 0.6 + memeSignal * 0.4
      : engineerSignal ?? memeSignal ?? 0
  );
  const brandSafetyDrift = computeBrandSafetyDrift(
    verdicts,
    campaignText,
    brandValues
  );
  const polarizationCoefficient = Math.round(stdev(severities));

  return {
    backfireScore: clamp(backfireScore),
    resonance: clamp(resonance),
    backfireRisk: clamp(backfireRisk),
    memeability: clamp(memeability),
    brandSafetyDrift: clamp(brandSafetyDrift),
    polarizationCoefficient: clamp(polarizationCoefficient),
  };
}

export function riskLevel(score: number): "low" | "medium" | "high" {
  if (score < 40) return "low";
  if (score < 70) return "medium";
  return "high";
}
