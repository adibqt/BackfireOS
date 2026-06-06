import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgentVerdict,
  Brand,
  CampaignInput,
  CulturalStressMap,
  MemeResult,
  PastCampaignSnapshot,
  RunScores,
  SimulationRun,
} from "./agents/types";
import { isSupabaseAuthConfigured } from "./supabase/client";
import {
  dbCompleteRun,
  dbCreateBrand,
  dbCreateCampaignAndRun,
  dbDeleteBrand,
  dbDeleteRun,
  dbGetBrand,
  dbGetCampaignSeed,
  dbGetRun,
  dbListBrands,
  dbListPastCampaigns,
  dbListRuns,
  dbMarkRunFailed,
  dbSaveImageDescription,
  dbSaveStressMap,
  dbSaveVerdicts,
  uploadCampaignImage,
} from "./db/runs";
import {
  runScoresToBranchScores,
  type CampaignSeed,
} from "./branches/types";
import type { BoardroomTranscript } from "./boardroom/types";
import { dbGetDebate, dbListDebates, dbSaveDebate } from "./db/boardroom";

declare global {
  var __backfireStore: {
    runs: Map<string, SimulationRun>;
    campaigns: Map<string, CampaignInput & { id: string; imageUrl?: string; createdAt: string }>;
    imageBase64: Map<string, string>;
    brands: Map<string, Brand>;
    // Every convened debate is retained (one entry per iteration), keyed by run.
    debates: Map<string, BoardroomTranscript[]>;
  } | undefined;
}

