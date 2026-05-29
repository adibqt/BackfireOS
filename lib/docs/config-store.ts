import "server-only";
import { createAdminClient, isSupabasePersistenceReady } from "@/lib/supabase/admin";
import type { DocsConfig, TeamMember } from "./types";

/** Default judging window: June 10 (00:00) → June 14 (23:59) Asia/Dhaka (+06:00), 2026. */
export const DEFAULT_WINDOW_START = "2026-06-10T00:00:00+06:00";
export const DEFAULT_WINDOW_END = "2026-06-14T23:59:59+06:00";

export const DEFAULT_TEAM: TeamMember[] = [
  {
    id: "lead",
    name: "Adib Rahman",
    role: "Founder · Full-stack & Systems",
    email: "adib@backfire.os",
  },
  {
    id: "ai",
    name: "AI / RAG Engineer",
    role: "Banglish RAG · Agent orchestration",
    email: "ai@backfire.os",
  },
  {
    id: "design",
    name: "Product Designer",
    role: "UX · Data viz · Brand",
    email: "design@backfire.os",
  },
];

export const DEFAULT_DOCS_CONFIG: DocsConfig = {
  visibility: "scheduled",
  startsAt: DEFAULT_WINDOW_START,
  endsAt: DEFAULT_WINDOW_END,
  previewToken: null,
  teamName: "Backfire OS",
  team: DEFAULT_TEAM,
  contentOverrides: {},
  updatedAt: null,
  updatedBy: null,
};

// In-memory fallback for demo mode (no Supabase persistence configured).
declare global {
  var __backfireDocsConfig: DocsConfig | undefined;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromRow(row: any): DocsConfig {
  return {
    visibility: row.visibility ?? "scheduled",
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    previewToken: row.preview_token ?? null,
    teamName: row.team_name ?? DEFAULT_DOCS_CONFIG.teamName,
    team: Array.isArray(row.team) && row.team.length ? (row.team as TeamMember[]) : DEFAULT_TEAM,
    contentOverrides: (row.content_overrides as Record<string, string>) ?? {},
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Read the docs config (Supabase when persistence is ready, else in-memory fallback). */
export async function getDocsConfig(): Promise<DocsConfig> {
  if (isSupabasePersistenceReady()) {
    const supabase = createAdminClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("docs_config")
        .select("*")
        .eq("id", "singleton")
        .maybeSingle();
      if (!error && data) return fromRow(data);
      // No row yet → seed defaults so the admin panel has something to edit.
      if (!error && !data) {
        await supabase.from("docs_config").upsert({
          id: "singleton",
          visibility: DEFAULT_DOCS_CONFIG.visibility,
          starts_at: DEFAULT_DOCS_CONFIG.startsAt,
          ends_at: DEFAULT_DOCS_CONFIG.endsAt,
          team: DEFAULT_DOCS_CONFIG.team,
        });
        return { ...DEFAULT_DOCS_CONFIG };
      }
      // On error fall through to memory so /docs never hard-crashes.
    }
  }
  return globalThis.__backfireDocsConfig ?? { ...DEFAULT_DOCS_CONFIG };
}

/** Persist a partial update. `userId` is recorded as the editor when in DB mode. */
export async function saveDocsConfig(
  patch: Partial<DocsConfig>,
  userId: string | null
): Promise<DocsConfig> {
  const current = await getDocsConfig();
  const next: DocsConfig = {
    ...current,
    ...patch,
    team: patch.team ?? current.team,
    contentOverrides: patch.contentOverrides ?? current.contentOverrides,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };

  if (isSupabasePersistenceReady()) {
    const supabase = createAdminClient();
    if (supabase) {
      const { error } = await supabase.from("docs_config").upsert({
        id: "singleton",
        visibility: next.visibility,
        starts_at: next.startsAt,
        ends_at: next.endsAt,
        preview_token: next.previewToken,
        team_name: next.teamName,
        team: next.team,
        content_overrides: next.contentOverrides,
        updated_at: next.updatedAt,
        updated_by: userId,
      });
      if (error) throw new Error(error.message);
      return next;
    }
  }

  globalThis.__backfireDocsConfig = next;
  return next;
}
