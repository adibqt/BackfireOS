"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────
   Boardroom Mode — advertisement / sign-in wall.

   Shown to logged-out visitors who open /boardroom. The live room is a
   member surface, so instead of an empty gate we run a self-playing
   recreation of an actual session: the four personas argue a campaign
   round by round and the room hands down a verdict, on a loop. Pure
   CSS + a small timeline state machine, reusing the app's persona
   tones and motion vocabulary so the ad looks like the product.
   ────────────────────────────────────────────────────────────────── */

const LOGIN_HREF = "/login?redirect=/boardroom";
const SIGNUP_HREF = "/signup";

type Stance = "Advocate" | "Adversary" | "Skeptic" | "Guardian";

type Persona = {
  id: string;
  name: string;
  initials: string;
  stance: Stance;
  role: string;
  /** avatar tile colour */
  chip: string;
  ring: string;
  /** chat-bubble tint */
  bubble: string;
  /** glow behind the active bubble */
  glow: string;
  side: "left" | "right";
};

const PERSONAS: Persona[] = [
  {
    id: "brand_manager",
    name: "Brand Manager",
    initials: "BM",
    stance: "Advocate",
    role: "Defends the campaign and pushes to ship. Every other seat has to get past them.",
    chip: "bg-[var(--success-soft)] text-[var(--success)]",
    ring: "ring-[var(--success)]/25",
    bubble: "bg-[var(--success-soft)] border-[var(--success)]/20",
    glow: "rgba(52,211,153,0.16)",
    side: "right",
  },
  {
    id: "activist",
    name: "The Activist",
    initials: "AC",
    stance: "Adversary",
    role: "Hunts cultural, religious, and regulatory harm. Argues for pulling the line.",
    chip: "bg-[var(--danger-soft)] text-[var(--danger)]",
    ring: "ring-[var(--danger)]/30",
    bubble: "bg-[var(--danger-soft)] border-[var(--danger)]/20",
    glow: "rgba(248,113,113,0.18)",
    side: "left",
  },
  {
    id: "journalist",
    name: "Cynical Journalist",
    initials: "CJ",
    stance: "Skeptic",
    role: "Writes the worst fair headline your campaign could earn, then asks you to disprove it.",
    chip: "bg-[var(--warning-soft)] text-[var(--warning)]",
    ring: "ring-[var(--warning)]/25",
    bubble: "bg-[var(--warning-soft)] border-[var(--warning)]/20",
    glow: "rgba(251,191,36,0.16)",
    side: "left",
  },
  {
    id: "brand_purist",
    name: "Brand Purist",
    initials: "BP",
    stance: "Guardian",
    role: "Holds the line against your own back catalogue. Flags the moment you contradict yourself.",
    chip: "bg-[var(--accent-soft)] text-[var(--accent-200)]",
    ring: "ring-[var(--accent)]/25",
    bubble: "bg-[var(--accent-soft)] border-[var(--accent)]/20",
    glow: "rgba(255,77,87,0.16)",
    side: "left",
  },
];

/** The scripted session the ad replays. Speaking order matches the product. */
const TRIAL_SLOGAN = "Your village, now cashless.";
const SCRIPT: { persona: Persona; text: string }[] = [
  {
    persona: PERSONAS[0],
    text: "This line tested well in Dhaka. It is short, it is hopeful, and it ships Monday. I am asking for a greenlight.",
  },
  {
    persona: PERSONAS[1],
    text: "“Now cashless” is a verdict on rural life, not an offer. In Rangpur it reads as the city telling the village its money was wrong.",
  },
  {
    persona: PERSONAS[2],
    text: "The headline writes itself: “App declares 60 million villagers obsolete.” Show me the rollout actually reaches them first.",
  },
  {
    persona: PERSONAS[3],
    text: "Two campaigns ago we stood for banking that meets people where they are. This line contradicts our own promise.",
  },
];

const VERDICT = {
  label: "Revise",
  confidence: 72,
  summary:
    "Strong hook, wrong register for the audience it names. Re-cut the line so the village is the hero, not the problem.",
  conditions: [
    "Reframe “cashless” as a choice, not a correction.",
    "Pressure-test the rural cut with a Rangpur focus group.",
  ],
};

/* Timeline driving the looped replay. Each frame holds for `hold` ms, then
   advances; the last frame (verdict) holds longest before looping. */