function getMemoryStore() {
  if (!globalThis.__backfireStore) {
    globalThis.__backfireStore = {
      runs: new Map(),
      campaigns: new Map(),
      imageBase64: new Map(),
      brands: new Map(),
      debates: new Map(),
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
  input: CampaignInput & { id: string; imageUrl?: string; createdAt: string }
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
    brandId: input.brandId,
    slogan: input.slogan.trim(),
    brandValues: input.brandValues?.trim(),
    brief: input.brief?.trim(),
    imageUrl: input.imageUrl,
    imageBase64: input.imageBase64,
    createdAt: new Date().toISOString(),
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

export async function saveStressMap(
  supabase: SupabaseClient | null,
  runId: string,
  stressMap: CulturalStressMap,
  userId?: string | null
): Promise<void> {
  if (supabase) {
    await dbSaveStressMap(supabase, runId, stressMap, userId ?? undefined);
    return;
  }
  memoryUpdateRun(runId, { culturalStressMap: stressMap });
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

export async function listPastCampaigns(
  supabase: SupabaseClient | null,
  brand: Brand | null,
  excludeCampaignId: string,
  limit: number
): Promise<PastCampaignSnapshot[]> {
  if (!brand) return [];

  if (supabase) {
    return dbListPastCampaigns(supabase, brand, excludeCampaignId, limit);
  }

  const completedCampaignIds = new Set(
    Array.from(getMemoryStore().runs.values())
      .filter((run) => run.status === "complete")
      .map((run) => run.campaignId)
  );

  const campaigns = Array.from(getMemoryStore().campaigns.values())
    .filter(
      (c) =>
        c.brandId === brand.id &&
        c.id !== excludeCampaignId &&
        c.createdAt >= brand.createdAt &&
        completedCampaignIds.has(c.id)
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);

  return campaigns.map((c) => ({
    slogan: c.slogan,
    brandValues: c.brandValues,
    brief: c.brief,
    createdAt: c.createdAt,
  }));
}

export async function createBrand(
  supabase: SupabaseClient | null,
  userId: string | null,
  input: { name: string; description?: string; statedValues?: string }
): Promise<Brand> {
  if (supabase && userId) {
    return dbCreateBrand(supabase, userId, input);
  }
  const brand: Brand = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    statedValues: input.statedValues?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  getMemoryStore().brands.set(brand.id, brand);
  return brand;
}

export async function listBrands(
  supabase: SupabaseClient | null,
  userId: string | null
): Promise<Brand[]> {
  if (supabase && userId) {
    return dbListBrands(supabase, userId);
  }
  return Array.from(getMemoryStore().brands.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

export async function getBrand(
  supabase: SupabaseClient | null,
  userId: string | null,
  brandId: string
): Promise<Brand | null> {
  if (supabase && userId) {
    return dbGetBrand(supabase, userId, brandId);
  }
  return getMemoryStore().brands.get(brandId) ?? null;
}

export async function deleteBrand(
  supabase: SupabaseClient | null,
  userId: string | null,
  brandId: string
): Promise<void> {
  if (supabase && userId) {
    await dbDeleteBrand(supabase, userId, brandId);
    return;
  }
  getMemoryStore().brands.delete(brandId);
  for (const [id, campaign] of getMemoryStore().campaigns) {
    if (campaign.brandId === brandId) {
      getMemoryStore().campaigns.set(id, { ...campaign, brandId: undefined });
    }
  }
}

export async function deleteRun(
  supabase: SupabaseClient | null,
  userId: string | null,
  runId: string
): Promise<boolean> {
  if (supabase && userId) {
    return dbDeleteRun(supabase, userId, runId);
  }
  const run = getMemoryStore().runs.get(runId);
  if (!run) return false;
  getMemoryStore().runs.delete(runId);
  getMemoryStore().campaigns.delete(run.campaignId);
  getMemoryStore().imageBase64.delete(run.campaignId);
  return true;
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

/**
 * Seed data for a campaign's root branch (its copy + real verdict if it has a
 * completed run). Used by the per-campaign branch tree. Returns null if the
 * campaign does not exist or is not the caller's.
 */
export async function getCampaignSeed(
  supabase: SupabaseClient | null,
  userId: string | null,
  campaignId: string
): Promise<CampaignSeed | null> {
  if (supabase && userId) {
    return dbGetCampaignSeed(supabase, userId, campaignId);
  }

  const campaign = memoryGetCampaign(campaignId);
  if (!campaign) return null;

  const seed: CampaignSeed = {
    slogan: campaign.slogan,
    brief: campaign.brief,
  };

  const run = Array.from(getMemoryStore().runs.values())
    .filter((r) => r.campaignId === campaignId && r.status === "complete")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  if (run?.scores) {
    seed.scores = runScoresToBranchScores(run.scores);
    let worst: AgentVerdict | null = null;
    for (const v of run.verdicts ?? []) {
      if (!worst || v.severity > worst.severity) worst = v;
    }
    if (worst) {
      seed.topCritic = {
        agentId: worst.agentId,
        agentName: worst.agentName,
        severity: worst.severity,
        reasoning: worst.reasoning,
        sampleAttack: worst.sampleAttack,
      };
    }
  }

  return seed;
}

/**
 * Persists a run's boardroom debate as a new iteration (history is never
 * overwritten). Falls back to the in-memory store (keyed by run id) when
 * Supabase is not configured, so the feature works end-to-end in demo mode.
 * Returns the saved transcript with its iteration number assigned.
 */
export async function saveDebate(
  supabase: SupabaseClient | null,
  userId: string | null,
  transcript: BoardroomTranscript
): Promise<BoardroomTranscript> {
  if (supabase && userId) {
    return dbSaveDebate(supabase, userId, transcript);
  }
  const list = getMemoryStore().debates.get(transcript.runId) ?? [];
  const persisted: BoardroomTranscript = { ...transcript, iteration: list.length + 1 };
  // Newest first, mirroring the DB ordering.
  getMemoryStore().debates.set(transcript.runId, [persisted, ...list]);
  return persisted;
}

/** The most recent debate iteration for a run. */
export async function getDebate(
  supabase: SupabaseClient | null,
  userId: string | null,
  runId: string
): Promise<BoardroomTranscript | null> {
  if (supabase && userId) {
    return dbGetDebate(supabase, runId, userId);
  }
  return getMemoryStore().debates.get(runId)?.[0] ?? null;
}

/** Every saved debate iteration for a run, newest first. */
export async function listDebates(
  supabase: SupabaseClient | null,
  userId: string | null,
  runId: string
): Promise<BoardroomTranscript[]> {
  if (supabase && userId) {
    return dbListDebates(supabase, runId, userId);
  }
  return getMemoryStore().debates.get(runId) ?? [];
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
