"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────
   Counterfactual Branching — advertisement / sign-in wall.

   Shown to logged-out visitors who open /branches. The live branch
   tree is a member surface, so instead of an empty gate we run a
   self-playing recreation of the real surface: a top-down tidy tree
   where an original slogan ("main") is forked, the Resonance /
   Backfire scores propagate as each variant is rescored, and the tree
   settles on the winning leaf, on a loop. Mirrors the live tree's
   shape (root at the top, forks fanning out beneath, generation rails).
   ────────────────────────────────────────────────────────────────── */

const LOGIN_HREF = "/login?redirect=/branches";
const SIGNUP_HREF = "/signup";

/* ── The demo tree ────────────────────────────────────────────────── */

type TreeNode = {
  id: string;
  parentId: string | null;
  label: string;
  slogan: string;
  /** Generation / depth (0 = root). */
  gen: number;
  /** Center position on the fixed canvas, in px. */
  x: number;
  y: number;
  /** Higher is better. */
  resonance: number;
  /** Backfire risk — higher is worse. */
  backfire: number;
};

const CANVAS_W = 680;
const CANVAS_H = 440;
const NODE_W = 192;
const NODE_H = 100;

const NODES: TreeNode[] = [
  {
    id: "main",
    parentId: null,
    label: "main",
    slogan: "Your village, now cashless.",
    gen: 0,
    x: 340,
    y: 58,
    resonance: 42,
    backfire: 88,
  },
  {
    id: "louder",
    parentId: "main",
    label: "louder",
    slogan: "Ditch the cash. Welcome to the future.",
    gen: 1,
    x: 178,
    y: 212,
    resonance: 58,
    backfire: 81,
  },
  {
    id: "local",
    parentId: "main",
    label: "local",
    slogan: "Money that already speaks Bangla.",
    gen: 1,
    x: 502,
    y: 212,
    resonance: 76,
    backfire: 29,
  },
  {
    id: "ship",
    parentId: "local",
    label: "ship",
    slogan: "Your money, your village, no middleman.",
    gen: 2,
    x: 502,
    y: 366,
    resonance: 81,
    backfire: 24,
  },
];

const WINNER_ID = "ship";
const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
const RAIL_Y = [...new Set(NODES.map((n) => n.y))].sort((a, b) => a - b);

type Frame = { gen: number; highlight: boolean; hold: number };
const TIMELINE: Frame[] = [
  { gen: 0, highlight: false, hold: 1500 },
  { gen: 1, highlight: false, hold: 2300 },
  { gen: 2, highlight: false, hold: 1800 },
  { gen: 2, highlight: true, hold: 4600 },
];

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/* ── Node pieces ──────────────────────────────────────────────────── */

function MiniMetric({
  letter,
  value,
  good,
  filled,
}: {
  letter: string;
  value: number;
  /** Whether a high value is good (Resonance) or bad (Backfire). */
  good: boolean;
  filled: boolean;
}) {
  const color = good ? "var(--success)" : "var(--danger)";
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="font-mono text-[10px] font-semibold" style={{ color }}>
        {letter}
      </span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elev-3)]">
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: filled ? `${value}%` : "0%", backgroundColor: color }}
        />
      </span>
      <span
        className="font-mono text-[11px] font-semibold tabular-nums transition-opacity duration-500"
        style={{ color, opacity: filled ? 1 : 0 }}
      >
        {value}
      </span>
    </div>
  );
}

function TreeNodeCard({
  node,
  visible,
  winner,
}: {
  node: TreeNode;
  visible: boolean;
  winner: boolean;
}) {
  const isRoot = node.parentId === null;
  return (
    <div
      className="absolute"
      style={{ left: node.x, top: node.y, width: NODE_W, transform: "translate(-50%, -50%)" }}
    >
      <div
        className={cn(
          "rounded-2xl border p-3 transition-all duration-500",
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
          winner
            ? "border-[var(--success)]/45 bg-[var(--success-soft)] shadow-[0_0_44px_-12px_rgba(52,211,153,0.45)]"
            : isRoot
              ? "border-[var(--border-strong)] bg-[var(--bg-surface)]"
              : "border-[var(--border)] bg-[var(--bg-surface)]"
        )}
        style={{ height: NODE_H }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Badge variant={winner ? "success" : isRoot ? "outline" : "accent"}>
            {isRoot ? "● " : "⎇ "}
            {node.label}
          </Badge>
          {winner && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--success)]">
              ship it
            </span>
          )}
        </div>
        <p className="line-clamp-2 font-display text-[12.5px] font-semibold leading-snug tracking-tight text-[var(--fg)]">
          “{node.slogan}”
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <MiniMetric letter="R" value={node.resonance} good filled={visible} />
          <MiniMetric letter="B" value={node.backfire} good={false} filled={visible} />
        </div>
      </div>
    </div>
  );
}

