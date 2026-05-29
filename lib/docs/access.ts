import type { User } from "@supabase/supabase-js";
import type { AccessDecision, AccessReason, DocsConfig } from "./types";

/**
 * Admin detection. Backfire OS has no first-class role table, so we recognise admins via:
 *  1. Supabase `app_metadata.role` / `user_metadata.role` in {admin, super_admin}
 *  2. An email allowlist in the `DOCS_ADMIN_EMAILS` env var (comma-separated)
 *
 * `user` is null in demo/memory mode (no Supabase auth). In that case the app is a
 * single-user local instance, so we treat the operator as an admin to keep /docs usable.
 */
export function adminEmails(): string[] {
  return (process.env.DOCS_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

const ADMIN_ROLES = new Set(["admin", "super_admin", "superadmin"]);

export function isAdminUser(
  user: User | null,
  { authConfigured }: { authConfigured: boolean }
): boolean {
  // Local demo (no Supabase auth) → operator controls everything.
  if (!authConfigured) return true;
  if (!user) return false;

  const appRole = (user.app_metadata as { role?: string } | undefined)?.role;
  const metaRole = (user.user_metadata as { role?: string } | undefined)?.role;
  if (
    (appRole && ADMIN_ROLES.has(appRole.toLowerCase())) ||
    (metaRole && ADMIN_ROLES.has(metaRole.toLowerCase()))
  ) {
    return true;
  }

  const email = user.email?.toLowerCase();
  return Boolean(email && adminEmails().includes(email));
}

/**
 * Pure resolution of whether /docs should be served, given the persisted config,
 * the viewer's admin status, an optional preview token, and the current time.
 */
export function resolveAccess(
  config: DocsConfig,
  {
    isAdmin,
    token,
    now = new Date(),
  }: { isAdmin: boolean; token?: string | null; now?: Date }
): AccessDecision {
  const nowMs = now.getTime();
  const nowIso = now.toISOString();

  const decide = (allowed: boolean, reason: AccessReason, preview: boolean) =>
    ({ allowed, isAdmin, preview, reason, config, now: nowIso } satisfies AccessDecision);

  // Admins always get through — they need to preview/edit regardless of window.
  if (isAdmin) {
    const publiclyLive = isPubliclyLive(config, nowMs);
    return decide(true, "admin", !publiclyLive);
  }

  // Valid preview token bypasses the schedule (investor preview links).
  if (token && config.previewToken && token === config.previewToken) {
    const publiclyLive = isPubliclyLive(config, nowMs);
    return decide(true, "preview-token", !publiclyLive);
  }

  if (config.visibility === "off") return decide(false, "off", false);
  if (config.visibility === "on") return decide(true, "visible-on", false);

  // scheduled
  if (!config.startsAt || !config.endsAt) return decide(false, "no-window", false);
  const start = Date.parse(config.startsAt);
  const end = Date.parse(config.endsAt);
  if (nowMs < start) return decide(false, "before-window", false);
  if (nowMs > end) return decide(false, "after-window", false);
  return decide(true, "visible-scheduled", false);
}

function isPubliclyLive(config: DocsConfig, nowMs: number): boolean {
  if (config.visibility === "off") return false;
  if (config.visibility === "on") return true;
  if (!config.startsAt || !config.endsAt) return false;
  return nowMs >= Date.parse(config.startsAt) && nowMs <= Date.parse(config.endsAt);
}
