"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { SectionHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { riskLevel } from "@/lib/scoring";
import { loadBranches } from "@/lib/branches/client";
import type { AgentId, AgentVerdict, SimulationRun } from "@/lib/agents/types";
import type {
  BoardroomTranscript,
  DebateDecision,
  DebateMessage,
  DebateModel,
  PersonaId,
} from "@/lib/boardroom/types";

/**
 * A slogan the room can debate: either the campaign's original copy or a
 * Counterfactual Branching variant. The original always sorts first.
 */
type SloganVariant = { id: string; label: string; slogan: string };
const ORIGINAL_VARIANT_ID = "__original__";

/* ──────────────────────────────────────────────────────────────────
   Boardroom Mode — watch synthetic personas debate the campaign live.

   Redesigned as an "agentic UX" surface rather than a chat: a static
   Campaign Brief on the left (the artefact on trial), and a live
   Audit Trail of formal persona memos on the right. Each adversary
   carries a Confidence / Severity signal sourced from the red-team
   verdicts, references the exact campaign data it attacks, and slides
   in as it takes the floor. Reads a completed run, streams a
   multi-agent debate over SSE (POST /api/boardroom), types the
   transcript out, and ends in a synthesized greenlight / revise / kill
   recommendation.
   ────────────────────────────────────────────────────────────────── */

type PersonaMeta = {
  id: PersonaId;
  name: string;
  role: string;
  initials: string;
  model: DebateModel;
};

type LiveMessage = DebateMessage & { streaming: boolean };

/**
 * Pause inserted after each persona finishes speaking, so the room reads like a
 * real back-and-forth conference rather than an instant dump of every reply.
 * SSE events are buffered into a queue and drained with this gap between turns.
 */
const TURN_DELAY_MS = 1100;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Clamp a string to `max` chars with an ellipsis — used in compact selects/lists. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Lightweight client-side persona metadata, in speaking order. Mirrors
 * lib/boardroom/personas.ts but carries only what the roster needs (no system
 * prompts), so re-opening a SAVED transcript can render the roster without the
 * live `debate_start` event — and without shipping the prompt strings to the
 * browser.
 */
const PERSONA_META: PersonaMeta[] = [
  { id: "brand_manager", name: "Brand Manager", role: "Defends the campaign · wants to ship", initials: "BM", model: "scout" },
  { id: "activist", name: "The Activist", role: "Cultural & regulatory harm · wants it pulled", initials: "AC", model: "compound" },
  { id: "journalist", name: "Cynical Journalist", role: "Cross-examines the slogan's claims", initials: "CJ", model: "scout" },
  { id: "brand_purist", name: "Brand Purist", role: "Guards brand consistency", initials: "BP", model: "scout" },
];

type Tone = {
  /** Avatar tile background + text. */
  chip: string;
  /** Inset ring around the avatar tile. */
  ring: string;
  /** Chat-bubble background + border tint. */
  bubble: string;
  /** Radial glow tint behind the active bubble while streaming. */
  glow: string;
  /** Solid accent colour (CSS var) for dots / dividers. */
  dot: string;
  /** One-word stance shown under the name. */
  stance: string;
  /**
   * Which side of the chat thread this persona sits on. The campaign's
   * defender (Brand Manager) sits on the right like "you" in a group chat;
   * the three critics sit on the left, facing it.
   */
  side: "left" | "right";
  /**
   * Whether this persona attacks the campaign copy directly — drives the
   * "under cross-examination" highlight on the slogan in the brief pane.
   */
  critical: boolean;
};

const PERSONA_TONE: Record<PersonaId, Tone> = {
  brand_manager: {
    chip: "bg-[var(--success-soft)] text-[var(--success)]",
    ring: "ring-[var(--success)]/25",
    bubble: "bg-[var(--success-soft)] border-[var(--success)]/20",
    glow: "rgba(52,211,153,0.14)",
    dot: "bg-[var(--success)]",
    stance: "Advocate",
    side: "right",
    critical: false,
  },
  activist: {
    chip: "bg-[var(--danger-soft)] text-[var(--danger)]",
    ring: "ring-[var(--danger)]/30",
    bubble: "bg-[var(--danger-soft)] border-[var(--danger)]/20",
    glow: "rgba(248,113,113,0.16)",
    dot: "bg-[var(--danger)]",
    stance: "Adversary",
    side: "left",
    critical: true,
  },
  journalist: {
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
    ring: "ring-[var(--warning)]/25",
    bubble: "bg-[var(--warning-soft)] border-[var(--warning)]/20",
    glow: "rgba(251,191,36,0.14)",
    dot: "bg-[var(--warning)]",
    stance: "Skeptic",
    side: "left",
    critical: true,
  },
  brand_purist: {
    chip: "bg-[var(--accent-soft)] text-[var(--accent-200)]",
    ring: "ring-[var(--accent)]/25",
    bubble: "bg-[var(--accent-soft)] border-[var(--accent)]/20",
    glow: "rgba(255,77,87,0.14)",
    dot: "bg-[var(--accent)]",
    stance: "Guardian",
    side: "left",
    critical: false,
  },
};

