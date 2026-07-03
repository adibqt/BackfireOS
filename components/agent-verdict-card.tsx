import type { AgentVerdict } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const AGENT_INITIALS: Record<string, string> = {
  meme_engineer: "ME",
  regional_outsider: "RO",
  cynical_journalist: "CJ",
  rival_brand: "RB",
  cultural_activist: "CA",
};

const LEVEL_TONE = {
  low: {
    ring: "ring-[var(--success)]/20",
    bar: "bg-[var(--success)]",
    chip: "bg-[var(--success-soft)] text-[var(--success)]",
    accent: "from-[var(--success)]/40",
  },
  medium: {
    ring: "ring-[var(--warning)]/25",
    bar: "bg-[var(--warning)]",
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
    accent: "from-[var(--warning)]/40",
  },
  high: {
    ring: "ring-[var(--danger)]/30",
    bar: "bg-[var(--danger)]",
    chip: "bg-[var(--danger-soft)] text-[var(--danger)]",
    accent: "from-[var(--danger)]/40",
  },
} as const;

export function AgentVerdictCard({
  verdict,
  labels,
}: {
  verdict: AgentVerdict;
  labels: { severity: string; reasoning: string; sampleAttack: string };
}) {
  const level = riskLevel(verdict.severity);
  const tone = LEVEL_TONE[level];
  const initials =
    AGENT_INITIALS[verdict.agentId] ?? verdict.agentName.slice(0, 2).toUpperCase();

  return (
    <details
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] card-glow"
      )}
    >
      {/* Left accent line */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b to-transparent",
          tone.accent
        )}
        aria-hidden
      />

      <summary className="cursor-pointer list-none px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[13px] font-semibold ring-1 ring-inset",
                tone.chip,
                tone.ring
              )}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-[15px] font-semibold text-[var(--fg)]">
                  {verdict.agentName}
                </h3>
                {verdict.source === "mock" && (
                  <Badge
                    variant="demo"
                    title="This agent fell back to demo data — the model was unavailable or returned an unusable response. Its severity is heuristic, not a real judgment."
                  >
                    Demo data
                  </Badge>
                )}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                {verdict.agentId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", tone.bar)}
                  style={{ width: `${verdict.severity}%` }}
                />
              </div>
            </div>
            <RiskBadge level={level} score={verdict.severity} label={labels.severity} />
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="chevron shrink-0 text-[var(--fg-subtle)] transition-transform duration-300"
              aria-hidden
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>
      </summary>

      <div className="space-y-5 border-t border-[var(--border)] px-6 py-5 text-sm fade-in">
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {labels.reasoning}
          </p>
          <p className="leading-relaxed text-[var(--fg-muted)]">{verdict.reasoning}</p>
        </div>
        <div>
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {labels.sampleAttack}
          </p>
          <blockquote className="relative rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-4 py-3 font-mono text-[13px] leading-relaxed text-[var(--accent-200)]">
            <span className="absolute left-2 top-1 font-display text-2xl leading-none text-[var(--accent)]/30">
              &ldquo;
            </span>
            <span className="block pl-3">{verdict.sampleAttack}</span>
          </blockquote>
        </div>
        {verdict.citationIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              RAG sources:
            </span>
            {verdict.citationIds.map((id) => (
              <span
                key={id}
                className="rounded-md bg-[var(--bg-elev-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fg-muted)]"
              >
                {id}
              </span>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
