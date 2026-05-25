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

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function formatVerdicts(verdicts: AgentVerdict[]): string {
  return verdicts
    .map(
      (v) =>
        `[${v.agentName}] severity=${v.severity}\nReasoning: ${v.reasoning}\nSample attack: ${v.sampleAttack}`
    )
    .join("\n\n");
}

function normalizeStressMap(raw: RawStressMap): CulturalStressMap {
  const byId = new Map(
    raw.markets
      .filter((m) => MARKET_IDS.has(m.market_id))
      .map((m) => [
        m.market_id,
        {
          marketId: m.market_id,
          severity: clampSeverity(m.severity),
          summary: m.summary.trim(),
          triggers: (m.triggers ?? [])
            .filter((t) => t.type === "copy" || t.type === "visual")
            .map(
              (t): CulturalTrigger => ({
                type: t.type,
                text: t.text.trim(),
                reason: t.reason.trim(),
              })
            )
            .filter((t) => t.text && t.reason),
        } satisfies MarketStress,
      ])
  );

  const markets: MarketStress[] = MARKET_CATALOG.map((def) => {
    const existing = byId.get(def.id);
    if (existing) return existing;
    return {
      marketId: def.id,
      severity: 25,
      summary: "No major cultural tripwires detected for this market.",
      triggers: [],
    };
  });

  return { markets };
}

const REGION_TRIGGERS: Record<
  MacroRegion,
  Array<{ type: "copy" | "visual"; textTemplate: string; reason: string }>
> = {
  south_asia: [
    {
      type: "copy",
      textTemplate: "{slogan}",
      reason: "Metro-centric Banglish tone may not land in non-urban or non-Dhaka audiences.",
    },
    {
      type: "visual",
      textTemplate: "Urban elite casting in campaign visual",
      reason: "Class and regional representation gap typical in South Asian ad backlash.",
    },
  ],
  mena: [
    {
      type: "copy",
      textTemplate: "{slogan}",
      reason: "Casual or scarcity-driven copy can clash with conservative or regulatory-sensitive MENA norms.",
    },
    {
      type: "visual",
      textTemplate: "Mixed-gender or Westernized visual framing",
      reason: "Gender and modesty expectations vary sharply across MENA markets.",
    },
  ],
  sea: [
    {
      type: "copy",
      textTemplate: "{slogan}",
      reason: "English-heavy or US-centric phrasing often underperforms in local SEA social discourse.",
    },
    {
      type: "visual",
      textTemplate: "Non-local setting or skin-tone mismatch in hero visual",
      reason: "SEA audiences flag campaigns that feel imported rather than locally rooted.",
    },
  ],
};

function mockStressMap(
  campaign: CampaignInput,
  imageDescription: string,
  verdicts: AgentVerdict[]
): CulturalStressMap {
  const slogan = campaign.slogan;
  const lower = slogan.toLowerCase();
  const baseHash = hashString(slogan);
  const maxAgentSeverity = Math.max(...verdicts.map((v) => v.severity), 50);
  const hasVisual = Boolean(campaign.imageBase64 || campaign.imageUrl || imageDescription.length > 20);

  const keywordBoosts: Record<string, string[]> = {
    dhaka: ["sylhet", "chittagong", "rural_bd", "kolkata", "karachi"],
    price: ["karachi", "lahore", "cairo", "jakarta", "manila"],
    limited: ["riyadh", "dubai", "cairo", "karachi"],
    cash: ["dubai", "singapore", "riyadh"],
    bKash: ["mumbai", "delhi", "colombo"],
    meme: ["dhaka", "jakarta", "manila", "bangkok"],
  };

  const boosted = new Set<string>();
  for (const [kw, markets] of Object.entries(keywordBoosts)) {
    if (lower.includes(kw.toLowerCase())) {
      for (const m of markets) boosted.add(m);
    }
  }

  const markets: MarketStress[] = MARKET_CATALOG.map((def, i) => {
    const seed = (baseHash + i * 17) % 100;
    let severity = 30 + (seed % 35);

    if (boosted.has(def.id)) {
      severity = Math.max(severity, 55 + (seed % 30));
    }

    if (def.id === "dhaka" && lower.includes("dhaka")) {
      severity = Math.min(severity, 35);
    }

    severity = Math.min(100, Math.round(severity * (0.7 + maxAgentSeverity / 200)));

    const triggers: CulturalTrigger[] = [];
    if (severity >= 40) {
      const templates = REGION_TRIGGERS[def.region];
      const copyTrigger = templates[0];
      triggers.push({
        type: copyTrigger.type,
        text: copyTrigger.textTemplate.replace("{slogan}", slogan),
        reason: copyTrigger.reason,
      });

      if (hasVisual && severity >= 55) {
        const visualTrigger = templates[1];
        triggers.push({
          type: visualTrigger.type,
          text: visualTrigger.textTemplate,
          reason: visualTrigger.reason,
        });
      }
    }

    const market = getMarket(def.id)!;
    const summary =
      severity >= 70
        ? `High backlash risk in ${market.label} — campaign reads as culturally misaligned.`
        : severity >= 40
          ? `Moderate friction in ${market.label} — specific copy or visual elements may misfire.`
          : `Low risk in ${market.label} — no major tripwires flagged.`;

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
  if (!isGeminiConfigured()) {
    return mockStressMap(campaign, imageDescription, verdicts);
  }

  try {
    const raw = await generateJson<RawStressMap>(
      buildPrompt(campaign, imageDescription, verdicts)
    );
    return normalizeStressMap(raw);
  } catch {
    return mockStressMap(campaign, imageDescription, verdicts);
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
