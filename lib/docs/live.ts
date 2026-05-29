import "server-only";
import { createAdminClient, isSupabasePersistenceReady } from "@/lib/supabase/admin";
import { AGENTS } from "@/lib/agents/definitions";
import type { LiveStats } from "./types";

const AGENT_COUNT = AGENTS.length;

async function countTable(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  filter?: (q: any) => any // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<number> {
  if (!supabase) return 0;
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

/**
 * Live system snapshot for the /docs dashboard. Pulls aggregate counts from
 * Supabase (service role, so it spans the whole instance for a showcase view),
 * falls back to the in-memory store in demo mode, and finally to static figures.
 */
export async function getLiveStats(): Promise<LiveStats> {
  if (isSupabasePersistenceReady()) {
    const supabase = createAdminClient();
    if (supabase) {
      const [campaigns, runs, completedRuns, verdicts, brands, ragSamples] =
        await Promise.all([
          countTable(supabase, "campaigns"),
          countTable(supabase, "simulation_runs"),
          countTable(supabase, "simulation_runs", (q) => q.eq("status", "complete")),
          countTable(supabase, "agent_verdicts"),
          countTable(supabase, "brands"),
          countTable(supabase, "bnsentmix_samples"),
        ]);
      return {
        source: "database",
        campaigns,
        runs,
        completedRuns,
        verdicts,
        brands,
        ragSamples,
        agents: AGENT_COUNT,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  // Demo / memory mode.
  const mem = globalThis.__backfireStore;
  if (mem) {
    const runs = [...mem.runs.values()];
    return {
      source: "memory",
      campaigns: mem.campaigns.size,
      runs: runs.length,
      completedRuns: runs.filter((r) => r.status === "complete").length,
      verdicts: runs.reduce((n, r) => n + (r.verdicts?.length ?? 0), 0),
      brands: mem.brands.size,
      ragSamples: 50, // local Banglish fallback corpus
      agents: AGENT_COUNT,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    source: "static",
    campaigns: 0,
    runs: 0,
    completedRuns: 0,
    verdicts: 0,
    brands: 0,
    ragSamples: 50,
    agents: AGENT_COUNT,
    generatedAt: new Date().toISOString(),
  };
}
