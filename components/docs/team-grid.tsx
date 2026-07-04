import type { TeamMember } from "@/lib/docs/types";
import { Avatar } from "./avatar";

/**
 * Uniform team showcase grid. Cards share aspect ratio, frame, and spacing;
 * each member shows a profile picture (with fallback avatar), name, role, and email.
 */
export function TeamGrid({
  team,
  teamName,
  compact = false,
}: {
  team: TeamMember[];
  teamName?: string;
  compact?: boolean;
}) {
  if (!team.length) {
    return (
      <p className="text-[14px] text-[var(--fg-subtle)]">
        No team members configured yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {teamName && (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          {teamName}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[image:var(--veil)] p-4 transition-colors hover:border-[var(--border-strong)]"
          >
            <Avatar name={m.name} src={m.avatarUrl} size={compact ? "md" : "lg"} />
            <div className="min-w-0">
              <p className="truncate font-display text-[15px] font-semibold tracking-tight text-[var(--fg)]">
                {m.name}
              </p>
              <p className="mt-0.5 truncate text-[13px] text-[var(--fg-muted)]">{m.role}</p>
              {m.email && (
                <a
                  href={`mailto:${m.email}`}
                  className="mt-1 inline-block truncate text-[12px] text-[var(--accent-400)] transition-colors hover:text-[var(--accent)]"
                >
                  {m.email}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