/* ── The self-playing branch tree (centerpiece) ───────────────────── */

function LiveTree() {
  const reduce = usePrefersReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setTimeout(
      () => setStep((s) => (s + 1) % TIMELINE.length),
      TIMELINE[step].hold
    );
    return () => window.clearTimeout(id);
  }, [step, reduce]);

  const frame = reduce ? TIMELINE[TIMELINE.length - 1] : TIMELINE[step];
  const done = frame.highlight;

  return (
    <div className="relative mx-auto mt-14 max-w-4xl overflow-hidden px-1 text-left md:mt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-10 -top-6 -z-10 rounded-[44px] bg-[radial-gradient(ellipse_72%_60%_at_50%_45%,var(--aurora-1),transparent_70%)] blur-3xl"
      />

      <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]">
        {/* App chrome */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/60" />
          </div>
          <div className="flex h-6 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-mono text-[11px] text-[var(--fg-subtle)]">
            <span className="truncate">backfire.os/branches</span>
            <span className={cn("ml-auto inline-flex shrink-0 items-center gap-1.5", done ? "text-[var(--success)]" : "text-[var(--accent)]")}>
              <span className="relative flex h-2 w-2">
                {!done && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", done ? "bg-[var(--success)]" : "bg-[var(--accent)]")} />
              </span>
              {done ? "tree saved" : "rescoring"}
            </span>
          </div>
        </div>

        {/* Tree canvas (scrolls horizontally on narrow screens, like the live tree) */}
        <div className="max-w-full overflow-x-auto p-4 sm:p-5">
          <div className="relative mx-auto max-w-full" style={{ width: CANVAS_W, height: CANVAS_H }}>
            {/* Generation rails + connectors */}
            <svg
              className="absolute inset-0"
              width={CANVAS_W}
              height={CANVAS_H}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
              fill="none"
              aria-hidden
            >
              {RAIL_Y.map((y, depth) => (
                <g key={`rail-${depth}`}>
                  <line
                    x1={16}
                    x2={CANVAS_W - 16}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="2 6"
                    strokeWidth={1}
                  />
                  <text
                    x={18}
                    y={y + 3}
                    fill="var(--fg-faint)"
                    className="font-mono"
                    style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}
                  >
                    {depth === 0 ? "gen 0 · root" : `gen ${depth}`}
                  </text>
                </g>
              ))}

              {NODES.filter((n) => n.parentId).map((n) => {
                const parent = NODE_BY_ID.get(n.parentId!)!;
                const x1 = parent.x;
                const y1 = parent.y + NODE_H / 2;
                const x2 = n.x;
                const y2 = n.y - NODE_H / 2;
                const my = (y1 + y2) / 2;
                const visible = n.gen <= frame.gen;
                const isWinnerEdge = done && n.id === WINNER_ID;
                return (
                  <path
                    key={`edge-${n.id}`}
                    d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
                    stroke={isWinnerEdge ? "var(--success)" : "var(--accent)"}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray={520}
                    strokeDashoffset={visible ? 0 : 520}
                    style={{
                      opacity: visible ? (isWinnerEdge ? 0.75 : 0.5) : 0,
                      transition: "stroke-dashoffset 700ms ease-out, opacity 500ms ease, stroke 400ms ease",
                    }}
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {NODES.map((n) => (
              <TreeNodeCard
                key={n.id}
                node={n}
                visible={n.gen <= frame.gen}
                winner={done && n.id === WINNER_ID}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        A replay of a real branch tree · sign in to fork your own
      </p>
    </div>
  );
}

/* ── Section data ─────────────────────────────────────────────────── */

const FIELDS = [
  { name: "Slogan", desc: "The headline everything else hangs on." },
  { name: "Cast", desc: "Family, a celebrity, Gen-Z. Who is in the frame." },
  { name: "Tagline", desc: "The supporting line under the hook." },
  { name: "Call to action", desc: "Download, sign up, try. The ask you make." },
  { name: "Risky line", desc: "Drop in a provocation and see what it costs you." },
  { name: "Tone", desc: "Earnest, playful, bold. Shift the whole read." },
];

const STEPS = [
  {
    n: "01",
    title: "Fork a branch",
    desc: "Start from any finished campaign. Each fork is a timeline you can change without touching the original.",
  },
  {
    n: "02",
    title: "Tweak any field",
    desc: "Edit the slogan, swap the cast, soften the tone. An instant heuristic estimate moves as you type.",
  },
  {
    n: "03",
    title: "Score and compare",
    desc: "Send the branch to the red-team panel for an authoritative verdict, then keep the timeline that wins.",
  },
];

const SCORES = [
  {
    label: "Resonance",
    variant: "success" as const,
    desc: "How hard the line lands with the audience you want. Higher is better.",
  },
  {
    label: "Backfire risk",
    variant: "danger" as const,
    desc: "How likely it is to be turned against you. Lower is the goal.",
  },
];

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export function BranchesAd() {
  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className="relative overflow-x-clip pb-10 pt-4 text-center md:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[620px] w-[min(100vw,1100px)] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_55%_at_50%_0%,var(--aurora-1),transparent_70%)] blur-3xl"
        />
        <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[620px] opacity-60" aria-hidden />

        <div className="mx-auto max-w-3xl">
          <div className="fade-up mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1 pl-2.5 pr-3 text-[12px]">
            <LockIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
              Counterfactual Branching
            </span>
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span className="text-[var(--fg-muted)]">Members only</span>
          </div>

          <h1
            className="fade-up mt-7 font-display font-semibold leading-[1.03] tracking-tight text-[var(--fg)]"
            style={{ animationDelay: "60ms", fontSize: "clamp(2.5rem, 6vw, 4.75rem)", textWrap: "balance" }}
          >
            Fork the campaign before you{" "}
            <span className="text-gradient-accent">commit to it.</span>
          </h1>

          <p
            className="fade-up mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[19px]"
            style={{ animationDelay: "120ms" }}
          >
            Git for campaigns. Branch any slogan, change a single word, and watch
            the Resonance and Backfire scores move in real time. Keep the timeline
            that wins, throw away the ones that do not.
          </p>

          <div className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "180ms" }}>
            <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
              <LockIcon />
              Sign in to open the tree
            </ButtonLink>
            <ButtonLink href={SIGNUP_HREF} variant="secondary" size="xl">
              Create a free account
            </ButtonLink>
          </div>

          <p className="fade-up mx-auto mt-5 text-[13px] text-[var(--fg-subtle)]" style={{ animationDelay: "240ms" }}>
            Free account. Every fork, edit, and verdict is saved to your tree.
          </p>
        </div>

        {/* Live centerpiece */}
        <div className="fade-up" style={{ animationDelay: "320ms" }}>
          <LiveTree />
        </div>
      </section>

      {/* ── What you can branch ── */}
      <section className="mb-28 mt-24 md:mb-36 md:mt-32">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> The variables
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Change one thing. See everything move.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Six fields make up a campaign. Edit any of them on a branch and the
            scores recompute, so you can isolate exactly which choice carried the
            risk, or the resonance.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((f, i) => (
            <div
              key={f.name}
              className="card-glow flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <h3 className="font-display text-[15px] font-semibold tracking-tight text-[var(--fg)]">
                {f.name}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fg-muted)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Branch, tweak, compare.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            The same workflow you already trust from version control, pointed at
            the words instead of the code.
          </p>
        </div>
        <div className="relative grid gap-4 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-6 right-6 top-[44px] hidden h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent md:block"
          />
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="lift relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6"
            >
              <div className="relative z-10 mb-5 flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] font-mono text-[14px] font-semibold text-[var(--accent)]">
                {s.n}
                <span className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent-soft)] blur-xl" />
              </div>
              <h3 className="font-display text-[18px] font-semibold tracking-tight text-[var(--fg)]">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Two scores ── */}
      <section className="mb-28 md:mb-36">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] surface-dark-panel p-8 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,var(--aurora-1),transparent_60%)] blur-3xl"
          />
          <div className="relative grid items-start gap-10 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
                Two scores, one decision.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
                Every branch carries a live estimate as you type and an
                authoritative red-team verdict on demand. The win is the branch that
                pushes Resonance up while it pulls Backfire risk down.
              </p>
            </div>
            <div className="space-y-3">
              {SCORES.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4"
                >
                  <Badge variant={s.variant} dot className="shrink-0">
                    {s.label}
                  </Badge>
                  <p className="text-[14px] leading-relaxed text-[var(--fg-muted)]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final gate ── */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-8 py-16 text-center md:px-12 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,var(--aurora-1),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
              <LockIcon className="h-5 w-5" />
            </span>
            <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-5xl">
              The tree is members only.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Sign in to fork your own campaign and watch the scores move, or create
              a free account in under a minute. The best line is usually a few forks
              away from the first one.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
                Sign in to open the tree
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href={SIGNUP_HREF} variant="secondary" size="xl">
                Create a free account
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
