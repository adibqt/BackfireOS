import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentVerdict,
  CampaignInput,
  MemeResult,
  RunScores,
  SimulationRun,
} from "./agents/types";
import { isSupabaseAuthConfigured } from "./supabase/client";
import {
  dbCompleteRun,
  dbCreateCampaignAndRun,
  dbGetRun,
  dbListRuns,
  dbMarkRunFailed,
  dbSaveImageDescription,
  dbSaveVerdicts,
  uploadCampaignImage,
} from "./db/runs";

declare global {
  // eslint-disable-next-line no-var
  var __backfireStore: {
    runs: Map<string, SimulationRun>;
    campaigns: Map<string, CampaignInput & { id: string; imageUrl?: string }>;
    imageBase64: Map<string, string>;
  } | undefined;
}

function getMemoryStore() {
  if (!globalThis.__backfireStore) {
    globalThis.__backfireStore = {
      runs: new Map(),
      campaigns: new Map(),
      imageBase64: new Map(),
    };
  }
  return globalThis.__backfireStore;
}

export function isSupabaseConfigured(): boolean {
  return isSupabaseAuthConfigured();
}

export function saveCampaignImageBase64(campaignId: string, base64: string): void {
  getMemoryStore().imageBase64.set(campaignId, base64);
}

export function getCampaignImageBase64(campaignId: string): string | undefined {
  return getMemoryStore().imageBase64.get(campaignId);
}

function memorySaveCampaign(
  input: CampaignInput & { id: string; imageUrl?: string }
): void {
  getMemoryStore().campaigns.set(input.id, input);
}

function memoryGetCampaign(id: string) {
  return getMemoryStore().campaigns.get(id);
}

function memoryCreateRun(campaignId: string): SimulationRun {
  const run: SimulationRun = {
    id: crypto.randomUUID(),
    campaignId,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  getMemoryStore().runs.set(run.id, run);
  return run;
}

function memoryGetRun(id: string): SimulationRun | undefined {
  const run = getMemoryStore().runs.get(id);
  if (!run) return undefined;
  const campaign = getMemoryStore().campaigns.get(run.campaignId);
  const imageBase64 = getMemoryStore().imageBase64.get(run.campaignId);
  return {
    ...run,
    campaign: campaign
      ? { ...campaign, imageBase64: imageBase64 ?? campaign.imageBase64 }
      : undefined,
  };
}

function memoryUpdateRun(
  id: string,
  patch: Partial<SimulationRun>
): SimulationRun | undefined {
  const store = getMemoryStore();
  const existing = store.runs.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  store.runs.set(id, updated);
  const campaign = store.campaigns.get(updated.campaignId);
  const imageBase64 = store.imageBase64.get(updated.campaignId);
  return {
    ...updated,
    campaign: campaign
      ? { ...campaign, imageBase64: imageBase64 ?? campaign.imageBase64 }
      : undefined,
  };
}

export async function createCampaignAndRun(
  supabase: SupabaseClient | null,
  userId: string | null,
  input: CampaignInput
): Promise<{ campaignId: string; runId: string }> {
  if (supabase && userId) {
    const result = await dbCreateCampaignAndRun(
      supabase,
      userId,
      input,
      input.imageUrl
    );

    if (input.imageBase64) {
      saveCampaignImageBase64(result.campaignId, input.imageBase64);
      const dataUrl = input.imageBase64.startsWith("data:")
        ? input.imageBase64
        : `data:image/jpeg;base64,${input.imageBase64}`;
      const uploaded = await uploadCampaignImage(
        supabase,
        userId,
        result.campaignId,
        dataUrl
      );
      if (uploaded) {
        await supabase
          .from("campaigns")
          .update({ image_url: uploaded })
          .eq("id", result.campaignId);
      }
    }

    return result;
  }

  const campaignId = crypto.randomUUID();
  memorySaveCampaign({
    id: campaignId,
    slogan: input.slogan.trim(),
    brandValues: input.brandValues?.trim(),
    brief: input.brief?.trim(),
    imageUrl: input.imageUrl,
    imageBase64: input.imageBase64,
  });
  if (input.imageBase64) {
    saveCampaignImageBase64(campaignId, input.imageBase64);
  }
  const run = memoryCreateRun(campaignId);
  return { campaignId, runId: run.id };
}

export async function getRun(
  supabase: SupabaseClient | null,
  runId: string,
  userId?: string | null
): Promise<SimulationRun | null | undefined> {
  if (supabase) {
    return dbGetRun(supabase, runId, userId ?? undefined);
  }
  return memoryGetRun(runId) ?? null;
}

export async function saveVerdicts(
  supabase: SupabaseClient | null,
  runId: string,
  verdicts: AgentVerdict[],
  userId?: string | null
): Promise<void> {
  if (supabase) {
    await dbSaveVerdicts(supabase, runId, verdicts, userId ?? undefined);
    return;
  }
  memoryUpdateRun(runId, { verdicts, status: "running" });
}

export async function saveImageDescription(
  supabase: SupabaseClient | null,
  campaignId: string,
  imageDescription: string
): Promise<void> {
  if (supabase) {
    await dbSaveImageDescription(supabase, campaignId, imageDescription);
    return;
  }
  const campaign = memoryGetCampaign(campaignId);
  if (campaign) {
    memorySaveCampaign({ ...campaign, imageDescription });
  }
}

export async function completeRun(
  supabase: SupabaseClient | null,
  userId: string | null,
  runId: string,
  scores: RunScores,
  memes: MemeResult[],
  imageWarning?: string
): Promise<SimulationRun | null | undefined> {
  if (supabase && userId) {
    return dbCompleteRun(supabase, userId, runId, scores, memes, imageWarning);
  }
  return memoryUpdateRun(runId, {
    scores,
    memes,
    status: "complete",
    imageWarning,
  }) ?? null;
}

export async function listRuns(
  supabase: SupabaseClient | null,
  userId?: string | null
): Promise<SimulationRun[]> {
  if (supabase && userId) {
    return dbListRuns(supabase, userId);
  }
  return Array.from(getMemoryStore().runs.values()).map((run) => {
    const campaign = getMemoryStore().campaigns.get(run.campaignId);
    return { ...run, campaign };
  });
}

export async function markRunFailed(
  supabase: SupabaseClient | null,
  runId: string,
  userId?: string | null
): Promise<void> {
  if (supabase) {
    await dbMarkRunFailed(supabase, runId, userId ?? undefined);
    return;
  }
  memoryUpdateRun(runId, { status: "failed" });
}

export function attachImageBase64(
  run: SimulationRun,
  imageBase64?: string
): SimulationRun {
  if (!run.campaign || !imageBase64) return run;
  return {
    ...run,
    campaign: { ...run.campaign, imageBase64 },
  };
}
