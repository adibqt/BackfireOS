export type AgentId =
  | "meme_engineer"
  | "regional_outsider"
  | "cynical_journalist"
  | "rival_brand"
  | "regulatory_activist"
  | "brand_purist";

export interface AgentVerdict {
  agentId: AgentId;
  agentName: string;
  severity: number;
  reasoning: string;
  sampleAttack: string;
  citationIds: string[];
}

export interface Brand {
  id: string;
  name: string;
  description?: string;
  statedValues?: string;
  createdAt: string;
}

export interface PastCampaignSnapshot {
  slogan: string;
  brandValues?: string;
  brief?: string;
  createdAt: string;
}

export interface CampaignInput {
  slogan: string;
  brandId?: string;
  brandValues?: string;
  brief?: string;
  imageUrl?: string;
  imageBase64?: string;
  imageDescription?: string;
}

export interface RunScores {
  backfireScore: number;
  resonance: number;
  backfireRisk: number;
  memeability: number;
  brandSafetyDrift: number;
  polarizationCoefficient: number;
}

export interface MemeResult {
  caption: string;
  imageUrl: string;
  memeabilityScore: number;
  imageFallback?: boolean;
}

export type MacroRegion = "south_asia" | "mena" | "sea";
export type TriggerType = "copy" | "visual";

export interface CulturalTrigger {
  type: TriggerType;
  text: string;
  reason: string;
}

export interface MarketStress {
  marketId: string;
  severity: number;
  summary: string;
  triggers: CulturalTrigger[];
}

export interface CulturalStressMap {
  markets: MarketStress[];
}

export interface SimulationRun {
  id: string;
  campaignId: string;
  status: "pending" | "running" | "complete" | "failed";
  scores?: RunScores;
  campaign?: CampaignInput & { id: string; imageUrl?: string };
  verdicts?: AgentVerdict[];
  memes?: MemeResult[];
  culturalStressMap?: CulturalStressMap;
  imageWarning?: string;
  createdAt: string;
}
