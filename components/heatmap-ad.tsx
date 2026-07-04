"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { MACRO_REGIONS, MARKET_CATALOG } from "@/lib/markets/catalog";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────
   Cultural Heat Map — advertisement / sign-in wall.

   Shown to logged-out visitors who open /heatmap. The live map is a
   member surface, so instead of an empty gate we run a self-playing
   recreation: a scan sweeps across emerging markets and each city
   fills with its cultural-risk severity, settling on the hottest
   tripwire, on a loop. Reuses the app's risk tones and the catalog's
   real cities so the ad looks like the product.
   ────────────────────────────────────────────────────────────────── */

const LOGIN_HREF = "/login?redirect=/heatmap";
const SIGNUP_HREF = "/signup";

type Level = "low" | "medium" | "high";

function levelOf(severity: number): Level {
  if (severity >= 70) return "high";
  if (severity >= 40) return "medium";
  return "low";
}

const LEVEL_TONE: Record<
  Level,
  { ring: string; text: string; bg: string; border: string; dot: string }
> = {
  low: {
    ring: "text-[var(--success)]",
    text: "text-[var(--success)]",
    bg: "bg-[var(--success-soft)]",
    border: "border-[var(--success)]/20",
    dot: "bg-[var(--success)]",
  },
  medium: {
    ring: "text-[var(--warning)]",
    text: "text-[var(--warning)]",
    bg: "bg-[var(--warning-soft)]",
    border: "border-[var(--warning)]/20",
    dot: "bg-[var(--warning)]",
  },
  high: {
    ring: "text-[var(--danger)]",
    text: "text-[var(--danger)]",
    bg: "bg-[var(--danger-soft)]",
    border: "border-[var(--danger)]/20",
    dot: "bg-[var(--danger)]",
  },
};

/** The scripted scan the ad replays — real catalog cities, ordered hottest first. */
type Market = { label: string; country: string; severity: number };
const SCAN: Market[] = [
  { label: "Rural Bangladesh", country: "Bangladesh", severity: 88 },
  { label: "Karachi", country: "Pakistan", severity: 76 },
  { label: "Dhaka", country: "Bangladesh", severity: 71 },
  { label: "Sylhet", country: "Bangladesh", severity: 58 },
  { label: "Delhi", country: "India", severity: 49 },
  { label: "Istanbul", country: "Turkey", severity: 44 },
  { label: "Chittagong", country: "Bangladesh", severity: 37 },
  { label: "Dubai", country: "UAE", severity: 31 },
  { label: "Singapore", country: "Singapore", severity: 22 },
];

const TRIAL_SLOGAN = "Your village, now cashless.";
const TOP_TRIPWIRE = {
  market: SCAN[0],
  kind: "Copy",
  reason:
    "“Now cashless” reads as a verdict on rural life, not an offer. The line lands as the city telling the village its money was wrong.",
};

const COUNTRY_COUNT = new Set(MARKET_CATALOG.map((m) => m.country)).size;
const MARKET_COUNT = MARKET_CATALOG.length;
const REGION_COUNT = MACRO_REGIONS.length;

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

/* ── Severity ring ────────────────────────────────────────────────── */