const DECISION_TONE: Record<
  DebateDecision,
  { label: string; chip: "success" | "warning" | "danger"; text: string; glow: string }
> = {
  greenlight: { label: "Greenlight", chip: "success", text: "text-[var(--success)]", glow: "rgba(52,211,153,0.18)" },
  revise: { label: "Revise", chip: "warning", text: "text-[var(--warning)]", glow: "rgba(251,191,36,0.18)" },
  kill: { label: "Kill", chip: "danger", text: "text-[var(--danger)]", glow: "rgba(248,113,113,0.2)" },
};

/**
 * Maps a debate persona to its corresponding red-team agent, so the boardroom
 * can show each critic's real severity score as a live "Confidence signal"
 * rather than an invented number. The Brand Manager is the campaign's advocate
 * and has no red-team counterpart.
 */
const PERSONA_VERDICT: Partial<Record<PersonaId, AgentId>> = {
  activist: "regulatory_activist",
  journalist: "cynical_journalist",
  brand_purist: "brand_purist",
};

function personaSeverity(
  id: PersonaId,
  verdicts: AgentVerdict[] | undefined
): number | null {
  const agentId = PERSONA_VERDICT[id];
  if (!agentId || !verdicts) return null;
  const v = verdicts.find((x) => x.agentId === agentId);
  return v ? Math.round(v.severity) : null;
}

/* ── Small shared pieces ──────────────────────────────────────────── */

/**
 * Renders a persona's reply with light markdown — the models emit `**bold**`
 * (and occasionally `*italic*`) which would otherwise show as raw asterisks.
 * Newlines are preserved by the parent's `whitespace-pre-wrap`, so we only need
 * to translate inline emphasis. Unclosed markers (mid-stream) fall through as
 * plain text and resolve once the closing marker arrives.
 */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|__([^_]+)__/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const bold = m[1] ?? m[3];
    if (bold !== undefined) {
      nodes.push(
        <strong key={key++} className="font-semibold text-[var(--fg)]">
          {bold}
        </strong>
      );
    } else if (m[2] !== undefined) {
      nodes.push(<em key={key++}>{m[2]}</em>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * The "Confidence signal" badge — styled like the gold "Scored" chips: a tiny
 * severity meter + score that telegraphs how critical an adversary is, tinted
 * by risk level. When no red-team severity is available it falls back to the
 * persona's stance ("Pro-launch" for the advocate, otherwise its role).
 */
function ConfidenceSignal({
  personaId,
  severity,
}: {
  personaId: PersonaId;
  severity: number | null;
}) {
  if (severity === null) {
    if (personaId === "brand_manager") {
      return (
        <span className="inline-flex items-center rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--success)]">
          Pro-launch
        </span>
      );
    }
    const tone = PERSONA_TONE[personaId];
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
          tone.chip
        )}
      >
        {tone.stance}
      </span>
    );
  }
  const level = riskLevel(severity);
  const tone =
    level === "high"
      ? "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)]"
      : level === "medium"
        ? "border-[var(--warning)]/30 bg-[var(--warning-soft)] text-[var(--warning)]"
        : "border-[var(--success)]/30 bg-[var(--success-soft)] text-[var(--success)]";
  const fill =
    level === "high" ? "bg-[var(--danger)]" : level === "medium" ? "bg-[var(--warning)]" : "bg-[var(--success)]";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wider",
        tone
      )}
      title={`Red-team severity for this persona: ${severity}/100`}
    >
      <span className="relative h-1 w-7 overflow-hidden rounded-full bg-white/15">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", fill)}
          style={{ width: `${severity}%` }}
        />
      </span>
      SEV {severity}
    </span>
  );
}

/** Pulsing "Thinking…" placeholder shown the moment a persona takes the floor. */
function ThinkingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
      Thinking
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="thinking-dot inline-block h-1 w-1 rounded-full bg-current"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
    </span>
  );
}

function Avatar({
  initials,
  tone,
  size = "md",
  active = false,
}: {
  initials: string;
  tone: Tone;
  size?: "sm" | "md";
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-lg font-mono font-semibold ring-1 ring-inset transition-shadow",
        size === "sm" ? "h-9 w-9 text-[12px]" : "h-10 w-10 text-[13px]",
        tone.chip,
        tone.ring,
        active && "shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
      )}
    >
      {initials}
    </span>
  );
}

