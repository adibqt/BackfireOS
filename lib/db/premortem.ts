import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PreMortemIterationSummary,
  PreMortemReport,
} from "@/lib/premortem/types";

/**
 * Inserts a new pre-mortem iteration for a run. Every generation is retained as
 * its own row (history is never overwritten) so a team can browse the obituaries
 * and watch how they change across re-runs — mirroring the Boardroom model.
 *
 * The iteration number is derived from the count of prior rows for the run.
 * Returns the report with its persisted iteration filled in.
 */
export async function dbSavePreMortem(
  supabase: SupabaseClient,
  userId: string,
  report: PreMortemReport
): Promise<PreMortemReport> {
  const { data: prior, error: countError } = await supabase
    .from("premortem_reports")
    .select("iteration")
    .eq("run_id", report.runId)
    .eq("user_id", userId)
    .order("iteration", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (countError) throw new Error(countError.message);

  const iteration =
    ((prior as { iteration: number } | null)?.iteration ?? 0) + 1;
  const persisted: PreMortemReport = { ...report, iteration };

  const { error } = await supabase.from("premortem_reports").insert({
    id: persisted.id,
    run_id: persisted.runId,
    user_id: userId,
    iteration,
    slogan: persisted.campaignSlogan,
    failure_type: persisted.failureType,
    report: persisted,
    source: persisted.source,
  });

  if (error) throw new Error(error.message);
  return persisted;
}

/**
 * Lists every saved pre-mortem for a run, newest first, as full reports. The
 * payload is small (one document each), so we return the complete records rather
 * than a separate detail fetch.
 */
export async function dbListPreMortems(
  supabase: SupabaseClient,
  runId: string,
  userId: string
): Promise<PreMortemReport[]> {
  const { data, error } = await supabase
    .from("premortem_reports")
    .select("report, iteration, created_at")
    .eq("run_id", runId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!data) return [];
  return (data as { report: PreMortemReport }[]).map((d) => d.report);
}

/** Compact summary projection of a report for the iteration timeline. */
export function toPreMortemSummary(
  r: PreMortemReport
): PreMortemIterationSummary {
  return {
    id: r.id,
    iteration: r.iteration,
    slogan: r.campaignSlogan,
    branchId: r.branchId ?? null,
    branchLabel: r.branchLabel ?? null,
    failureType: r.failureType,
    headline: r.headline,
    worstSeverity: r.worstSeverity,
    source: r.source,
    createdAt: r.createdAt,
  };
}
