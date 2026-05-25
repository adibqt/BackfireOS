export type AgentId =
  | "meme_engineer"
  | "regional_outsider"
  | "cynical_journalist"
  | "rival_brand"
  | "regulatory_activist";

export interface AgentVerdict {
  agentId: AgentId;
  agentName: string;
  severity: number;
  reasoning: string;
  sampleAttack: string;
  citationIds: string[];
}

export interface CampaignInput {
  slogan: string;
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

export interface SimulationRun {
  id: string;
  campaignId: string;
  status: "pending" | "running" | "complete" | "failed";
  scores?: RunScores;
  campaign?: CampaignInput & { id: string; imageUrl?: string };
  verdicts?: AgentVerdict[];
  memes?: MemeResult[];
  imageWarning?: string;
  createdAt: string;
}
