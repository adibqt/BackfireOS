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
} from "@/lib/agents/types";

type DbCampaign = {
  id: string;
  user_id: string;
  brand_id: string | null;
  slogan: string;
  brand_values: string | null;
  brief: string | null;
  image_url: string | null;
  image_description: string | null;
  created_at: string;
};

type DbBrand = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  stated_values: string | null;
  created_at: string;
};

function mapBrand(row: DbBrand): Brand {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    statedValues: row.stated_values ?? undefined,
    createdAt: row.created_at,
  };
}

type DbRun = {
  id: string;
  campaign_id: string;
  user_id: string;
  status: string;
  backfire_score: number | null;
  resonance: number | null;
  backfire_risk: number | null;
  memeability: number | null;
  brand_safety_drift: number | null;
  polarization_coefficient: number | null;
  image_warning: string | null;
  cultural_stress_map: CulturalStressMap | null;
  created_at: string;
};

type DbVerdict = {
  agent_id: string;
  agent_name: string;
  severity: number;
  reasoning: string;
  sample_attack: string;
  citation_ids: string[] | null;
  source: string | null;
};

type DbMeme = {
  caption: string;
  image_url: string | null;
  memeability_score: number | null;
  image_fallback: boolean | null;
};

function mapScores(row: DbRun): RunScores | undefined {
  if (row.backfire_score == null) return undefined;
  return {
    backfireScore: Number(row.backfire_score),
    resonance: Number(row.resonance),
    backfireRisk: Number(row.backfire_risk),
    memeability: Number(row.memeability),
    brandSafetyDrift: Number(row.brand_safety_drift),
    polarizationCoefficient: Number(row.polarization_coefficient),
  };
}

function mapCampaign(row: DbCampaign): CampaignInput & { id: string; imageUrl?: string } {
  return {
    id: row.id,
    slogan: row.slogan,
    brandId: row.brand_id ?? undefined,
    brandValues: row.brand_values ?? undefined,
    brief: row.brief ?? undefined,
    imageUrl: row.image_url ?? undefined,
    imageDescription: row.image_description ?? undefined,
  };
}

function mapVerdict(row: DbVerdict): AgentVerdict {
  return {
    agentId: row.agent_id as AgentVerdict["agentId"],
    agentName: row.agent_name,
    severity: row.severity,
    reasoning: row.reasoning,
    sampleAttack: row.sample_attack,
    citationIds: row.citation_ids ?? [],
    source: row.source === "mock" ? "mock" : "ai",
  };
}

function mapMeme(row: DbMeme): MemeResult {
  return {
    caption: row.caption,
    imageUrl: row.image_url ?? "",
    memeabilityScore: row.memeability_score ?? 0,
    imageFallback: row.image_fallback ?? undefined,
  };
}

