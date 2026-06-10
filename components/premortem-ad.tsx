"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

/* ──────────────────────────────────────────────────────────────────
   Pre-Mortem Generator — advertisement / sign-in wall.

   Shown to logged-out visitors who open /post-mortem. The generator is a
   member surface, so instead of an empty gate we run a self-playing
   recreation: a forward-dated post-mortem assembles itself section by
   section — the headline that broke, the apology the brand was forced to
   publish, the timeline — on a loop. Pure CSS + a small timeline state
   machine, reusing the app's motion vocabulary so the ad looks like the
   product.
   ────────────────────────────────────────────────────────────────── */

const LOGIN_HREF = "/login?redirect=/post-mortem";
const SIGNUP_HREF = "/signup";

/* The sample obituary the ad assembles. */
const SAMPLE = {
  failureLabel: "Regulatory Breach",
  publishDate: "12 December 2026",
  slogan: "Stock up before your neighbours do.",
  brand: "a national retailer",
  headline:
    "Regulator orders “Stock up” campaign pulled; brand fined under hoarding law",
  dek: "The line the red team scored at 88 shipped anyway — and detonated within three weeks.",
  apology:
    "We got it wrong. Our “Stock up before your neighbours do” campaign encouraged exactly the behaviour the Essential Commodities Act exists to prevent, and we ignored a clear warning that it would. The harm fell on the customers we claimed to serve. We are sorry.",
  timeline: [
    "Week 1 — the campaign launched on schedule despite a Backfire Score of 81/100.",
    "Week 2 — a regulator issued a notice; the scarcity framing was cited directly.",
    "Week 4 — the line became shorthand for everything we said we were not.",
  ],
} as const;

/* Reveal timeline. Each frame holds for `hold` ms, then advances; the final
   frame holds longest before looping. `step` indexes how many blocks are shown. */
