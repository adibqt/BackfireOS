import type {
  AgentVerdict,
  CampaignInput,
  CulturalStressMap,
  CulturalTrigger,
  MacroRegion,
  MarketStress,
} from "./agents/types";
import {
  formatCatalogForPrompt,
  getMarket,
  MARKET_CATALOG,
  MARKET_IDS,
} from "./markets/catalog";
import {
  buildMarketTriggers,
  hashString,
  MARKET_PROFILES,
  pickVariant,
} from "./markets/profiles";
import { generateJson, isGeminiConfigured } from "./gemini";

interface RawStressMap {
  markets: Array<{
    market_id: string;
    severity: number;
    summary: string;
    triggers?: Array<{
      type: "copy" | "visual";
      text: string;
      reason: string;
    }>;
  }>;
}

function clampSeverity(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatVerdicts(verdicts: AgentVerdict[]): string {
  return verdicts
    .map(
      (v) =>
        `[${v.agentName}] severity=${v.severity}\nReasoning: ${v.reasoning}\nSample attack: ${v.sampleAttack}`
    )
    .join("\n\n");
}

function normalizeStressMap(
  raw: RawStressMap,
  fallback: CulturalStressMap
): CulturalStressMap {
  const fallbackById = new Map(fallback.markets.map((m) => [m.marketId, m]));

  const byId = new Map(
    raw.markets
      .filter((m) => MARKET_IDS.has(m.market_id))
      .map((m) => {
        const cleaned: MarketStress = {
          marketId: m.market_id,
          severity: clampSeverity(m.severity),
          summary: (m.summary ?? "").trim(),
          triggers: (m.triggers ?? [])
            .filter((t) => t && (t.type === "copy" || t.type === "visual"))
            .map(
              (t): CulturalTrigger => ({
                type: t.type,
                text: (t.text ?? "").trim(),
                reason: (t.reason ?? "").trim(),
              })
            )
            .filter((t) => t.text && t.reason),
        };

        // If the LLM left summary blank OR returned the same generic
        // "campaign reads as culturally misaligned" line for many markets,
        // splice in the rich market-specific summary from our profile.
        const fb = fallbackById.get(m.market_id);
        if (fb && (!cleaned.summary || cleaned.summary.length < 24)) {
          cleaned.summary = fb.summary;
        }

        // If the LLM omitted triggers for a flagged market, use ours.
        if (cleaned.severity >= 40 && cleaned.triggers.length === 0 && fb) {
          cleaned.triggers = fb.triggers;
        }

        return [m.market_id, cleaned] as const;
      })
  );

  const markets: MarketStress[] = MARKET_CATALOG.map((def) => {
    const existing = byId.get(def.id);
    if (existing) return existing;
    // Market missing from LLM response — use the profile-driven fallback
    // (rich summary + triggers) instead of a generic placeholder.
    return (
      fallbackById.get(def.id) ?? {
        marketId: def.id,
        severity: 25,
        summary: "No major cultural tripwires detected for this market.",
        triggers: [],
      }
    );
  });

  return { markets };
}

function severityTier(severity: number): "high" | "medium" | "low" {
  if (severity >= 70) return "high";
  if (severity >= 40) return "medium";
  return "low";
}

function mockStressMap(
  campaign: CampaignInput,
  imageDescription: string,
  verdicts: AgentVerdict[]
): CulturalStressMap {
  const slogan = campaign.slogan;
  const lower = slogan.toLowerCase();
  const baseHash = hashString(slogan);
  const maxAgentSeverity = Math.max(...verdicts.map((v) => v.severity), 50);
  const hasVisual = Boolean(
    campaign.imageBase64 || campaign.imageUrl || imageDescription.length > 20
  );

  const markets: MarketStress[] = MARKET_CATALOG.map((def, i) => {
    const profile = MARKET_PROFILES[def.id];
    // Per-market deterministic seed — same campaign, same market, same result.
    const marketSeed = hashString(`${slogan}::${def.id}`);
    const baseRoll = (baseHash + i * 17) % 100;

    // Base severity floats in a [25, 60] band — different per market.
    let severity = 25 + (baseRoll % 35);

    // Profile-driven keyword boost — uses the market's own hotKeywords list.
    if (profile?.hotKeywords) {
      const matches = profile.hotKeywords.filter((kw) =>
        lower.includes(kw.toLowerCase())
      ).length;
      if (matches > 0) {
        severity = Math.max(severity, 55 + Math.min(25, matches * 10));
      }
    }

    // Special case: Dhaka-self-reference dampens its own Dhaka backlash.
    if (def.id === "dhaka" && lower.includes("dhaka")) {
      severity = Math.min(severity, 35);
    }

    // Modulate by the red-team's peak severity — bad agent verdicts elevate
    // every market, but not uniformly.
    severity = Math.min(
      100,
      Math.round(severity * (0.7 + maxAgentSeverity / 200))
    );

    // Per-market summary — picked from that market's own pool.
    const tier = severityTier(severity);
    const market = getMarket(def.id)!;
    const summary = profile
      ? pickVariant(profile.summaries[tier], marketSeed)
      : tier === "high"
        ? `High backlash risk in ${market.label}.`
        : tier === "medium"
          ? `Moderate friction in ${market.label}.`
          : `Low risk in ${market.label} — no major tripwires.`;

    // Per-market triggers — pulled from that market's own archetypes.
    const triggers: CulturalTrigger[] = profile
      ? buildMarketTriggers(profile, {
          slogan,
          severity,
          hasVisual,
          seed: marketSeed,
        })
      : [];

    return { marketId: def.id, severity, summary, triggers };
  });

  return { markets };
}

function buildPrompt(
  campaign: CampaignInput,
  imageDescription: string,
  verdicts: AgentVerdict[]
): string {
  return `You are a cultural stress-testing analyst for brands operating across South Asia, MENA, and Southeast Asia.

Given a campaign and red-team agent verdicts, score how badly the creative misfires in EACH market below.
Use local cultural, linguistic, religious, regulatory, and class/dialect context — not US-centric assumptions.

Return ONLY valid JSON (no markdown) with this exact shape:
{
  "markets": [
    {
      "market_id": "<id from catalog>",
      "severity": <integer 0-100>,
      "summary": "<one sentence>",
      "triggers": [
        { "type": "copy" | "visual", "text": "<exact slogan line or visual element>", "reason": "<why it misfires here>" }
      ]
    }
  ]
}

Rules:
- Include EVERY market from the catalog exactly once (use market_id values exactly).
- severity 0 = no issue, 100 = severe backlash / boycott risk.
- Include triggers only when severity >= 40; omit triggers array or use [] for low-risk markets.
- Flag specific copy lines from the slogan/brief AND specific visual elements from the image description.
- Synthesize signals from all agent verdicts — regional dialect, religion, labor, memeability, regulatory.

CRITICAL — every market's summary and reasoning MUST cite that market's specific context.
NEVER write the same sentence with just the city name swapped (e.g. do NOT write
"Moderate friction in <city> — specific copy or visual elements may misfire" for multiple markets).
Each summary must reference the market's actual local triggers: language register (Banglish vs Urdu vs
Darija), religious-conservative segment, regulatory regime (POFMA, MUI, Hai'a), political fault-line
(Bumi/Chinese/Indian, Sinhala/Tamil, Mohajir/Sindhi), economic moment (Pakistan inflation crisis,
Sri Lanka post-Aragalaya, Egypt pound devaluation, Turkey lira volatility, OFW remittance lens), or
meme culture (Trolls Dhaka, Mumbai Bollywood meme machine, kreng jai Thai politeness norm).
If two markets get similar severities, their summaries must STILL read differently because the
local reasons differ.

Market catalog:
${formatCatalogForPrompt()}

Campaign:
Slogan: ${campaign.slogan}
Brand values: ${campaign.brandValues ?? "Not specified"}
Brief: ${campaign.brief ?? "Not specified"}
Visual: ${imageDescription}

Agent verdicts:
${formatVerdicts(verdicts)}`;
}

export async function generateCulturalStressMap(
  campaign: CampaignInput,
  imageDescription: string,
  verdicts: AgentVerdict[]
): Promise<CulturalStressMap> {
  const fallback = mockStressMap(campaign, imageDescription, verdicts);

  if (!isGeminiConfigured()) {
    return fallback;
  }

  try {
    const raw = await generateJson<RawStressMap>(
      buildPrompt(campaign, imageDescription, verdicts)
    );
    return normalizeStressMap(raw, fallback);
  } catch {
    return fallback;
  }
}

export function countFlaggedMarkets(map: CulturalStressMap): number {
  return map.markets.filter((m) => m.severity >= 40).length;
}

export function topRiskMarkets(
  map: CulturalStressMap,
  limit = 3
): MarketStress[] {
  return [...map.markets]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, limit);
}

export function highestRiskRegion(map: CulturalStressMap): MacroRegion {
  const avgByRegion: Record<MacroRegion, { sum: number; count: number }> = {
    south_asia: { sum: 0, count: 0 },
    mena: { sum: 0, count: 0 },
    sea: { sum: 0, count: 0 },
  };

  for (const stress of map.markets) {
    const def = getMarket(stress.marketId);
    if (!def) continue;
    avgByRegion[def.region].sum += stress.severity;
    avgByRegion[def.region].count += 1;
  }

  let best: MacroRegion = "south_asia";
  let bestAvg = -1;
  for (const region of ["south_asia", "mena", "sea"] as MacroRegion[]) {
    const { sum, count } = avgByRegion[region];
    const avg = count > 0 ? sum / count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = region;
    }
  }
  return best;
}
