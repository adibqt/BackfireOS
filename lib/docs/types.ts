// Backfire OS — /docs module shared types

export type DocsVisibility = "on" | "off" | "scheduled";

export type TeamMember = {
  id: string;
  name: string;
  /** Role in the application (e.g. "Founder & Full-stack", "AI / RAG") */
  role: string;
  email: string;
  /** Optional uniform-styled profile picture. Falls back to a generated avatar. */
  avatarUrl?: string;
};

/** Persisted, admin-controlled configuration for the /docs module. */
export type DocsConfig = {
  visibility: DocsVisibility;
  /** ISO 8601. Only meaningful when visibility === "scheduled". */
  startsAt: string | null;
  endsAt: string | null;
  /** Opaque token; /docs?token=<previewToken> bypasses the schedule for previews. */
  previewToken: string | null;
  teamName: string;
  team: TeamMember[];
  /** Optional per-section content overrides keyed by section id. */
  contentOverrides: Record<string, string>;
  updatedAt: string | null;
  updatedBy: string | null;
};

/** Why /docs is or isn't visible to the current viewer. */
export type AccessReason =
  | "admin" // admin bypass — sees everything regardless of schedule
  | "preview-token" // valid ?token= bypass
  | "visible-on" // visibility = on
  | "visible-scheduled" // visibility = scheduled and now within window
  | "off" // visibility = off
  | "before-window" // scheduled, before startsAt
  | "after-window" // scheduled, after endsAt
  | "no-window"; // scheduled but no dates configured

export type AccessDecision = {
  allowed: boolean;
  isAdmin: boolean;
  /** True when an admin/preview viewer is seeing a page that is NOT publicly live. */
  preview: boolean;
  reason: AccessReason;
  config: DocsConfig;
  /** Server "now" used for the decision, ISO. */
  now: string;
};

export type LiveStats = {
  /** Where the numbers came from. */
  source: "database" | "memory" | "static";
  campaigns: number;
  runs: number;
  completedRuns: number;
  verdicts: number;
  brands: number;
  ragSamples: number;
  /** Live count of agent personas in the red-team ensemble. */
  agents: number;
  generatedAt: string;
};
