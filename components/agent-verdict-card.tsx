import type { AgentVerdict } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";
import { Badge, RiskBadge } from "@/components/ui/badge";

const AGENT_ROLES: Record<string, string> = {
  meme_engineer: "Meme Engineer",
  regional_outsider: "Regional Outsider",
  cynical_journalist: "Cynical Journalist",
  rival_brand: "Rival Brand",
  regulatory_activist: "Regulatory Activist",
  brand_purist: "Brand Purist",
};

export function AgentVerdictCard({
  verdict,
  labels,
}: {
  verdict: AgentVerdict;
  labels: { severity: string; reasoning: string; sampleAttack: string };
}) {
  const level = riskLevel(verdict.severity);
  const role = AGENT_ROLES[verdict.agentId] ?? verdict.agentName;

  return (
    <details className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]">
      <summary className="cursor-pointer list-none px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-card-title text-[var(--fg)]">{verdict.agentName}</h3>
            <span className="text-[var(--text-xs)] text-[var(--fg-subtle)]">{role}</span>
            {verdict.source === "mock" && (
              <Badge variant="outline" title="Demo data — severity is heuristic.">
                Demo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden min-w-[80px] sm:block">
              <div className="h-px w-full overflow-hidden bg-[var(--border-strong)]">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-700"
                  style={{ width: `${verdict.severity}%`, opacity: 0.35 + (verdict.severity / 100) * 0.65 }}
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

      <div className="agent-card-body space-y-4 border-t border-[var(--border)] px-5 py-4">
        <div>
          <p className="mb-2 font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--fg-subtle)]">
            {labels.reasoning}
          </p>
          <p className="text-[var(--text-md)] leading-[var(--leading-relaxed)] text-[var(--fg-muted)]">
            {verdict.reasoning}
          </p>
        </div>
        <div>
          <p className="mb-2 font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--fg-subtle)]">
            {labels.sampleAttack}
          </p>
          <blockquote className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 font-mono text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--fg-muted)]">
            {verdict.sampleAttack}
          </blockquote>
        </div>
        {verdict.citationIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {verdict.citationIds.map((id) => (
              <span
                key={id}
                className="rounded-md border border-[var(--border)] bg-[var(--bg-elev-2)] px-2 py-0.5 font-mono text-[var(--text-xs)] text-[var(--fg-subtle)]"
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