type Frame = { revealed: number; hold: number };
const TIMELINE: Frame[] = [
  { revealed: 1, hold: 1400 }, // headline
  { revealed: 2, hold: 1600 }, // + dek
  { revealed: 3, hold: 2600 }, // + apology
  { revealed: 4, hold: 2600 }, // + timeline
  { revealed: 4, hold: 3200 }, // hold the full document
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

/* ── The self-assembling document (centerpiece) ───────────────────── */

function LiveObituary() {
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

  const revealed = reduce
    ? TIMELINE[TIMELINE.length - 1].revealed
    : TIMELINE[step].revealed;

  return (
    <div className="relative mx-auto mt-14 max-w-3xl px-1 text-left md:mt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-10 -top-6 -z-10 rounded-[44px] bg-[radial-gradient(ellipse_72%_60%_at_50%_45%,rgba(255,77,87,0.18),transparent_70%)] blur-3xl"
      />

      <article className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.005))] shadow-[0_44px_130px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        {/* Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3.5 sm:px-7">
          <Badge variant="danger" dot>
            {SAMPLE.failureLabel}
          </Badge>
          <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            Post-mortem · {SAMPLE.publishDate}
          </p>
        </div>

        <div className="space-y-6 px-5 py-7 sm:px-8 sm:py-8">
          {/* Headline */}
          <div className="slide-in-right">
            <h3 className="font-display text-[22px] font-semibold leading-[1.12] tracking-tight text-[var(--fg)] sm:text-[28px]">
              {SAMPLE.headline}
              {revealed === 1 && (
                <span className="blink-caret ml-1 inline-block h-5 w-[2px] translate-y-0.5 bg-[var(--fg)] align-middle" />
              )}
            </h3>
          </div>

          {/* Dek */}
          {revealed >= 2 && (
            <p className="slide-in-right max-w-2xl text-[15px] italic leading-relaxed text-[var(--fg-muted)]">
              {SAMPLE.dek}
            </p>
          )}

          {/* Apology */}
          {revealed >= 3 && (
            <section className="slide-in-right relative overflow-hidden rounded-2xl border border-[var(--danger)]/30 bg-[linear-gradient(180deg,rgba(248,113,113,0.08),transparent)] px-5 py-5">
              <span
                aria-hidden
                className="absolute left-0 top-0 h-full w-[3px] bg-[var(--danger)]"
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
                The apology we were forced to publish
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--fg)]">
                {SAMPLE.apology}
              </p>
            </section>
          )}

          {/* Timeline */}
          {revealed >= 4 && (
            <section className="slide-in-right">
              <h4 className="mb-2 flex items-center gap-2.5 font-display text-[15px] font-semibold tracking-tight text-[var(--fg)]">
                <span className="inline-block h-3.5 w-[3px] rounded-full bg-[var(--danger)]" />
                How it unravelled
              </h4>
              <ul className="space-y-2.5 pl-[14px]">
                {SAMPLE.timeline.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-[var(--fg-muted)]"
                  >
                    <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        A pre-mortem for “{SAMPLE.slogan}” · sign in to write your own
      </p>
    </div>
  );
}

/* ── Section pieces ───────────────────────────────────────────────── */

const STEPS = [
  {
    n: "01",
    title: "Pick a campaign that passed",
    desc: "Choose any completed simulation — or one of its counterfactual variants. Its worst red-team verdict becomes the failure you confront.",
  },
  {
    n: "02",
    title: "We assume it shipped",
    desc: "Backfire treats the harshest finding as the disaster that already happened, six months on, and writes the document in past tense.",
  },
  {
    n: "03",
    title: "Read the apology you'd publish",
    desc: "The headline, the blowback timeline, the regulatory exposure, and the public apology — the obituary you only ever want to read in advance.",
  },
];

const CLASSES = [
  { label: "Regulatory Breach", variant: "danger" as const, desc: "Scarcity or misleading copy that draws an enforcement notice." },
  { label: "Cultural Backlash", variant: "warning" as const, desc: "A line that reads as tone-deaf to a region, class, or faith." },
  { label: "Reputational Crisis", variant: "accent" as const, desc: "A claim the brand could not back up, exposed in public." },
  { label: "Competitive Hijack", variant: "info" as const, desc: "An opening a rival weaponises against you." },
  { label: "Brand-Integrity Collapse", variant: "accent" as const, desc: "A campaign that contradicts everything you said you stood for." },
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

export function PreMortemAd() {
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
          <div className="fade-up mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev-1)]/60 py-1 pl-2.5 pr-3 text-[12px] backdrop-blur">
            <LockIcon className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
              Regulatory Pre-Mortem
            </span>
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span className="text-[var(--fg-muted)]">Members only</span>
          </div>

          <h1
            className="fade-up mt-7 font-display font-semibold leading-[1.03] tracking-tight text-[var(--fg)]"
            style={{ animationDelay: "60ms", fontSize: "clamp(2.5rem, 6vw, 4.75rem)", textWrap: "balance" }}
          >
            Read the apology{" "}
            <span className="text-gradient-accent">before you have to publish it.</span>
          </h1>

          <p
            className="fade-up mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[19px]"
            style={{ animationDelay: "120ms" }}
          >
            Backfire takes a campaign’s worst plausible outcome and writes the
            post-mortem you’d be forced to publish six months from now — headline,
            blast radius, and the public apology. Confront the blind spot before it
            costs you.
          </p>

          <div
            className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "180ms" }}
          >
            <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
              <LockIcon />
              Sign in to write a pre-mortem
            </ButtonLink>
            <ButtonLink href={SIGNUP_HREF} variant="secondary" size="xl">
              Create a free account
            </ButtonLink>
          </div>

          <p
            className="fade-up mx-auto mt-5 text-[13px] text-[var(--fg-subtle)]"
            style={{ animationDelay: "240ms" }}
          >
            Free account. Your runs and reports stay private to you.
          </p>
        </div>

        {/* Live centerpiece */}
        <div className="fade-up" style={{ animationDelay: "320ms" }}>
          <LiveObituary />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mb-28 mt-24 md:mb-36 md:mt-32">
        <div className="mb-12">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> How it works
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            The obituary, written in advance.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            It takes about as long as reading this page — and it’s a great deal
            cheaper than the real thing.
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

      {/* ── Failure classes ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Five ways a campaign ends up in the obituaries.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Backfire reads which critic scored hardest and writes the failure in
            its register — a regulatory blow-up reads nothing like a cultural one.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {CLASSES.map((c, i) => (
            <div
              key={c.label}
              className="card-glow flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-5 backdrop-blur-xl"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Badge variant={c.variant} dot className="mt-0.5 shrink-0">
                {c.label}
              </Badge>
              <p className="text-[14px] leading-relaxed text-[var(--fg-muted)]">{c.desc}</p>
            </div>
          ))}
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
              Write the post-mortem you’ll never have to publish.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Sign in to generate a pre-mortem on your own campaign, or create a
              free account in under a minute.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
                Sign in to begin
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