type Frame = { revealed: number; active: number | null; verdict: boolean; hold: number };
const TIMELINE: Frame[] = [
  { revealed: 0, active: 0, verdict: false, hold: 700 },
  { revealed: 1, active: null, verdict: false, hold: 1600 },
  { revealed: 1, active: 1, verdict: false, hold: 700 },
  { revealed: 2, active: null, verdict: false, hold: 1700 },
  { revealed: 2, active: 2, verdict: false, hold: 700 },
  { revealed: 3, active: null, verdict: false, hold: 1700 },
  { revealed: 3, active: 3, verdict: false, hold: 700 },
  { revealed: 4, active: null, verdict: false, hold: 1500 },
  { revealed: 4, active: null, verdict: true, hold: 4400 },
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

/* ── Small pieces ─────────────────────────────────────────────────── */

function Avatar({ persona, active = false }: { persona: Persona; active?: boolean }) {
  return (
    <span
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-semibold ring-1 ring-inset transition-shadow",
        persona.chip,
        persona.ring,
        active && "shadow-[0_0_0_3px_rgba(255,255,255,0.06)]"
      )}
    >
      {persona.initials}
    </span>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
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

function StanceChip({ persona }: { persona: Persona }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-transparent px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
        persona.chip
      )}
    >
      {persona.stance}
    </span>
  );
}

/* ── The self-playing session (centerpiece) ───────────────────────── */