function Ring({ value, filled }: { value: number; filled: boolean }) {
  const r = 17;
  const sw = 3.5;
  const circ = 2 * Math.PI * r;
  const offset = filled ? circ - (Math.min(100, Math.max(0, value)) / 100) * circ : circ;
  const tone = LEVEL_TONE[levelOf(value)];

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-[var(--bg-elev-3)]" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={cn("transition-[stroke-dashoffset,color] duration-700 ease-out", filled ? tone.ring : "text-[var(--bg-elev-3)]")}
        />
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-mono text-[12px] font-bold text-[var(--fg)] transition-opacity duration-500",
          filled ? "opacity-100" : "opacity-0"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ── The self-playing scan (centerpiece) ──────────────────────────── */

function LiveScan() {
  const reduce = usePrefersReducedMotion();
  const [scanned, setScanned] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const total = SCAN.length;
    const atEnd = scanned >= total;
    const id = window.setTimeout(
      () => setScanned((s) => (s >= total ? 0 : s + 1)),
      atEnd ? 4400 : 300
    );
    return () => window.clearTimeout(id);
  }, [scanned, reduce]);

  const revealed = reduce ? SCAN.length : scanned;
  const done = revealed >= SCAN.length;

  return (
    <div className="relative mx-auto mt-14 max-w-5xl overflow-hidden px-1 text-left md:mt-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -bottom-10 -top-6 -z-10 rounded-[44px] bg-[radial-gradient(ellipse_72%_60%_at_50%_45%,rgba(255,77,87,0.20),transparent_70%)] blur-3xl"
      />

      <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--veil-strong)] shadow-[var(--shadow-hero)] backdrop-blur-xl">
        {/* App chrome */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elev-1)]/60 px-4 py-3">
          <div className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/60" />
          </div>
          <div className="flex h-6 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-mono text-[11px] text-[var(--fg-subtle)]">
            <span className="truncate">backfire.os/heatmap</span>
            <span className={cn("ml-auto inline-flex shrink-0 items-center gap-1.5", done ? "text-[var(--success)]" : "text-[var(--accent)]")}>
              <span className="relative flex h-2 w-2">
                {!done && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                )}
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", done ? "bg-[var(--success)]" : "bg-[var(--accent)]")} />
              </span>
              {done ? "scan complete" : "scanning"}
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              Cultural stress · “{TRIAL_SLOGAN}”
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
              <span className="tabular-nums text-[var(--fg-muted)]">{revealed}</span> / {SCAN.length} markets
            </p>
          </div>

          {/* Market grid with scan sweep */}
          <div className="relative overflow-hidden rounded-2xl">
            {!done && !reduce && (
              <div
                aria-hidden
                className="scan-sweep pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 bg-[linear-gradient(90deg,transparent,rgba(255,77,87,0.10),rgba(255,122,130,0.22),rgba(255,77,87,0.10),transparent)]"
              />
            )}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {SCAN.map((m, i) => {
                const filled = i < revealed;
                const tone = LEVEL_TONE[levelOf(m.severity)];
                const isTop = done && i === 0;
                return (
                  <div
                    key={m.label}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-3 transition-all duration-500",
                      filled
                        ? cn(tone.bg, tone.border)
                        : "border-[var(--border)] bg-[var(--bg-elev-1)]/30 opacity-60",
                      isTop && "ring-1 ring-[var(--danger)]/40"
                    )}
                  >
                    <Ring value={m.severity} filled={filled} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <p className="font-display text-[14px] font-semibold tracking-tight text-[var(--fg)]">
                          {m.label}
                        </p>
                        <span className="text-[11px] text-[var(--fg-subtle)]">{m.country}</span>
                      </div>
                      <p
                        className={cn(
                          "mt-1 font-mono text-[10px] uppercase tracking-wider transition-opacity duration-500",
                          filled ? cn("opacity-100", tone.text) : "opacity-0"
                        )}
                      >
                        {levelOf(m.severity) === "high" ? "Hot" : levelOf(m.severity) === "medium" ? "Watch" : "Clear"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* The hottest tripwire, revealed once the scan settles */}
          <div className="mt-3 min-h-[92px]">
            {done ? (
              <div className="fade-up relative overflow-hidden rounded-2xl border border-[var(--danger)]/30 bg-[image:linear-gradient(180deg,var(--danger-soft),transparent)] p-4">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(248,113,113,0.22),transparent_70%)] blur-2xl"
                />
                <div className="relative flex flex-wrap items-center gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                    Hottest tripwire
                  </p>
                  <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--fg)]">
                    {TOP_TRIPWIRE.market.label}
                  </span>
                  <Badge variant="danger" dot>
                    {TOP_TRIPWIRE.market.severity} severity
                  </Badge>
                  <Badge variant="accent">{TOP_TRIPWIRE.kind}</Badge>
                </div>
                <p className="relative mt-2.5 max-w-2xl text-[13px] leading-relaxed text-[var(--fg-muted)]">
                  {TOP_TRIPWIRE.reason}
                </p>
              </div>
            ) : (
              <div className="flex h-full items-center gap-2.5 px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                Reading every market for cultural, religious, and regulatory risk…
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        A replay of a real scan · sign in to map your own
      </p>
    </div>
  );
}

/* ── Section data ─────────────────────────────────────────────────── */

const REGIONS = [
  {
    name: "South Asia",
    cities: "Dhaka · Karachi · Delhi · Colombo",
    note: "Religion, language register, and class read very differently city to city.",
  },
  {
    name: "The Gulf & MENA",
    cities: "Dubai · Riyadh · Cairo · Istanbul",
    note: "Compliance and faith-sensitive imagery carry real regulatory weight.",
  },
  {
    name: "Southeast Asia",
    cities: "Jakarta · Bangkok · Manila · Singapore",
    note: "Plural markets where a single line can please one audience and offend the next.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Run a simulation",
    desc: "Score any campaign from the home page. The cultural agents tag every market the copy and visual touch.",
  },
  {
    n: "02",
    title: "Watch the map light up",
    desc: "Each city fills with its severity as the scan lands, hottest markets first, color-coded by risk.",
  },
  {
    n: "03",
    title: "Open the tripwire",
    desc: "Click a city to read the exact line or visual that flagged, and why it lands the way it does there.",
  },
];

