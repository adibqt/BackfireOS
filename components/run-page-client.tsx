"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AgentVerdictGrid } from "@/components/agent-verdict-card";
import {
  CulturalHeatmap,
  CulturalHeatmapEmpty,
} from "@/components/cultural-heatmap";
import { MemeGrid } from "@/components/meme-grid";
import { PolarizationGraph } from "@/components/polarization-graph";
import { ScoreRadar } from "@/components/score-radar";
import { PageShell } from "@/components/page-shell";
import { SectionHeader } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { riskLevel } from "@/lib/scoring";
import { highestRiskRegion } from "@/lib/cultural-stress-map";
import type { SimulationRun } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

/** The six full-screen panels, in scroll order. */
const PANELS = [
  { id: "overview", label: "Overview" },
  { id: "scores", label: "Scores" },
  { id: "verdicts", label: "Verdicts" },
  { id: "network", label: "Network" },
  { id: "heatmap", label: "Heatmap" },
  { id: "memes", label: "Memes" },
] as const;

/* ── Reveal: fades + slides its content up when `show` flips true ── */
function Reveal({
  show,
  delay = 0,
  className,
  children,
}: {
  show: boolean;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ transitionDelay: show ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        show
          ? "translate-y-0 opacity-100"
          : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── CountUp: animates 0 → value with an ease-out curve whenever `run` (the
   panel becomes active). Honors prefers-reduced-motion by snapping instantly. ── */
function CountUp({
  value,
  run,
  duration = 1400,
  className,
  style,
}: {
  value: number;
  run: boolean;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!run) {
      setDisplay(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(value * ease(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, value, duration]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}

/* ── Panel: one viewport-filling snap section. Content is centered when it
   fits and scrolls internally (no clipping) when it's taller than the screen. ── */
function Panel({
  id,
  index,
  setRef,
  children,
}: {
  id: string;
  index: number;
  setRef: (el: HTMLElement | null) => void;
  children: ReactNode;
}) {
  return (
    <section
      ref={setRef}
      id={id}
      data-index={index}
      className="relative h-full w-full snap-start snap-always overflow-hidden"
    >
      <div className="no-scrollbar flex h-full flex-col overflow-y-auto">
        <div className="m-auto w-full px-6 py-12 md:px-12 lg:px-20 xl:px-28">
          {children}
        </div>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <PageShell footer={false}>
      <div className="space-y-10">
        <div className="space-y-3">
          <div className="shimmer h-5 w-32 rounded-md" />
          <div className="shimmer h-10 w-3/4 rounded-lg" />
          <div className="shimmer h-4 w-1/2 rounded-md" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shimmer h-32 rounded-2xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="shimmer h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export default function RunPageClient({ id }: { id: string }) {
  const { locale } = useLanguage();
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [error, setError] = useState("");

  // Full-screen scroll-snap state
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    fetch(`/api/campaigns?runId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRun(data as SimulationRun);
      })
      .catch(() => setError("Failed to load run"));
  }, [id]);

  // Scroll-spy: highlight the panel currently filling the viewport.
  // Re-runs once `run` loads so the panels exist to observe.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = Number((entry.target as HTMLElement).dataset.index);
          }
        }
        if (best >= 0 && bestRatio >= 0.4) setActive(best);
      },
      { root, threshold: [0.4, 0.6, 0.8] }
    );
    const els = sectionRefs.current.filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [run]);

  const goTo = (i: number) =>
    sectionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });

  const setRef = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

  const labels = {
    backfireScore: t(locale, "backfireScore"),
    resonance: t(locale, "resonance"),
    backfireRisk: t(locale, "backfireRisk"),
    memeability: t(locale, "memeability"),
    brandSafetyDrift: t(locale, "brandSafetyDrift"),
    polarization: t(locale, "polarization"),
    severity: t(locale, "severity"),
    reasoning: t(locale, "reasoning"),
    sampleAttack: t(locale, "sampleAttack"),
  };

  if (error) {
    return (
      <PageShell footer={false}>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-[var(--danger)]/30">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[var(--fg)]">
            We couldn&apos;t load this run
          </h1>
          <p className="mt-2 text-sm text-[var(--fg-muted)]">{error}</p>
          <ButtonLink href="/" variant="primary" className="mt-6">
            {t(locale, "newSimulation")}
          </ButtonLink>
        </div>
      </PageShell>
    );
  }

  if (!run?.scores) {
    return <LoadingSkeleton />;
  }

  const headlineScore = Math.round(run.scores.backfireScore);
  const headlineLevel = riskLevel(headlineScore);
  const headlineTone = {
    low: { chip: "success" as const, color: "var(--success)", verdict: "Ship it" },
    medium: { chip: "warning" as const, color: "var(--warning)", verdict: "Tune it" },
    high: { chip: "danger" as const, color: "var(--danger)", verdict: "Pull back" },
  }[headlineLevel];

  const mockCount = (run.verdicts ?? []).filter((v) => v.source === "mock").length;

  return (
    <PageShell bare footer={false}>
      <div
        ref={containerRef}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
      >
        {/* ── Panel 1 · Overview / headline score ── */}
        <Panel id={PANELS[0].id} index={0} setRef={setRef(0)}>
          <div className="relative flex flex-col items-center text-center">
            {/* Meta */}
            <Reveal show={active === 0} className="flex flex-wrap items-center justify-center gap-2.5">
              <Badge variant="accent" dot>
                Simulation
              </Badge>
              <span className="font-mono text-[12px] text-[var(--fg-subtle)]">
                {new Date(run.createdAt).toLocaleString()}
              </span>
            </Reveal>

            {/* Slogan under test */}
            <Reveal show={active === 0} delay={80}>
              <h1 className="mt-6 max-w-4xl font-display text-[22px] font-medium leading-snug tracking-tight text-balance text-[var(--fg-muted)] md:text-[28px]">
                <span className="text-[var(--fg-subtle)]">“</span>
                {run.campaign?.slogan ?? "Campaign analysis"}
                <span className="text-[var(--fg-subtle)]">”</span>
              </h1>
            </Reveal>

            {/* Giant animated score */}
            <Reveal show={active === 0} delay={140} className="relative mt-4 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <span
                  aria-hidden
                  className="pointer-events-none absolute -z-10 h-[70%] w-[70%] rounded-full blur-[80px] opacity-70"
                  style={{
                    background: `radial-gradient(circle, color-mix(in srgb, ${headlineTone.color} 45%, transparent), transparent 70%)`,
                  }}
                />
                <CountUp
                  value={headlineScore}
                  run={active === 0}
                  className="font-display font-semibold leading-[0.85] tracking-tighter tabular-nums text-[clamp(140px,26vw,340px)]"
                  style={{ color: headlineTone.color }}
                />
                <span className="mb-6 ml-2 self-end font-display text-[clamp(28px,4vw,52px)] font-medium leading-none text-[var(--fg-faint)]">
                  /100
                </span>
              </div>

              <div className="mt-4 flex flex-col items-center gap-3 md:mt-6">
                <Badge variant={headlineTone.chip} dot>
                  {headlineTone.verdict}
                </Badge>
                <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--fg-subtle)]">
                  Backfire Score
                </p>
              </div>
            </Reveal>

            {/* Actions */}
            <Reveal show={active === 0} delay={220} className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
              <ButtonLink href="/" variant="primary" size="md">
                {t(locale, "newSimulation")}
              </ButtonLink>
              <ButtonLink href="/history" variant="secondary" size="md">
                Back to history
              </ButtonLink>
              {run.campaignId && (
                <ButtonLink
                  href={`/branches?campaign=${run.campaignId}`}
                  variant="secondary"
                  size="md"
                >
                  Counterfactual Branching →
                </ButtonLink>
              )}
              <ButtonLink
                href={`/post-mortem?runId=${id}`}
                variant="secondary"
                size="md"
              >
                {t(locale, "postMortem")} →
              </ButtonLink>
            </Reveal>
          </div>

          {/* Scroll cue pinned to the bottom of the panel */}
          <Reveal
            show={active === 0}
            delay={320}
            className="pointer-events-none absolute inset-x-0 bottom-8 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--fg-subtle)]">
              Scroll to explore
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-bounce" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </span>
          </Reveal>
        </Panel>

        {/* ── Panel 2 · Score breakdown ── */}
        <Panel id={PANELS[1].id} index={1} setRef={setRef(1)}>
          <Reveal show={active === 1}>
            <SectionHeader
              eyebrow="Dashboard"
              title="Backfire Score breakdown"
              description="Six composite metrics measuring campaign vulnerability."
            />
          </Reveal>
          <Reveal show={active === 1} delay={140} className="mt-6">
            <ScoreRadar scores={run.scores} labels={labels} />
          </Reveal>
        </Panel>

        {/* ── Panel 3 · Red-team verdicts ── */}
        <Panel id={PANELS[2].id} index={2} setRef={setRef(2)}>
          <Reveal show={active === 2}>
            <SectionHeader
              eyebrow="Red team"
              title={t(locale, "agentVerdicts")}
              description="Tap any agent to read its reasoning and sample attack."
            />
          </Reveal>
          {mockCount > 0 && (
            <Reveal show={active === 2} delay={80} className="mt-5">
              <div className="flex items-start gap-3 rounded-2xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="leading-relaxed">
                  {mockCount} of {(run.verdicts ?? []).length} red-team agents fell
                  back to demo data, so the Backfire Score above is partly
                  heuristic rather than a full model judgment. Re-run once the
                  model is available for an accurate score.
                </p>
              </div>
            </Reveal>
          )}
          <Reveal show={active === 2} delay={140} className="mt-6">
            <AgentVerdictGrid
              verdicts={run.verdicts ?? []}
              labels={{
                severity: labels.severity,
                reasoning: labels.reasoning,
                sampleAttack: labels.sampleAttack,
              }}
            />
          </Reveal>
        </Panel>

        {/* ── Panel 4 · Polarization network ── */}
        <Panel id={PANELS[3].id} index={3} setRef={setRef(3)}>
          <Reveal show={active === 3}>
            <SectionHeader
              eyebrow="Polarization"
              title="Co-amplification network"
              description="Each circle is a simulated critic of your campaign. Lines connect critics who are hitting the same weakness — those overlaps are where real-world pile-ons start."
            />
          </Reveal>
          <Reveal show={active === 3} delay={160} className="mt-6">
            <PolarizationGraph
              verdicts={run.verdicts ?? []}
              polarizationCoefficient={run.scores.polarizationCoefficient}
              campaignSlogan={run.campaign?.slogan ?? "Campaign"}
            />
          </Reveal>
        </Panel>

        {/* ── Panel 5 · Cultural stress map ── */}
        <Panel id={PANELS[4].id} index={4} setRef={setRef(4)}>
          <Reveal show={active === 4}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                eyebrow={t(locale, "heatmap")}
                title={t(locale, "stressMapTitle")}
                description={t(locale, "stressMapDescription")}
              />
              {run.culturalStressMap && (
                <ButtonLink href={`/heatmap?runId=${id}`} variant="secondary" size="md">
                  {t(locale, "openFullStressMap")} →
                </ButtonLink>
              )}
            </div>
          </Reveal>
          <Reveal show={active === 4} delay={160} className="mt-6">
            {run.culturalStressMap ? (
              <CulturalHeatmap
                stressMap={run.culturalStressMap}
                locale={locale}
                compact
                defaultRegion={highestRiskRegion(run.culturalStressMap)}
              />
            ) : (
              <CulturalHeatmapEmpty locale={locale} />
            )}
          </Reveal>
        </Panel>

        {/* ── Panel 6 · Memes ── */}
        <Panel id={PANELS[5].id} index={5} setRef={setRef(5)}>
          <Reveal show={active === 5}>
            <SectionHeader
              eyebrow="Mutation"
              title={t(locale, "generatedMemes")}
              description="Parodies the internet would have made — generated, scored, captioned."
            />
          </Reveal>
          <Reveal show={active === 5} delay={160} className="mt-6">
            <MemeGrid
              memes={run.memes ?? []}
              imageWarning={run.imageWarning}
              memeability={run.scores.memeability}
            />
          </Reveal>
        </Panel>
      </div>

      {/* ── Fixed scroll-spy navigation ── */}
      <nav
        aria-label="Section navigation"
        className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-3 md:gap-4"
      >
        {PANELS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Go to ${p.label}`}
            aria-current={active === i ? "true" : undefined}
            className="group flex items-center gap-2.5"
          >
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.18em] transition-all duration-300",
                active === i
                  ? "text-[var(--accent)] opacity-100"
                  : "text-[var(--fg-subtle)] opacity-60 group-hover:text-[var(--fg-muted)] group-hover:opacity-100"
              )}
            >
              {p.label}
            </span>
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full border transition-all duration-300",
                active === i
                  ? "scale-100 border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-soft)]"
                  : "scale-75 border-[var(--border-bright)] bg-transparent group-hover:border-[var(--fg-muted)] group-hover:bg-[var(--fg-faint)]"
              )}
            />
          </button>
        ))}
      </nav>
    </PageShell>
  );
}
