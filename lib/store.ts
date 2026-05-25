import type {
  AgentVerdict,
  CampaignInput,
  MemeResult,
  RunScores,
  SimulationRun,
} from "./agents/types";

declare global {
  // eslint-disable-next-line no-var
  var __backfireStore: {
    runs: Map<string, SimulationRun>;
    campaigns: Map<string, CampaignInput & { id: string; imageUrl?: string }>;
  } | undefined;
}

function getStore() {
  if (!globalThis.__backfireStore) {
    globalThis.__backfireStore = {
      runs: new Map(),
      campaigns: new Map(),
    };
  }
  return globalThis.__backfireStore;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function saveCampaign(
  input: CampaignInput & { id: string; imageUrl?: string }
): void {
  getStore().campaigns.set(input.id, input);
}

export function getCampaign(id: string) {
  return getStore().campaigns.get(id);
}

export function createRun(campaignId: string): SimulationRun {
  const run: SimulationRun = {
    id: crypto.randomUUID(),
    campaignId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  getStore().runs.set(run.id, run);
  return run;
}

export function getRun(id: string): SimulationRun | undefined {
  const run = getStore().runs.get(id);
  if (!run) return undefined;
  const campaign = getStore().campaigns.get(run.campaignId);
  return { ...run, campaign };
}

export function updateRun(
  id: string,
  patch: Partial<SimulationRun>
): SimulationRun | undefined {
  const store = getStore();
  const existing = store.runs.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  store.runs.set(id, updated);
  return { ...updated, campaign: store.campaigns.get(updated.campaignId) };
}

export function saveVerdicts(id: string, verdicts: AgentVerdict[]): void {
  updateRun(id, { verdicts, status: "running" });
}

export function completeRun(
  id: string,
  scores: RunScores,
  memes: MemeResult[],
  imageWarning?: string
): SimulationRun | undefined {
  return updateRun(id, { scores, memes, status: "complete", imageWarning });
}