/* ── Left pane: the campaign on trial ─────────────────────────────── */

function CampaignBriefPanel({
  run,
  criticalActive,
  debatedSlogan,
  variantLabel,
}: {
  run: SimulationRun;
  criticalActive: boolean;
  /** The slogan actually on trial — a counterfactual variant, when one is chosen. */
  debatedSlogan?: string;
  variantLabel?: string | null;
}) {
  const campaign = run.campaign;
  if (!campaign) return null;

  const slogan = debatedSlogan ?? campaign.slogan;
  // True when a Counterfactual Branching variant (not the original copy) is on trial.
  const isVariant = Boolean(variantLabel) && slogan.trim() !== campaign.slogan.trim();

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))] backdrop-blur-xl">
        {campaign.imageUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--bg-elev-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campaign.imageUrl}
              alt="Campaign creative under debate"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
              Exhibit A
            </span>
          </div>
        )}

        <div className="space-y-5 p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
                Campaign on trial
              </p>
              {isVariant && (
                <Badge variant="accent" title={`Counterfactual variant: ${variantLabel}`}>
                  ⎇ {variantLabel}
                </Badge>
              )}
            </div>
            {/* The slogan is the artefact the room argues over — quote it
                literally and ring it when a critical persona is speaking, so
                the human can see exactly what is under cross-examination. When a
                counterfactual variant is on trial we quote IT (not the original). */}
            <blockquote
              className={cn(
                "relative rounded-xl border bg-white/[0.02] px-4 py-3 transition-all duration-300",
                criticalActive
                  ? "border-[var(--warning)]/40 shadow-[0_0_0_1px_var(--warning-soft),0_0_30px_-10px_var(--warning)]"
                  : "border-[var(--border)]"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-0 h-full w-[3px] rounded-l-xl transition-colors",
                  criticalActive ? "bg-[var(--warning)]" : "bg-[var(--border-strong)]"
                )}
                aria-hidden
              />
              <p className="font-display text-[17px] font-semibold leading-snug tracking-tight text-[var(--fg)]">
                “{slogan}”
              </p>
              {isVariant && (
                <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  original: “{campaign.slogan}”
                </p>
              )}
              {criticalActive && (
                <p className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--warning)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--warning)]" />
                  under cross-examination
                </p>
              )}
            </blockquote>
          </div>

          {campaign.brief && (
            <BriefRow label="Brief">{campaign.brief}</BriefRow>
          )}
          {campaign.brandValues && (
            <BriefRow label="Brand values">{campaign.brandValues}</BriefRow>
          )}
          {campaign.imageDescription && !campaign.imageUrl && (
            <BriefRow label="Visual">{campaign.imageDescription}</BriefRow>
          )}

          {run.verdicts && run.verdicts.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Red-team severity
              </p>
              <div className="space-y-2.5">
                {run.verdicts
                  .slice()
                  .sort((a, b) => b.severity - a.severity)
                  .slice(0, 4)
                  .map((v) => {
                    const level = riskLevel(v.severity);
                    const color =
                      level === "high"
                        ? "var(--danger)"
                        : level === "medium"
                          ? "var(--warning)"
                          : "var(--success)";
                    return (
                      <div key={v.agentId}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-[12px] text-[var(--fg-muted)]">
                            {v.agentName}
                          </span>
                          <span
                            className="font-mono text-[11px] font-medium"
                            style={{ color }}
                          >
                            {Math.round(v.severity)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, v.severity)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BriefRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
        {label}
      </p>
      <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">{children}</p>
    </div>
  );
}

/* ── Persona roster (vertical, in the transcript header) ──────────── */

function PersonaRoster({
  personas,
  activeId,
  thinking,
  verdicts,
}: {
  personas: PersonaMeta[];
  activeId: PersonaId | null;
  thinking: boolean;
  verdicts: AgentVerdict[] | undefined;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {personas.map((p) => {
        const tone = PERSONA_TONE[p.id];
        const active = activeId === p.id;
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all duration-200",
              active
                ? "border-[var(--border-bright)] bg-white/[0.05]"
                : "border-[var(--border)] bg-[var(--bg-elev-1)]/50"
            )}
          >
            <Avatar initials={p.initials} tone={tone} size="sm" active={active} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1.5 truncate text-[13px] font-medium text-[var(--fg)]">
                {p.name}
                {active && (
                  <span className={cn("inline-block h-1.5 w-1.5 animate-pulse rounded-full", tone.dot)} />
                )}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                {active && thinking ? "thinking…" : tone.stance}
              </p>
            </div>
            <ConfidenceSignal personaId={p.id} severity={personaSeverity(p.id, verdicts)} />
          </div>
        );
      })}
    </div>
  );
}

