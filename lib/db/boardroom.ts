import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BoardroomIterationSummary,
  BoardroomTranscript,
} from "@/lib/boardroom/types";

/**
 * Inserts a new debate iteration for a run. Unlike the original "one debate per
 * run" upsert, every convened debate is retained as its own row so the boardroom
 * can present a browsable timeline of iterations (and debates run against
 * different counterfactual slogan variants).
 *
 * The iteration number is derived from the count of prior rows for the run.
 * Returns the transcript with its persisted id + iteration filled in.
 */
export async function dbSaveDebate(
  supabase: SupabaseClient,
  userId: string,
  transcript: BoardroomTranscript
): Promise<BoardroomTranscript> {
  // Next iteration = (current max for this run) + 1.
  const { data: prior, error: countError } = await supabase
    .from("boardroom_debates")
    .select("iteration")
    .eq("run_id", transcript.runId)
    .eq("user_id", userId)
    .order("iteration", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (countError) throw new Error(countError.message);

  const iteration = ((prior as { iteration: number } | null)?.iteration ?? 0) + 1;
  const persisted: BoardroomTranscript = { ...transcript, iteration };

  const { error } = await supabase.from("boardroom_debates").insert({
    id: persisted.id,
    run_id: persisted.runId,
    user_id: userId,
    iteration,
    slogan: persisted.campaignSlogan,
    branch_id: persisted.branchId ?? null,
    branch_label: persisted.branchLabel ?? null,
    transcript: persisted,
    decision: persisted.synthesis.decision,
    converged: persisted.converged,
    degraded: persisted.degraded,
  });

  if (error) throw new Error(error.message);
  return persisted;
}

/** The most recent debate iteration for a run (or null if none yet). */
export async function dbGetDebate(
  supabase: SupabaseClient,
  runId: string,
  userId: string
): Promise<BoardroomTranscript | null> {
  const { data, error } = await supabase
    .from("boardroom_debates")
    .select("transcript")
    .eq("run_id", runId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return (data as { transcript: BoardroomTranscript }).transcript;
}

/**
 * Lists every saved debate iteration for a run, newest first, as full
 * transcripts. The boardroom timeline shows the summary metadata and loads the
 * full transcript on demand — the payload is small (a handful of short replies),
 * so we return the complete records rather than a separate detail fetch.
 */
export async function dbListDebates(
  supabase: SupabaseClient,
  runId: string,
  userId: string
): Promise<BoardroomTranscript[]> {
  const { data, error } = await supabase
    .from("boardroom_debates")
    .select("transcript, iteration, created_at")
    .eq("run_id", runId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];
  return (data as { transcript: BoardroomTranscript }[]).map((d) => d.transcript);
}

/** Compact summary projection of a transcript for the timeline list. */
export function toIterationSummary(
  t: BoardroomTranscript
): BoardroomIterationSummary {
  return {
    id: t.id,
    iteration: t.iteration,
    slogan: t.campaignSlogan,
    branchId: t.branchId ?? null,
    branchLabel: t.branchLabel ?? null,
    decision: t.synthesis.decision,
    confidence: t.synthesis.confidence,
    rounds: t.rounds,
    converged: t.converged,
    degraded: t.degraded,
    createdAt: t.createdAt,
  };
}
