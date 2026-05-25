import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, isSupabasePersistenceReady } from "@/lib/supabase/admin";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { getUser } from "@/lib/supabase/server";

export type DbContext =
  | { mode: "memory"; userId: null }
  | { mode: "db"; supabase: SupabaseClient; userId: string }
  | { mode: "unauthorized" }
  | { mode: "db_unconfigured" };

export async function resolveDbContext(): Promise<DbContext> {
  if (!isSupabaseAuthConfigured()) {
    return { mode: "memory", userId: null };
  }

  const user = await getUser();
  if (!user) {
    return { mode: "unauthorized" };
  }

  if (!isSupabasePersistenceReady()) {
    return { mode: "db_unconfigured" };
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return { mode: "db_unconfigured" };
  }

  return { mode: "db", supabase, userId: user.id };
}