const LEVELS = [
  { label: "Clear", variant: "success" as const, desc: "No cultural tripwires in this market. Reads clean." },
  { label: "Watch", variant: "warning" as const, desc: "Soft friction. Worth a localized second look before launch." },
  { label: "Hot", variant: "danger" as const, desc: "A live tripwire: religion, labor, gender, or compliance risk." },
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

export function HeatmapAd() {
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
              Cultural Heat Map
            </span>
            <span className="h-3 w-px bg-[var(--border-strong)]" />
            <span className="text-[var(--fg-muted)]">Members only</span>
          </div>

          <h1
            className="fade-up mt-7 font-display font-semibold leading-[1.03] tracking-tight text-[var(--fg)]"
            style={{ animationDelay: "60ms", fontSize: "clamp(2.5rem, 6vw, 4.75rem)", textWrap: "balance" }}
          >
            See exactly where your campaign{" "}
            <span className="text-gradient-accent">sets off alarms.</span>
          </h1>

          <p
            className="fade-up mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[19px]"
            style={{ animationDelay: "120ms" }}
          >
            One campaign reads differently in Dhaka, Karachi, and Dubai. The heat
            map scores every market city by city, then points at the exact line or
            visual that will trip an alarm, before it does.
          </p>

          <div className="fade-up mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "180ms" }}>
            <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
              <LockIcon />
              Sign in to open the map
            </ButtonLink>
            <ButtonLink href={SIGNUP_HREF} variant="secondary" size="xl">
              Create a free account
            </ButtonLink>
          </div>

          <p className="fade-up mx-auto mt-5 text-[13px] text-[var(--fg-subtle)]" style={{ animationDelay: "240ms" }}>
            {MARKET_COUNT} markets · {COUNTRY_COUNT} countries · {REGION_COUNT} macro regions.
          </p>
        </div>

        {/* Live centerpiece */}
        <div className="fade-up" style={{ animationDelay: "320ms" }}>
          <LiveScan />
        </div>
      </section>

      {/* ── Coverage ── */}
      <section className="mb-28 mt-24 md:mb-36 md:mt-32">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> The coverage
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Every market your brand ships into.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            {MARKET_COUNT} markets across {REGION_COUNT} macro regions, each read on
            its own cultural, linguistic, and regulatory terms. A line that clears
            in one capital can be a headline in the next.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {REGIONS.map((r, i) => (
            <div
              key={r.name}
              className="card-glow flex flex-col rounded-2xl border border-[var(--border)] bg-[image:var(--veil)] p-6 backdrop-blur-xl"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <h3 className="font-display text-[17px] font-semibold tracking-tight text-[var(--fg)]">
                {r.name}
              </h3>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                {r.cities}
              </p>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--fg-muted)]">{r.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            From one run to a map of risk.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            The heat map rides on every simulation. Score once, and the cultural
            picture is already waiting for you.
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
              className="lift relative rounded-2xl border border-[var(--border)] bg-[image:var(--veil)] p-6 backdrop-blur-xl"
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

      {/* ── Heat levels ── */}
      <section className="mb-28 md:mb-36">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--panel-deep)] p-8 md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,77,87,0.22),transparent_60%)] blur-3xl"
          />
          <div className="relative grid items-start gap-10 md:grid-cols-[1fr_1fr]">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
                Three levels of heat.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
                Every market lands on a 0–100 severity score, drawn from the same
                red-team verdicts that grade the campaign. The color tells you where
                to look; the tripwire tells you what to fix.
              </p>
            </div>
            <div className="space-y-3">
              {LEVELS.map((l) => (
                <div
                  key={l.label}
                  className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/70 p-4 backdrop-blur"
                >
                  <Badge variant={l.variant} dot className="shrink-0">
                    {l.label}
                  </Badge>
                  <p className="text-[14px] leading-relaxed text-[var(--fg-muted)]">{l.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final gate ── */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--veil-strong)] px-8 py-16 text-center backdrop-blur-xl md:px-12 md:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(255,77,87,0.18),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-2xl">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]">
              <LockIcon className="h-5 w-5" />
            </span>
            <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-5xl">
              The map is members only.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Sign in to scan your own campaign across every market, or create a
              free account in under a minute. The first hot city is usually the one
              you did not expect.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href={LOGIN_HREF} variant="primary" size="xl">
                Sign in to open the map
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
