import "server-only";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { getDocsConfig } from "./config-store";
import { isAdminUser, resolveAccess } from "./access";
import type { AccessDecision } from "./types";

/** Full access decision for the current request (used by the /docs page). */
export async function getDocsAccess(token?: string | null): Promise<AccessDecision> {
  const authConfigured = isSupabaseAuthConfigured();
  const user = authConfigured ? await getUser() : null;
  const isAdmin = isAdminUser(user, { authConfigured });
  const config = await getDocsConfig();
  return resolveAccess(config, { isAdmin, token });
}

/** Just the admin gate (used by /docs/admin and the config API). */
export async function getDocsAdmin(): Promise<{ isAdmin: boolean; userId: string | null }> {
  const authConfigured = isSupabaseAuthConfigured();
  const user = authConfigured ? await getUser() : null;
  return {
    isAdmin: isAdminUser(user, { authConfigured }),
    userId: user?.id ?? null,
  };
}