/* ── A single chat bubble (group-chat message) ────────────────────── */

function ChatBubble({
  message,
  severity,
}: {
  message: LiveMessage;
  severity: number | null;
}) {
  const tone = PERSONA_TONE[message.speakerId];
  const isThinking = message.streaming && message.content.length === 0;
  const isEmpty = !message.streaming && message.content.trim().length === 0;
  const right = tone.side === "right";

  return (
    <div className={cn("slide-in-right flex items-end gap-2.5", right && "flex-row-reverse")}>
      <Avatar
        initials={message.speakerName.slice(0, 2).toUpperCase()}
        tone={tone}
        size="sm"
        active={message.streaming}
      />
      <div className={cn("flex min-w-0 max-w-[82%] flex-col", right ? "items-end" : "items-start")}>
        {/* Name / signal line above the bubble, like a group chat. */}
        <div
          className={cn(
            "mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 px-1",
            right && "flex-row-reverse"
          )}
        >
          <span className="font-display text-[13px] font-semibold tracking-tight text-[var(--fg)]">
            {message.speakerName}
          </span>
          <ConfidenceSignal personaId={message.speakerId} severity={severity} />
          {message.model === "compound" && (
            <Badge variant="accent" title="This adversary runs on Groq's agentic compound model">
              agentic
            </Badge>
          )}
        </div>

        {/* The bubble itself. The corner nearest the avatar is squared off
            to form a chat "tail". */}
        <div
          className={cn(
            "rounded-2xl border px-4 py-2.5 text-[14px] leading-relaxed text-[var(--fg)] backdrop-blur-xl",
            tone.bubble,
            right ? "rounded-br-sm" : "rounded-bl-sm"
          )}
          style={message.streaming ? { boxShadow: `0 0 44px -20px ${tone.glow}` } : undefined}
        >
          {isThinking ? (
            <ThinkingIndicator />
          ) : isEmpty ? (
            <span className="text-[13px] italic text-[var(--fg-subtle)]">
              — held back this round —
            </span>
          ) : (
            <p className="whitespace-pre-wrap">
              {renderInline(message.content)}
              {message.streaming && (
                <span className="blink-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current align-middle" />
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Final synthesized recommendation ─────────────────────────────── */

function DecisionCard({ transcript }: { transcript: BoardroomTranscript }) {
  const tone = DECISION_TONE[transcript.synthesis.decision];
  return (
    <section
      className="fade-up relative mt-6 overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.005))] px-6 py-7 backdrop-blur-xl md:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${tone.glow}, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              Boardroom recommendation
            </p>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={cn(
                  "font-display text-[34px] font-semibold leading-none tracking-tight",
                  tone.text
                )}
              >
                {tone.label}
              </span>
              <Badge variant={tone.chip} dot>
                {transcript.synthesis.confidence}% confidence
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {transcript.synthesis.source === "mock" && (
              <Badge variant="demo">Heuristic verdict</Badge>
            )}
            {transcript.converged && <Badge variant="outline">Converged early</Badge>}
            <Badge variant="outline">{transcript.rounds} rounds</Badge>
          </div>
        </div>

        <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
          {transcript.synthesis.summary}
        </p>

        {transcript.synthesis.conditions.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              Conditions before launch
            </p>
            <ul className="space-y-2.5">
              {transcript.synthesis.conditions.map((c, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[var(--fg-muted)]"
                >
                  <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Run picker ───────────────────────────────────────────────────── */

function RunPicker({
  runs,
  selectedId,
  onChange,
  emptyMessage,
}: {
  runs: SimulationRun[];
  selectedId: string;
  onChange: (id: string) => void;
  emptyMessage?: string;
}) {
  const completed = runs.filter((r) => r.status === "complete");
  return (
    <div className="space-y-2">
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] px-4 py-2.5 text-[14px] text-[var(--fg)] outline-none ring-[var(--accent)]/30 focus:ring-2"
      >
        <option value="">Select a campaign…</option>
        {completed.map((run) => (
          <option key={run.id} value={run.id}>
            {run.campaign?.slogan ?? run.id.slice(0, 8)} —{" "}
            {new Date(run.createdAt).toLocaleDateString()}
          </option>
        ))}
      </select>
      {emptyMessage && <p className="text-[13px] text-[var(--fg-muted)]">{emptyMessage}</p>}
    </div>
  );
}

/* ── Slogan-variant picker ────────────────────────────────────────────
   Lets the room debate any slogan version forked in Counterfactual Branching,
   not just the campaign's original copy. Only shown when ≥1 variant exists.
   ────────────────────────────────────────────────────────────────── */

function SloganVariantPicker({
  variants,
  selectedId,
  onChange,
  disabled,
}: {
  variants: SloganVariant[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        Slogan version
      </label>
      <select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title="Debate the original slogan or any counterfactual variant"
        className="w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] px-4 py-2.5 text-[14px] text-[var(--fg)] outline-none ring-[var(--accent)]/30 focus:ring-2 disabled:opacity-50"
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.id === ORIGINAL_VARIANT_ID ? "Original" : `⎇ ${v.label}`} — {truncate(v.slogan, 40)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Iteration timeline ───────────────────────────────────────────────
   Every convened debate is saved as its own iteration. This panel lists them
   newest-first; clicking one loads its full transcript into the main view.
   ────────────────────────────────────────────────────────────────── */

function IterationTimeline({
  iterations,
  currentId,
  debating,
  onSelect,
}: {
  iterations: BoardroomTranscript[];
  currentId: string | null;
  debating: boolean;
  onSelect: (t: BoardroomTranscript) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/40 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          Iterations
        </p>
        <Badge variant="outline">{iterations.length} saved</Badge>
      </div>
      <ul className="max-h-[420px] divide-y divide-[var(--border)] overflow-y-auto">
        {iterations.map((it) => {
          const tone = DECISION_TONE[it.synthesis.decision];
          const active = it.id === currentId;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it)}
                disabled={debating}
                className={cn(
                  "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
                      #{it.iteration}
                    </span>
                    <Badge variant={tone.chip} dot>
                      {tone.label}
                    </Badge>
                    {it.branchLabel && (
                      <span className="truncate font-mono text-[10px] uppercase tracking-wider text-[var(--accent-200)]">
                        ⎇ {it.branchLabel}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--fg-subtle)]">
                    {new Date(it.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="truncate text-[13px] text-[var(--fg-muted)]">
                  “{it.campaignSlogan}”
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  {it.synthesis.confidence}% confidence · {it.rounds} rounds
                  {it.converged ? " · converged" : ""}
                  {it.degraded ? " · degraded" : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

function BoardroomInner() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("runId") ?? "";

  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState(runIdParam);
  const [listError, setListError] = useState("");

  // The campaign list omits verdicts; this holds the full run (with red-team
  // verdicts) so the confidence/severity signals show real scores.
  const [fullRun, setFullRun] = useState<SimulationRun | null>(null);

  const [personas, setPersonas] = useState<PersonaMeta[]>([]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<PersonaId | null>(null);
  const [round, setRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(0);
  const [transcript, setTranscript] = useState<BoardroomTranscript | null>(null);
  const [status, setStatus] = useState("");
  const [debating, setDebating] = useState(false);
  const [error, setError] = useState("");

  // Saved debate history for this run (newest first) + which slogan version to
  // debate next, sourced from the campaign's Counterfactual Branching variants.
  const [iterations, setIterations] = useState<BoardroomTranscript[]>([]);
  const [variants, setVariants] = useState<SloganVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(ORIGINAL_VARIANT_ID);

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // SSE pacing — events are buffered here and drained one turn at a time with a
  // human-like pause after each speaker finishes. `genRef` invalidates an
  // in-flight drain when a new debate is convened or the view is torn down.
  const eventQueue = useRef<Array<{ event: string; data: unknown }>>([]);
  const drainingRef = useRef(false);
  const genRef = useRef(0);

  const activeId = runIdParam || selectedRunId;

  // Reset the debate view when the selected campaign changes. This is the
  // React-endorsed "adjust state during render" pattern — synchronous setState
  // inside an effect would trigger a cascading re-render and is disallowed.
  const [loadedFor, setLoadedFor] = useState(activeId);
  if (activeId !== loadedFor) {
    setLoadedFor(activeId);
    setMessages([]);
    setPersonas([]);
    setTranscript(null);
    setFullRun(null);
    setError("");
    setRound(0);
    setActiveSpeaker(null);
    setIterations([]);
    setVariants([]);
    setSelectedVariantId(ORIGINAL_VARIANT_ID);
  }

  // Load the list of campaigns to debate.
  useEffect(() => {
    fetch("/api/campaigns?list=true")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setListError(data.error ?? `Failed to load campaigns (${res.status})`);
          return;
        }
        setRuns(data.runs ?? []);
      })
      .catch(() => setListError("Failed to load campaigns"));
  }, []);

  // When the selected campaign changes, load its saved debate history (every
  // iteration, newest first) and default the view to the latest. The setState
  // here lives in async callbacks, so it does not run synchronously in the body.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    fetch(`/api/boardroom?runId=${activeId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const saved = (data.iterations as BoardroomTranscript[] | undefined) ?? [];
        setIterations(saved);
        if (saved[0]) setTranscript(saved[0]);
      })
      .catch(() => {});
    // Pull the full run (with verdicts) for the severity signals.
    fetch(`/api/campaigns?runId=${activeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((run: SimulationRun | null) => {
        if (!cancelled && run && run.id === activeId) setFullRun(run);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // Derive which campaign backs the selected run so we can offer its
  // Counterfactual Branching slogan variants as debate targets.
  const listRun = runs.find((r) => r.id === activeId);
  const selectedRun = fullRun && fullRun.id === activeId ? fullRun : listRun;
  const campaignId = selectedRun?.campaignId;
  const originalSlogan = selectedRun?.campaign?.slogan ?? "";

  // Load the campaign's branch slogans. The original copy always leads; branch
  // variants follow, de-duplicated by slogan (a fresh fork is byte-identical to
  // its parent, so it would otherwise list the same line twice).
  useEffect(() => {
    if (!campaignId || !originalSlogan) return;
    let cancelled = false;
    const original: SloganVariant = {
      id: ORIGINAL_VARIANT_ID,
      label: "Original",
      slogan: originalSlogan,
    };
    loadBranches(campaignId)
      .then((branches) => {
        if (cancelled) return;
        const seen = new Set([originalSlogan.trim()]);
        const variantList: SloganVariant[] = [original];
        for (const b of branches ?? []) {
          const slogan = b.slogan?.trim();
          if (!slogan || seen.has(slogan)) continue;
          seen.add(slogan);
          variantList.push({ id: b.id, label: b.label, slogan });
        }
        setVariants(variantList);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [campaignId, originalSlogan]);

  // Auto-scroll the transcript as it grows.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, transcript]);

  // Clean up any in-flight stream + paced drain on unmount.
  useEffect(
    () => () => {
      genRef.current += 1;
      abortRef.current?.abort();
    },
    []
  );

  const applyEvent = useCallback((event: string, data: unknown) => {
    switch (event) {
      case "debate_start": {
        const d = data as { personas: PersonaMeta[]; maxRounds: number };
        setPersonas(d.personas);
        setMaxRounds(d.maxRounds);
        setStatus("Debate in progress…");
        break;
      }
      case "speaker_start": {
        const d = data as {
          speakerId: PersonaId;
          speakerName: string;
          role: string;
          model: DebateModel;
          round: number;
        };
        setActiveSpeaker(d.speakerId);
        setRound(d.round);
        setMessages((prev) => [
          ...prev,
          {
            id: `${d.speakerId}-${d.round}-${prev.length}`,
            speakerId: d.speakerId,
            speakerName: d.speakerName,
            model: d.model,
            content: "",
            round: d.round,
            streaming: true,
          },
        ]);
        break;
      }
      case "token": {
        const d = data as { speakerId: PersonaId; token: string };
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const next = [...prev];
          const last = next[next.length - 1];
          if (last.streaming && last.speakerId === d.speakerId) {
            next[next.length - 1] = { ...last, content: last.content + d.token };
          }
          return next;
        });
        break;
      }
      case "speaker_end": {
        const d = data as { message: DebateMessage };
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.streaming) {
            next[next.length - 1] = {
              ...last,
              content: d.message.content,
              streaming: false,
            };
          }
          return next;
        });
        break;
      }
      case "synthesis":
        setStatus("Synthesizing recommendation…");
        break;
      case "complete": {
        const t = data as BoardroomTranscript;
        setTranscript(t);
        // Prepend this finished iteration to the browsable history (newest
        // first), replacing any optimistic placeholder with the same id.
        setIterations((prev) => [t, ...prev.filter((it) => it.id !== t.id)]);
        break;
      }
      case "error":
        setError((data as { message: string }).message);
        break;
    }
  }, []);

  // Drain buffered events one at a time, pausing after each completed turn so
  // the conference unfolds at a readable, human pace. Tokens apply immediately,
  // preserving the live typing effect within a turn.
  const drain = useCallback(
    async (gen: number) => {
      if (drainingRef.current) return;
      drainingRef.current = true;
      try {
        while (eventQueue.current.length > 0) {
          if (gen !== genRef.current) break; // superseded by a new debate / unmount
          const next = eventQueue.current.shift();
          if (!next) break;
          applyEvent(next.event, next.data);
          // Pause between speakers (but not before the final synthesis flush).
          if (next.event === "speaker_end" && eventQueue.current.length > 0) {
            await sleep(TURN_DELAY_MS);
          }
        }
      } finally {
        drainingRef.current = false;
      }
    },
    [applyEvent]
  );

  const enqueue = useCallback(
    (event: string, data: unknown) => {
      eventQueue.current.push({ event, data });
      void drain(genRef.current);
    },
    [drain]
  );

  const startDebate = useCallback(async () => {
    if (!activeId || debating) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Invalidate any in-flight drain and clear the buffer for the new debate.
    genRef.current += 1;
    const gen = genRef.current;
    eventQueue.current = [];

    setDebating(true);
    setError("");
    setMessages([]);
    setPersonas([]);
    setTranscript(null);
    setRound(0);
    setActiveSpeaker(null);
    setStatus("Convening the boardroom…");

    // Debate the chosen slogan version. The original needs no override; a
    // counterfactual variant rides along as a slogan + branch provenance.
    const variant = variants.find((v) => v.id === selectedVariantId);
    const payload =
      variant && variant.id !== ORIGINAL_VARIANT_ID
        ? {
            runId: activeId,
            slogan: variant.slogan,
            branchId: variant.id,
            branchLabel: variant.label,
          }
        : { runId: activeId };

    try {
      const res = await fetch("/api/boardroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start debate");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim());
          enqueue(event, data);
        }
      }

      // The network has delivered everything, but the queue may still be
      // draining with inter-turn pauses. Wait for it so the "Debating…" state
      // and the final recommendation don't appear before the last reply lands.
      while (
        gen === genRef.current &&
        (eventQueue.current.length > 0 || drainingRef.current)
      ) {
        await sleep(120);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Debate failed");
      }
    } finally {
      if (gen === genRef.current) {
        setDebating(false);
        setActiveSpeaker(null);
        setStatus("");
      }
    }
  }, [activeId, debating, enqueue, variants, selectedVariantId]);

  // Load a saved iteration into the main view (clears any live stream so the
  // persisted transcript renders rather than the last debate's messages).
  const viewIteration = useCallback((t: BoardroomTranscript) => {
    abortRef.current?.abort();
    genRef.current += 1;
    eventQueue.current = [];
    setDebating(false);
    setMessages([]);
    setActiveSpeaker(null);
    setStatus("");
    setTranscript(t);
  }, []);

  const hasDebate = transcript !== null || messages.length > 0;

  // Roster source: live `debate_start` personas while streaming, otherwise
  // derive from the saved transcript's speakers (in canonical speaking order).
  const displayPersonas =
    personas.length > 0
      ? personas
      : transcript
        ? PERSONA_META.filter((p) =>
            transcript.messages.some((m) => m.speakerId === p.id)
          )
        : [];

  // Messages to render: live stream while debating, persisted transcript idle.
  const renderMessages: LiveMessage[] =
    messages.length > 0
      ? messages
      : transcript?.messages.map((m) => ({ ...m, streaming: false })) ?? [];

  const lastMessage = messages[messages.length - 1];
  const thinking = Boolean(
    debating && lastMessage?.streaming && lastMessage.content.length === 0
  );
  // Whether a campaign-attacking persona currently holds the floor — drives the
  // "under cross-examination" highlight on the slogan in the brief pane.
  const criticalActive = Boolean(activeSpeaker && PERSONA_TONE[activeSpeaker].critical);

  // The slogan actually on trial in the current view: a saved/finished
  // transcript's debated line, or — during a fresh live debate — the variant
  // picked from Counterfactual Branching. Falls back to the original copy.
  const liveVariant =
    selectedVariantId !== ORIGINAL_VARIANT_ID
      ? variants.find((v) => v.id === selectedVariantId)
      : undefined;
  const debatedSlogan = transcript?.campaignSlogan ?? liveVariant?.slogan;
  const variantLabel = transcript
    ? transcript.branchLabel ?? null
    : liveVariant?.label ?? null;

  return (
    <PageShell footer={false} wide>
      <SectionHeader
        eyebrow={t(locale, "boardroom")}
        title="Watch the room argue your campaign"
        description="Four synthetic personas debate the campaign live — the Activist argues with the Brand Manager while the Cynical Journalist cross-examines the slogan. Read the exchange, then the room's greenlight call."
      />

      <div className="mb-8 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <RunPicker
            runs={runs}
            selectedId={activeId}
            onChange={setSelectedRunId}
            emptyMessage={
              listError
                ? listError
                : runs.length > 0 && runs.every((r) => r.status !== "complete")
                  ? "No completed campaigns yet — finish a simulation from the home page first."
                  : runs.length === 0 && !listError
                    ? "No campaigns yet — run a simulation from the home page."
                    : undefined
            }
          />
        </div>
        {activeId && variants.length > 1 && (
          <SloganVariantPicker
            variants={variants}
            selectedId={selectedVariantId}
            onChange={setSelectedVariantId}
            disabled={debating}
          />
        )}
        {activeId && (
          <Button type="button" size="lg" onClick={startDebate} disabled={debating}>
            {debating ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {status || "Debating…"}
              </span>
            ) : selectedVariantId !== ORIGINAL_VARIANT_ID ? (
              "Debate this version"
            ) : iterations.length > 0 ? (
              "Re-run debate"
            ) : (
              "Convene the boardroom"
            )}
          </Button>
        )}
      </div>

      {!activeId && (
        <div className="card-glow rounded-2xl border border-[var(--border)] px-6 py-12 text-center">
          <p className="text-[15px] text-[var(--fg-muted)]">
            Select a completed campaign to convene its boardroom debate.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" variant="primary" size="md">
              {t(locale, "newSimulation")}
            </ButtonLink>
            <ButtonLink href="/history" variant="secondary" size="md">
              {t(locale, "history")}
            </ButtonLink>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {activeId && selectedRun?.campaign && (hasDebate || debating) && (
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_20rem]">
          {/* Left: static campaign brief — the artefact on trial. */}
          <aside>
            <CampaignBriefPanel
              run={selectedRun}
              criticalActive={criticalActive}
              debatedSlogan={debatedSlogan}
              variantLabel={variantLabel}
            />
          </aside>

          {/* Center: the live audit trail. */}
          <div className="min-w-0">
            {/* Blue informational banner — sets expectations for the agentic run. */}
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[var(--info)]/25 bg-[var(--info-soft)] px-4 py-2.5 text-[13px] text-[var(--info)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span className="leading-relaxed">
                Synthetic personas debate this campaign live on Groq, one reply at a
                time — severity signals are sourced from the red-team verdicts.
              </span>
            </div>

            {displayPersonas.length > 0 && (
              <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/40 p-3 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-3 px-1">
                  <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                    {debating && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
                      </span>
                    )}
                    The panel
                  </p>
                  {(round > 0 || maxRounds > 0) && (
                    <Badge variant="outline">
                      Round {round || 1} / {maxRounds || "—"}
                    </Badge>
                  )}
                </div>
                <PersonaRoster
                  personas={displayPersonas}
                  activeId={activeSpeaker}
                  thinking={thinking}
                  verdicts={selectedRun.verdicts}
                />
              </div>
            )}

            {/* Auto-scrolling chat thread. */}
            <div className="flex max-h-[68vh] min-h-[40vh] flex-col gap-4 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent)] p-3 sm:p-5">
              {renderMessages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                  <ThinkingIndicator />
                  <p className="max-w-xs text-[13px] text-[var(--fg-muted)]">
                    {status || "Convening the boardroom…"}
                  </p>
                </div>
              )}
              {renderMessages.map((m, i, arr) => {
                const prev = arr[i - 1];
                const showDivider = !prev || prev.round !== m.round;
                return (
                  <div key={m.id} className="flex flex-col gap-4">
                    {showDivider && (
                      <div className="flex items-center justify-center gap-3 py-1">
                        <span className="h-px w-10 bg-[var(--border)]" />
                        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev-1)]/70 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                          Round {m.round}
                        </span>
                        <span className="h-px w-10 bg-[var(--border)]" />
                      </div>
                    )}
                    <ChatBubble
                      message={m}
                      severity={personaSeverity(m.speakerId, selectedRun.verdicts)}
                    />
                  </div>
                );
              })}
              <div ref={transcriptEndRef} />
            </div>

            {transcript && !debating && <DecisionCard transcript={transcript} />}
          </div>

          {/* Right: browsable history of every debate iteration for this run.
              Drops to a full-width row below the debate on narrower screens. */}
          {iterations.length > 0 && (
            <aside className="lg:col-span-2 xl:col-span-1 xl:sticky xl:top-24 xl:self-start">
              <IterationTimeline
                iterations={iterations}
                currentId={transcript?.id ?? null}
                debating={debating}
                onSelect={viewIteration}
              />
            </aside>
          )}
        </div>
      )}
    </PageShell>
  );
}

export function BoardroomMode() {
  return (
    <Suspense
      fallback={
        <PageShell footer={false} wide>
          <div className="shimmer h-40 rounded-2xl" />
        </PageShell>
      }
    >
      <BoardroomInner />
    </Suspense>
  );
}