export async function uploadCampaignImage(
  supabase: SupabaseClient,
  userId: string,
  campaignId: string,
  imageBase64: string
): Promise<string | undefined> {
  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match?.[1] ?? "image/jpeg";
  const base64 = match?.[2] ?? imageBase64;
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${userId}/${campaignId}.${ext}`;

  const buffer = Buffer.from(base64, "base64");
  const { error } = await supabase.storage
    .from("campaign-images")
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (error) {
    console.error("Campaign image upload failed:", error.message);
    return undefined;
  }

  const { data } = supabase.storage.from("campaign-images").getPublicUrl(path);
  return data.publicUrl;
}

async function persistMemeImage(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  index: number,
  imageUrl: string
): Promise<string> {
  if (!imageUrl.startsWith("data:")) return imageUrl;

  const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return imageUrl;

  const mime = match[1];
  const base64 = match[2];
  const ext = mime.includes("svg") ? "svg" : mime.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${userId}/${runId}/${index}.${ext}`;

  const buffer = Buffer.from(base64, "base64");
  const { error } = await supabase.storage
    .from("meme-images")
    .upload(path, buffer, { contentType: mime, upsert: true });

  if (error) {
    console.error("Meme image upload failed:", error.message);
    return imageUrl;
  }

  const { data } = supabase.storage.from("meme-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function dbCreateCampaignAndRun(
  supabase: SupabaseClient,
  userId: string,
  input: CampaignInput,
  imageUrl?: string
): Promise<{ campaignId: string; runId: string }> {
  const campaignId = crypto.randomUUID();
  const runId = crypto.randomUUID();

  const { error: campaignError } = await supabase.from("campaigns").insert({
    id: campaignId,
    user_id: userId,
    brand_id: input.brandId ?? null,
    slogan: input.slogan.trim(),
    brand_values: input.brandValues?.trim() || null,
    brief: input.brief?.trim() || null,
    image_url: imageUrl ?? input.imageUrl ?? null,
  });

  if (campaignError) throw new Error(campaignError.message);

  const { error: runError } = await supabase.from("simulation_runs").insert({
    id: runId,
    campaign_id: campaignId,
    user_id: userId,
    status: "pending",
  });

  if (runError) throw new Error(runError.message);

  return { campaignId, runId };
}

export async function dbGetRun(
  supabase: SupabaseClient,
  runId: string,
  userId?: string
): Promise<SimulationRun | null> {
  let query = supabase.from("simulation_runs").select("*").eq("id", runId);
  if (userId) query = query.eq("user_id", userId);

  const { data: runRow, error: runError } = await query.maybeSingle();

  if (runError) throw new Error(runError.message);
  if (!runRow) return null;

  const run = runRow as DbRun;

  const { data: campaignRow, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", run.campaign_id)
    .maybeSingle();

  if (campaignError) throw new Error(campaignError.message);

  const { data: verdictRows, error: verdictError } = await supabase
    .from("agent_verdicts")
    .select("agent_id, agent_name, severity, reasoning, sample_attack, citation_ids, source")
    .eq("run_id", runId);

  if (verdictError) throw new Error(verdictError.message);

  const { data: memeRows, error: memeError } = await supabase
    .from("memes")
    .select("caption, image_url, memeability_score, image_fallback")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (memeError) throw new Error(memeError.message);

  return {
    id: run.id,
    campaignId: run.campaign_id,
    status: run.status as SimulationRun["status"],
    scores: mapScores(run),
    campaign: campaignRow ? mapCampaign(campaignRow as DbCampaign) : undefined,
    verdicts: (verdictRows as DbVerdict[] | null)?.map(mapVerdict),
    memes: (memeRows as DbMeme[] | null)?.map(mapMeme),
    culturalStressMap: run.cultural_stress_map ?? undefined,
    imageWarning: run.image_warning ?? undefined,
    createdAt: run.created_at,
  };
}

export async function dbUpdateRunStatus(
  supabase: SupabaseClient,
  runId: string,
  status: SimulationRun["status"],
  userId?: string
): Promise<void> {
  let query = supabase.from("simulation_runs").update({ status }).eq("id", runId);
  if (userId) query = query.eq("user_id", userId);

  const { error } = await query;

  if (error) throw new Error(error.message);
}

export async function dbSaveImageDescription(
  supabase: SupabaseClient,
  campaignId: string,
  imageDescription: string
): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .update({ image_description: imageDescription })
    .eq("id", campaignId);

  if (error) throw new Error(error.message);
}

export async function dbSaveVerdicts(
  supabase: SupabaseClient,
  runId: string,
  verdicts: AgentVerdict[],
  userId?: string
): Promise<void> {
  await dbUpdateRunStatus(supabase, runId, "running", userId);

  const { error: deleteError } = await supabase
    .from("agent_verdicts")
    .delete()
    .eq("run_id", runId);

  if (deleteError) throw new Error(deleteError.message);

  if (verdicts.length === 0) return;

  const rows = verdicts.map((v) => ({
    run_id: runId,
    agent_id: v.agentId,
    agent_name: v.agentName,
    severity: v.severity,
    reasoning: v.reasoning,
    sample_attack: v.sampleAttack,
    citation_ids: v.citationIds,
    source: v.source,
  }));

  const { error } = await supabase.from("agent_verdicts").insert(rows);
  if (error) throw new Error(error.message);
}

export async function dbSaveStressMap(
  supabase: SupabaseClient,
  runId: string,
  stressMap: CulturalStressMap,
  userId?: string
): Promise<void> {
  let query = supabase
    .from("simulation_runs")
    .update({ cultural_stress_map: stressMap })
    .eq("id", runId);
  if (userId) query = query.eq("user_id", userId);

  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function dbCompleteRun(
  supabase: SupabaseClient,
  userId: string,
  runId: string,
  scores: RunScores,
  memes: MemeResult[],
  imageWarning?: string
): Promise<SimulationRun | null> {
  const { error: runError } = await supabase
    .from("simulation_runs")
    .update({
      status: "complete",
      backfire_score: scores.backfireScore,
      resonance: scores.resonance,
      backfire_risk: scores.backfireRisk,
      memeability: scores.memeability,
      brand_safety_drift: scores.brandSafetyDrift,
      polarization_coefficient: scores.polarizationCoefficient,
      image_warning: imageWarning ?? null,
    })
    .eq("id", runId)
    .eq("user_id", userId);

  if (runError) throw new Error(runError.message);

  const { error: deleteError } = await supabase
    .from("memes")
    .delete()
    .eq("run_id", runId);

  if (deleteError) throw new Error(deleteError.message);

  const persistedMemes: MemeResult[] = [];
  for (let i = 0; i < memes.length; i++) {
    const meme = memes[i];
    const imageUrl = await persistMemeImage(
      supabase,
      userId,
      runId,
      i,
      meme.imageUrl
    );
    persistedMemes.push({ ...meme, imageUrl });
  }

  if (persistedMemes.length > 0) {
    const rows = persistedMemes.map((m) => ({
      run_id: runId,
      caption: m.caption,
      image_url: m.imageUrl,
      memeability_score: m.memeabilityScore,
      image_fallback: m.imageFallback ?? false,
    }));

    const { error } = await supabase.from("memes").insert(rows);
    if (error) throw new Error(error.message);
  }

  return dbGetRun(supabase, runId, userId);
}

export async function dbListRuns(
  supabase: SupabaseClient,
  userId: string
): Promise<SimulationRun[]> {
  const { data, error } = await supabase
    .from("simulation_runs")
    .select(
      `id,
       campaign_id,
       status,
       created_at,
       backfire_score,
       resonance,
       backfire_risk,
       memeability,
       brand_safety_drift,
       polarization_coefficient,
       campaigns!campaign_id (id, slogan, brand_id, brand_values, brief, image_url, image_description),
       memes (caption)`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  if (!data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => {
    const c = row.campaigns;
    return {
      id: row.id,
      campaignId: row.campaign_id,
      status: row.status as SimulationRun["status"],
      scores: row.backfire_score != null ? {
        backfireScore: Number(row.backfire_score),
        resonance: Number(row.resonance),
        backfireRisk: Number(row.backfire_risk),
        memeability: Number(row.memeability),
        brandSafetyDrift: Number(row.brand_safety_drift),
        polarizationCoefficient: Number(row.polarization_coefficient),
      } : undefined,
      campaign: c ? {
        id: c.id,
        slogan: c.slogan,
        brandId: c.brand_id ?? undefined,
        brandValues: c.brand_values ?? undefined,
        brief: c.brief ?? undefined,
        imageUrl: c.image_url ?? undefined,
        imageDescription: c.image_description ?? undefined,
      } : undefined,
      memes: Array.isArray(row.memes)
        ? row.memes.map((m: { caption: string }) => ({
            caption: m.caption,
            imageUrl: "",
            memeabilityScore: 0,
            imageFallback: false,
          }))
        : undefined,
      createdAt: row.created_at,
    } satisfies SimulationRun;
  });
}

type DbPastCampaign = {
  slogan: string;
  brand_values: string | null;
  brief: string | null;
  created_at: string;
};

type DbPastCampaignRow = DbPastCampaign & { id: string };

export async function dbListPastCampaigns(
  supabase: SupabaseClient,
  brand: Brand,
  excludeCampaignId: string,
  limit: number
): Promise<PastCampaignSnapshot[]> {
  const { data: campaigns, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, slogan, brand_values, brief, created_at")
    .eq("brand_id", brand.id)
    .neq("id", excludeCampaignId)
    .gte("created_at", brand.createdAt)
    .order("created_at", { ascending: false });

  if (campaignError) throw new Error(campaignError.message);
  if (!campaigns?.length) return [];

  const campaignIds = (campaigns as DbPastCampaignRow[]).map((row) => row.id);
  const { data: runs, error: runError } = await supabase
    .from("simulation_runs")
    .select("campaign_id")
    .eq("status", "complete")
    .in("campaign_id", campaignIds);

  if (runError) throw new Error(runError.message);

  const completedIds = new Set(
    (runs ?? []).map((row) => row.campaign_id as string)
  );

  return (campaigns as DbPastCampaignRow[])
    .filter((row) => completedIds.has(row.id))
    .slice(0, limit)
    .map((row) => ({
      slogan: row.slogan,
      brandValues: row.brand_values ?? undefined,
      brief: row.brief ?? undefined,
      createdAt: row.created_at,
    }));
}

export async function dbCreateBrand(
  supabase: SupabaseClient,
  userId: string,
  input: { name: string; description?: string; statedValues?: string }
): Promise<Brand> {
  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("brands")
    .insert({
      id,
      user_id: userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      stated_values: input.statedValues?.trim() || null,
    })
    .select("id, user_id, name, description, stated_values, created_at")
    .single();

  if (error) throw new Error(error.message);
  return mapBrand(data as DbBrand);
}

export async function dbListBrands(
  supabase: SupabaseClient,
  userId: string
): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, user_id, name, description, stated_values, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];
  return (data as DbBrand[]).map(mapBrand);
}

export async function dbGetBrand(
  supabase: SupabaseClient,
  userId: string,
  brandId: string
): Promise<Brand | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, user_id, name, description, stated_values, created_at")
    .eq("user_id", userId)
    .eq("id", brandId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapBrand(data as DbBrand);
}

export async function dbDeleteBrand(
  supabase: SupabaseClient,
  userId: string,
  brandId: string
): Promise<void> {
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("user_id", userId)
    .eq("id", brandId);

  if (error) throw new Error(error.message);
}

export async function dbMarkRunFailed(
  supabase: SupabaseClient,
  runId: string,
  userId?: string
): Promise<void> {
  await dbUpdateRunStatus(supabase, runId, "failed", userId);
}

export async function dbDeleteRun(
  supabase: SupabaseClient,
  userId: string,
  runId: string
): Promise<boolean> {
  const run = await dbGetRun(supabase, runId, userId);
  if (!run) return false;

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", run.campaignId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return true;
}
