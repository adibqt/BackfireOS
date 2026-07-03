"use client";

import { useEffect, useState } from "react";
import { AgentVerdictCard } from "@/components/agent-verdict-card";
import {
  CulturalHeatmap,
  CulturalHeatmapEmpty,
} from "@/components/cultural-heatmap";
import { MemeGrid } from "@/components/meme-grid";
import { PolarizationGraph } from "@/components/polarization-graph";
import { ScoreDashboard } from "@/components/score-dashboard";
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

  useEffect(() => {
    fetch(`/api/campaigns?runId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRun(data as SimulationRun);
      })
      .catch(() => setError("Failed to load run"));
  }, [id]);

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
    low: { chip: "success" as const, text: "text-[var(--success)]", verdict: "Ship it" },
    medium: { chip: "warning" as const, text: "text-[var(--warning)]", verdict: "Tune it" },
    high: { chip: "danger" as const, text: "text-[var(--danger)]", verdict: "Pull back" },
  }[headlineLevel];

  return (
    <PageShell footer={false}>
      {/* Hero summary */}
      <section className="relative mb-12 overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] px-6 py-8 md:px-10 md:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--aurora-1),transparent_70%)] blur-3xl"
        />
        <div className="relative grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent" dot>
                Simulation
              </Badge>
              <span className="font-mono text-[12px] text-[var(--fg-subtle)]">
                {new Date(run.createdAt).toLocaleString()}
              </span>
            </div>
            <h1 className="mt-4 font-display text-[30px] font-semibold leading-tight tracking-tight text-[var(--fg)] md:text-[40px]">
              {run.campaign?.slogan ?? "Campaign analysis"}
            </h1>
            {run.campaign?.brandValues && (
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[var(--fg-muted)]">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  Values ·{" "}
                </span>
                {run.campaign.brandValues}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
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
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 text-right">
            <Badge variant={headlineTone.chip} dot>
              {headlineTone.verdict}
            </Badge>
            <div className="flex items-baseline gap-2">
              <span className={cn("font-display text-[64px] font-semibold leading-none tracking-tight", headlineTone.text)}>
                {headlineScore}
              </span>
              <span className="font-mono text-[12px] uppercase tracking-wider text-[var(--fg-subtle)]">
                / 100
              </span>
            </div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              Backfire Score
            </p>
          </div>
        </div>
      </section>

      {/* Dashboard */}
      <section className="mb-16">
        <SectionHeader
          eyebrow="Dashboard"
          title="Backfire Score breakdown"
          description="Six composite metrics measuring campaign vulnerability."
        />
        <div className="mb-6">
          <ScoreRadar scores={run.scores} labels={labels} />
        </div>
        <ScoreDashboard scores={run.scores} labels={labels} />
      </section>

      {/* Verdicts */}
      <section className="mb-16">
        <SectionHeader
          eyebrow="Red team"
          title={t(locale, "agentVerdicts")}
          description="Tap any agent to read its reasoning and sample attack."
        />
        {(() => {
          const mockCount = (run.verdicts ?? []).filter(
            (v) => v.source === "mock"
          ).length;
          if (mockCount === 0) return null;
          return (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 shrink-0"
                aria-hidden
              >
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
          );
        })()}
        <div className="space-y-3">
          {(run.verdicts ?? []).map((verdict, i) => (
            <div key={verdict.agentId} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <AgentVerdictCard
                verdict={verdict}
                labels={{
                  severity: labels.severity,
                  reasoning: labels.reasoning,
                  sampleAttack: labels.sampleAttack,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Polarization network */}
      <section className="mb-16">
        <SectionHeader
          eyebrow="Polarization"
          title="Co-amplification network"
          description="Each circle is a simulated critic of your campaign. Lines connect critics who are hitting the same weakness — those overlaps are where real-world pile-ons start."
        />
        <PolarizationGraph
          verdicts={run.verdicts ?? []}
          polarizationCoefficient={run.scores.polarizationCoefficient}
          campaignSlogan={run.campaign?.slogan ?? "Campaign"}
        />
      </section>

      {/* Cultural stress map */}
      <section className="mb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
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
      </section>

      {/* Memes */}
      <section className="mb-12">
        <SectionHeader
          eyebrow="Mutation"
          title={t(locale, "generatedMemes")}
          description="Parodies the internet would have made — generated, scored, captioned."
        />
        <MemeGrid
          memes={run.memes ?? []}
          imageWarning={run.imageWarning}
          memeability={run.scores.memeability}
        />
      </section>
    </PageShell>
  );
}
