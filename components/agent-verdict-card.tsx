"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AgentId, AgentVerdict } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VerdictLabels = {
  severity: string;
  reasoning: string;
  sampleAttack: string;
};

/* ── Agent-specific profile icons ──
   One distinct, role-reflecting mark per critic, drawn in the same
   lucide-style stroke idiom used across the app. */
const AGENT_ICONS: Record<AgentId, ReactNode> = {
  // Meme engineer — virality / parody: a grinning face
  meme_engineer: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </>
  ),
  // Regional outsider — geography / dialect: a map pin
  regional_outsider: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  // Cynical journalist — media backlash: a newspaper
  cynical_journalist: (
    <>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8Z" />
    </>
  ),
  // Rival brand — competitive hijack: crossed swords
  rival_brand: (
    <>
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
      <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
      <line x1="5" y1="14" x2="9" y2="18" />
      <line x1="7" y1="17" x2="4" y2="20" />
      <line x1="3" y1="19" x2="5" y2="21" />
    </>
  ),
  // Regulatory activist — compliance / ethics: scales of justice
  regulatory_activist: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  // Brand purist — consistency guardian: shield with check
  brand_purist: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
};

/* Short specialty line shown under each agent's name. */
const AGENT_ROLE: Record<AgentId, string> = {
  meme_engineer: "Virality & Parody",
  regional_outsider: "Regional Sensitivity",
  cynical_journalist: "Media Backlash",
  rival_brand: "Competitive Hijack",
  regulatory_activist: "Compliance & Ethics",
  brand_purist: "Brand Consistency",
};

const LEVEL_TONE = {
  low: {
    ring: "ring-[var(--success)]/25",
    text: "text-[var(--success)]",
    bar: "bg-[var(--success)]",
    chip: "bg-[var(--success-soft)] text-[var(--success)]",
    soft: "bg-[var(--success-soft)]",
    accent: "from-[var(--success)]/40",
    glow: "var(--success)",
  },
  medium: {
    ring: "ring-[var(--warning)]/30",
    text: "text-[var(--warning)]",
    bar: "bg-[var(--warning)]",
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
    soft: "bg-[var(--warning-soft)]",
    accent: "from-[var(--warning)]/40",
    glow: "var(--warning)",
  },
  high: {
    ring: "ring-[var(--danger)]/35",
    text: "text-[var(--danger)]",
    bar: "bg-[var(--danger)]",
    chip: "bg-[var(--danger-soft)] text-[var(--danger)]",
    soft: "bg-[var(--danger-soft)]",
    accent: "from-[var(--danger)]/40",
    glow: "var(--danger)",
  },
} as const;

function AgentIcon({
  agentId,
  className,
}: {
  agentId: AgentId;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {AGENT_ICONS[agentId] ?? AGENT_ICONS.brand_purist}
    </svg>
  );
}

function Avatar({
  agentId,
  level,
  size = "md",
}: {
  agentId: AgentId;
  level: keyof typeof LEVEL_TONE;
  size?: "md" | "lg";
}) {
  const tone = LEVEL_TONE[level];
  const box = size === "lg" ? "h-16 w-16" : "h-[68px] w-[68px]";
  const icon = size === "lg" ? "h-7 w-7" : "h-8 w-8";
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
        box,
        tone.soft,
        tone.ring,
        tone.text
      )}
      style={{
        boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${tone.glow} 18%, transparent), 0 8px 24px -14px ${tone.glow}`,
      }}
    >
      <AgentIcon agentId={agentId} className={icon} />
    </span>
  );
}

/* ── Grid card — circular avatar + name + specialty. Opens the modal. ── */
function AgentGridCard({
  verdict,
  onOpen,
  severityLabel,
}: {
  verdict: AgentVerdict;
  onOpen: () => void;
  severityLabel: string;
}) {
  const level = riskLevel(verdict.severity);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={cn(
        "lift card-glow group relative flex flex-col items-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[image:var(--veil)] px-6 py-7 text-center backdrop-blur-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
      )}
    >
      <Avatar agentId={verdict.agentId} level={level} />

      <h3 className="mt-4 font-display text-[15px] font-semibold leading-tight text-[var(--fg)]">
        {verdict.agentName}
      </h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {AGENT_ROLE[verdict.agentId]}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <RiskBadge level={level} score={verdict.severity} label={severityLabel} />
        {verdict.source === "mock" && <Badge variant="demo">Demo</Badge>}
      </div>

      {/* Hover affordance */}
      <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--fg-subtle)] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        View verdict
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </span>
    </button>
  );
}

/* ── Modal dialog — centered, dismiss via X, backdrop click, or Esc. ── */
function VerdictModal({
  verdict,
  labels,
  onClose,
}: {
  verdict: AgentVerdict;
  labels: VerdictLabels;
  onClose: () => void;
}) {
  const level = riskLevel(verdict.severity);
  const tone = LEVEL_TONE[level];

  // Esc to close + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Rendered only in response to a client click, so `document` always exists.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      // Positioning is set inline, not via Tailwind classes: this element is a
      // direct child of <body>, and the app's unlayered `body > *` rule
      // (position: relative; z-index: 1) would otherwise override layered
      // utility classes and collapse the overlay into normal flow.
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      className="modal-backdrop flex items-center justify-center bg-[var(--bg)]/40 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verdict-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="modal-panel relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--veil-strong)] shadow-[var(--shadow-xl)] backdrop-blur-2xl"
      >
        {/* Severity glow behind the header */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${tone.glow} 30%, transparent), transparent 70%)`,
          }}
        />

        {/* Close control */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-elev-2)]/60 text-[var(--fg-muted)] transition-colors duration-200 hover:border-[var(--border-strong)] hover:text-[var(--fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="relative flex items-center gap-4 px-7 pb-5 pt-7 pr-16">
          <Avatar agentId={verdict.agentId} level={level} size="lg" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="verdict-modal-title"
                className="font-display text-lg font-semibold tracking-tight text-[var(--fg)]"
              >
                {verdict.agentName}
              </h2>
              {verdict.source === "mock" && (
                <Badge
                  variant="demo"
                  title="This agent fell back to demo data — the model was unavailable or returned an unusable response. Its severity is heuristic, not a real judgment."
                >
                  Demo data
                </Badge>
              )}
            </div>
            <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
              {AGENT_ROLE[verdict.agentId]}
            </p>
          </div>
        </div>

        {/* Severity meter */}
        <div className="border-y border-[var(--border)] bg-[var(--bg-elev-1)]/40 px-7 py-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              {labels.severity}
            </span>
            <RiskBadge level={level} score={verdict.severity} />
          </div>
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elev-2)]">
            <div
              className={cn("h-full rounded-full transition-all duration-700", tone.bar)}
              style={{ width: `${verdict.severity}%` }}
            />
          </div>
        </div>

        {/* Scrollable detail body */}
        <div className="no-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-6 text-sm">
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
            <div className="flex flex-wrap items-center gap-1.5">
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
      </div>
    </div>,
    document.body
  );
}

/* ── Public: the six-card grid + its modal. ── */
export function AgentVerdictGrid({
  verdicts,
  labels,
}: {
  verdicts: AgentVerdict[];
  labels: VerdictLabels;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = verdicts.find((v) => v.agentId === openId) ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {verdicts.map((verdict) => (
          <AgentGridCard
            key={verdict.agentId}
            verdict={verdict}
            severityLabel={labels.severity}
            onOpen={() => setOpenId(verdict.agentId)}
          />
        ))}
      </div>

      {active && (
        <VerdictModal
          verdict={active}
          labels={labels}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