function LiveSession() {
  const reduce = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return; // no animation; render the derived final frame
    const id = window.setTimeout(
      () => setStep((s) => (s + 1) % TIMELINE.length),
      TIMELINE[step].hold
    );
    return () => window.clearTimeout(id);
  }, [step, reduce]);

  // On reduced motion, settle on the fully-resolved verdict frame.
  const frame = reduce ? TIMELINE[TIMELINE.length - 1] : TIMELINE[step];

  // Keep the newest line in view as the debate unfolds (skip on reduced motion).
  useEffect(() => {
    if (reduce) return;
    const el = scrollerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [step, reduce]);

  const shown = SCRIPT.slice(0, frame.revealed);

  return (
    <div className="relative mx-auto mt-14 max-w-5xl overflow-hidden px-1 text-left md:mt-16">
      {/* Ambient glow under the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-10 -top-6 -z-10 rounded-[44px] bg-[radial-gradient(ellipse_72%_60%_at_50%_45%,rgba(255,77,87,0.20),transparent_70%)] blur-3xl"
      />

      <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.005))] shadow-[0_44px_130px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        {/* App chrome */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elev-1)]/60 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/60" />
          </div>
          <div className="flex h-6 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-mono text-[11px] text-[var(--fg-subtle)]">
            <span className="truncate">backfire.os/boardroom</span>
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[var(--accent)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              in session
            </span>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-[15rem_minmax(0,1fr)]">
          {/* Left: the campaign on trial + roster */}
          <aside className="order-2 border-b border-[var(--border)] bg-[var(--bg-elev-1)]/30 p-4 md:order-none md:border-b-0 md:border-r">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">
              Campaign on trial
            </p>
            <blockquote className="mt-2.5 rounded-xl border border-[var(--border)] bg-white/[0.02] px-3.5 py-3">
              <p className="font-display text-[14px] font-semibold leading-snug tracking-tight text-[var(--fg)] sm:text-[16px]">
                “{TRIAL_SLOGAN}”
              </p>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                bKash-style fintech · rural launch
              </p>
            </blockquote>

            <p className="mb-2.5 mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
              The panel
            </p>
            <ul className="space-y-1.5">
              {PERSONAS.map((p, i) => {
                const active = frame.active === i && !frame.verdict;
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-2 py-1.5 transition-colors duration-200",
                      active
                        ? "border-[var(--border-bright)] bg-white/[0.05]"
                        : "border-[var(--border)] bg-transparent"
                    )}
                  >
                    <Avatar persona={p} active={active} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-[var(--fg)]">
                      {p.name}
                    </span>
                    {active && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent)]" />
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right: the live transcript */}
          <div
            ref={scrollerRef}
            className="order-1 flex h-[min(420px,55vh)] min-h-[280px] flex-col gap-4 overflow-x-clip overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.015),transparent)] p-4 sm:h-[420px] sm:overflow-hidden sm:p-5 md:order-none"
          >
            <div className="flex items-center justify-center gap-3 pt-0.5">
              <span className="h-px w-8 bg-[var(--border)]" />
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg-elev-1)]/70 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                Round 1
              </span>
              <span className="h-px w-8 bg-[var(--border)]" />
            </div>

            {shown.map(({ persona, text }, i) => {
              const right = persona.side === "right";
              const isNewest = i === shown.length - 1 && !frame.verdict && frame.active === null;
              return (
                <div
                  key={`${persona.id}-${i}`}
                  className={cn("slide-in-right flex items-end gap-2.5", right && "flex-row-reverse")}
                >
                  <Avatar persona={persona} />
                  <div
                    className={cn(
                      "flex min-w-0 max-w-[calc(100%-2.75rem)] flex-col sm:max-w-[86%]",
                      right ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 flex max-w-full flex-wrap items-center gap-2 px-1",
                        right && "justify-end"
                      )}
                    >
                      <span className="font-display text-[12px] font-semibold tracking-tight text-[var(--fg)] sm:text-[12.5px]">
                        {persona.name}
                      </span>
                      <StanceChip persona={persona} />
                    </div>
                    <div
                      className={cn(
                        "w-full rounded-2xl border px-3 py-2.5 text-[13px] leading-relaxed text-[var(--fg)] backdrop-blur-xl sm:px-3.5 sm:text-[13.5px]",
                        persona.bubble,
                        right ? "rounded-br-sm" : "rounded-bl-sm"
                      )}
                    >
                      <p>
                        {text}
                        {isNewest && (
                          <span className="blink-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-current align-middle" />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* The persona currently taking the floor */}
            {frame.active !== null && !frame.verdict && (
              <div
                className={cn(
                  "slide-in-right flex items-end gap-2.5",
                  PERSONAS[frame.active].side === "right" && "flex-row-reverse"
                )}
              >
                <Avatar persona={PERSONAS[frame.active]} active />
                <div
                  className={cn(
                    "flex min-w-0 max-w-[calc(100%-2.75rem)] flex-col sm:max-w-[86%]",
                    PERSONAS[frame.active].side === "right" ? "items-end" : "items-start"
                  )}
                >
                  <span className="mb-1 px-1 font-display text-[12px] font-semibold tracking-tight text-[var(--fg)] sm:text-[12.5px]">
                    {PERSONAS[frame.active].name}
                  </span>
                  <div
                    className={cn(
                      "w-full rounded-2xl border px-3 py-2.5 backdrop-blur-xl sm:px-3.5",
                      PERSONAS[frame.active].bubble,
                      PERSONAS[frame.active].side === "right" ? "rounded-br-sm" : "rounded-bl-sm"
                    )}
                    style={{ boxShadow: `0 0 44px -20px ${PERSONAS[frame.active].glow}` }}
                  >
                    <ThinkingDots />
                  </div>
                </div>
              </div>
            )}

            {/* The verdict the room converges on */}
            {frame.verdict && (
              <div className="fade-up relative mt-auto overflow-hidden rounded-2xl border border-[var(--warning)]/30 bg-[linear-gradient(180deg,rgba(251,191,36,0.08),rgba(255,255,255,0.005))] px-5 py-4">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.22),transparent_70%)] blur-2xl"
                />
                <div className="relative">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                    Boardroom recommendation
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-[var(--warning)] sm:text-[30px]">
                      {VERDICT.label}
                    </span>
                    <Badge variant="warning" dot>
                      {VERDICT.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
                    {VERDICT.summary}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {VERDICT.conditions.map((c) => (
                      <li
                        key={c}
                        className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--fg-muted)]"
                      >
                        <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        A replay of a real session · sign in to run your own
      </p>
    </div>
  );
}

/* ── Section pieces ───────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Put a campaign on trial",
    desc: "Pick a finished simulation. Its slogan, brief, and red-team severity scores become the evidence on the table.",
  },
  {
    n: "02",
    title: "Watch the rounds",
    desc: "The panel debates live, one reply at a time, each attack citing the exact copy and the score behind it.",
  },
  {
    n: "03",
    title: "Read the verdict",
    desc: "The room converges on a call, with a confidence score and the conditions to clear before launch.",
  },
];

const OUTCOMES = [
  {
    label: "Greenlight",
    variant: "success" as const,
    desc: "The room backs the line as written. Ship it.",
  },
  {
    label: "Revise",
    variant: "warning" as const,
    desc: "Close, but conditional. The panel lists what to fix first.",
  },
  {
    label: "Kill",
    variant: "danger" as const,
    desc: "The risk outweighs the upside. Spike it before it spikes you.",
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

export function BoardroomAd() {
  return (
    <PageShell>
      {/* ── Hero ── */}
      <section className="relative overflow-x-clip pb-10 pt-4 text-center md:pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[620px] w-[min(100vw,1100px)] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_55%_at_50%_0%,rgba(255,77,87,0.26),transparent_70%)] blur-3xl"
        />
        <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[620px] opacity-60" aria-hidden />

        <div className="mx-auto max-w-3xl">
          <div
            className="fade-up mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev-1)]/60 py-1 pl-2.5 pr-3 text-[12px] backdrop-blur"
          >
            <LockIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
              Boardroom Mode
            </span>
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span className="text-[var(--fg-muted)]">Members only</span>
          </div>

          <h1
            className="fade-up mt-7 font-display font-semibold leading-[1.03] tracking-tight text-[var(--fg)]"
            style={{ animationDelay: "60ms", fontSize: "clamp(2.5rem, 6vw, 4.75rem)", textWrap: "balance" }}
          >
            The room where your campaign gets{" "}
            <span className="text-gradient-accent">cross-examined.</span>
          </h1>

          <p
            className="fade-up mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[19px]"
            style={{ animationDelay: "120ms" }}
          >
            Four adversarial personas take your slogan apart in a live, multi-round
            debate, then hand down one call: greenlight, revise, or kill. You read
            every word before the internet gets its turn.
          </p>

          <div
            className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
              <LockIcon />
              Sign in to enter the room
            </ButtonLink>
            <ButtonLink href={SIGNUP_HREF} variant="secondary" size="xl">
              Create a free account
            </ButtonLink>
          </div>

          <p
            className="fade-up mx-auto mt-5 text-[13px] text-[var(--fg-subtle)]"
            style={{ animationDelay: "240ms" }}
          >
            Free account. Your runs and debates stay private to you.
          </p>
        </div>

        {/* Live centerpiece */}
        <div className="fade-up" style={{ animationDelay: "320ms" }}>
          <LiveSession />
        </div>
      </section>

      {/* ── The panel ── */}
      <section className="mb-28 mt-24 md:mb-36 md:mt-32">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> The panel
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Four seats. Four ways your campaign gets torn down.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Three critics face the one voice defending the work. Each adversary
            carries its real red-team severity into the room, so the loudest seat
            is the one with the most to back it up.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PERSONAS.map((p, i) => (
            <div
              key={p.id}
              className="card-glow flex flex-col rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-3.5">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-[14px] font-semibold ring-1 ring-inset",
                    p.chip,
                    p.ring
                  )}
                >
                  {p.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-semibold tracking-tight text-[var(--fg)]">
                    {p.name}
                  </h3>
                  <StanceChip persona={p} />
                </div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--fg-muted)]">{p.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How a session runs ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            How a session runs.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            One campaign, a few rounds of argument, and a verdict you can stand
            behind. It takes about as long as reading this page.
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
              className="lift relative rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl"
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

      {/* ── The verdict ── */}
      <section className="mb-28 md:mb-36">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(135deg,#1a0d12,#0a0708)] p-8 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,77,87,0.22),transparent_60%)] blur-3xl"
          />
          <div className="relative grid items-start gap-10 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
                It ends in a call you can defend.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
                No vibes, no single gut check. The room converges on one of three
                outcomes, with a confidence score and the exact conditions behind
                it. Every session is saved as an iteration, so you can re-run it on
                a counterfactual variant and watch the verdict move.
              </p>
            </div>
            <div className="space-y-3">
              {OUTCOMES.map((o) => (
                <div
                  key={o.label}
                  className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/70 p-4 backdrop-blur"
                >
                  <Badge variant={o.variant} dot className="shrink-0">
                    {o.label}
                  </Badge>
                  <p className="text-[14px] leading-relaxed text-[var(--fg-muted)]">{o.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final gate ── */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.005))] px-8 py-16 text-center backdrop-blur-xl md:px-12 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(255,77,87,0.18),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
              <LockIcon className="h-5 w-5" />
            </span>
            <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-5xl">
              This room is members only.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Take your seat at the table. Sign in to convene the panel on your own
              campaign, or create a free account in under a minute. The room is
              already waiting.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
                Sign in to enter the room
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
