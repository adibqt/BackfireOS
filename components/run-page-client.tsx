"use client";

import { useEffect, useState } from "react";
import { AgentVerdictCard } from "@/components/agent-verdict-card";
import {
  CulturalHeatmap,
  CulturalHeatmapEmpty,
} from "@/components/cultural-heatmap";
import { MemeModal } from "@/components/meme-modal";
import { PolarizationGraph } from "@/components/polarization-graph";
import { ScoreDashboard } from "@/components/score-dashboard";
import { ScoreRadar } from "@/components/score-radar";
import { PageShell } from "@/components/page-shell";
import { SectionHeader } from "@/components/ui/card";
import { Collapsible } from "@/components/ui/collapsible";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { riskLevel } from "@/lib/scoring";
import { highestRiskRegion } from "@/lib/cultural-stress-map";
import type { SimulationRun } from "@/lib/agents/types";
import { PageSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function LoadingSkeleton() {
  return (
    <PageShell footer={false}>
      <PageSkeleton />
    </PageShell>
  );
}

function formatMemeSummary(
  locale: "en" | "bn",
  count: number,
  score: number
): string {
  return t(locale, "memeSummary")
    .replace("{count}", String(count))
    .replace("{score}", String(Math.round(score)));
}

export default function RunPageClient({ id }: { id: string }) {
  const { locale } = useLanguage();
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [error, setError] = useState("");
  const [memeModalOpen, setMemeModalOpen] = useState(false);

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
    sampleAttack: t(locale, "simulatedAttackVector"),
  };

  if (error) {
    return (
      <PageShell footer={false}>
        <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
          <h1 className="text-page-title text-[var(--fg)] md:text-[var(--text-3xl)]">
            We couldn&apos;t load this run
          </h1>
          <p className="mt-2 text-[var(--text-base)] text-[var(--fg-muted)]">{error}</p>
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
    low: { chip: "outline" as const, text: "text-[var(--fg)]", verdict: "Ship it" },
    medium: { chip: "default" as const, text: "text-[var(--fg)]", verdict: "Tune it" },
    high: { chip: "accent" as const, text: "text-[var(--fg)]", verdict: "Pull back" },
  }[headlineLevel];

  const mockCount = (run.verdicts ?? []).filter((v) => v.source === "mock").length;
  const memes = run.memes ?? [];

  return (
    <PageShell footer={false}>
      <div className="content-enter">
        {/* Hero — 60/40 */}
        <section className="mb-12 rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-8 shadow-[var(--shadow-sm)] md:px-10 md:py-10">
          <div className="grid items-end gap-8 md:grid-cols-[3fr_2fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent" dot>
                  Simulation
                </Badge>
                <span className="font-mono text-[var(--text-xs)] text-[var(--fg-subtle)]">
                  {new Date(run.createdAt).toLocaleString()}
                </span>
              </div>
              <h1 className="mt-4 text-page-title text-[var(--fg)] md:text-[var(--text-3xl)]">
                {run.campaign?.slogan ?? "Campaign analysis"}
              </h1>
              {run.campaign?.brandValues && (
                <p className="mt-3 max-w-2xl text-[var(--text-base)] text-[var(--fg-muted)]">
                  <span className="font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--fg-subtle)]">
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
                  {t(locale, "history")}
                </ButtonLink>
                {run.campaignId && (
                  <ButtonLink
                    href={`/branches?campaign=${run.campaignId}`}
                    variant="secondary"
                    size="md"
                  >
                    {t(locale, "branches")} →
                  </ButtonLink>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end md:text-right">
              <Badge variant={headlineTone.chip} dot>
                {headlineTone.verdict}
              </Badge>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-mono text-[var(--text-3xl)] font-semibold leading-none md:text-[4rem]",
                    headlineTone.text
                  )}
                >
                  {headlineScore}
                </span>
                <span className="font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--fg-subtle)]">
                  / 100
                </span>
              </div>
              <p className="font-mono text-[var(--text-xs)] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                {t(locale, "backfireScore")}
              </p>
            </div>
          </div>
        </section>

        {/* Risk Dimensions — 2×3 */}
        <section className="mb-16">
          <SectionHeader
            title={t(locale, "riskDimensions")}
            description="Six composite metrics for campaign vulnerability."
          />
          <ScoreDashboard scores={run.scores} labels={labels} />
        </section>

        {/* Radar 40% + Red-Team Agents 60% */}
        <section className="mb-16">
          <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
            <div>
              <SectionHeader
                title={t(locale, "riskDimensionRadar")}
                className="mb-6"
              />
              <ScoreRadar scores={run.scores} labels={labels} />
            </div>
            <div>
              <SectionHeader
                title={t(locale, "redTeamAgents")}
                description="Tap an agent for reasoning and attack vector."
                className="mb-6"
              />
              {mockCount > 0 && (
                <Collapsible
                  label="Why is demo data showing? ↓"
                  className="mb-5"
                >
                  {mockCount} of {(run.verdicts ?? []).length} agents used demo
                  data, so the Backfire Score is partly heuristic. Re-run when
                  the model is available.
                </Collapsible>
              )}
              <div className="space-y-2">
                {(run.verdicts ?? []).map((verdict, i) => (
                  <RevealOnScroll key={verdict.agentId} index={i}>
                    <AgentVerdictCard
                      verdict={verdict}
                      labels={{
                        severity: labels.severity,
                        reasoning: labels.reasoning,
                        sampleAttack: labels.sampleAttack,
                      }}
                    />
                  </RevealOnScroll>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Polarization + Cultural stress — 50/50 */}
        <section className="mb-16 grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeader
              title="Co-amplification network"
              description="Critics hitting the same weakness."
              className="mb-6"
            />
            <PolarizationGraph
              verdicts={run.verdicts ?? []}
              polarizationCoefficient={run.scores.polarizationCoefficient}
              campaignSlogan={run.campaign?.slogan ?? "Campaign"}
            />
          </div>
          <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                eyebrow={t(locale, "heatmap")}
                title={t(locale, "stressMapTitle")}
                description={t(locale, "stressMapDescription")}
                className="mb-0"
              />
              {run.culturalStressMap && (
                <ButtonLink
                  href={`/heatmap?runId=${id}`}
                  variant="secondary"
                  size="md"
                >
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
          </div>
        </section>

        {/* Memes — summary + modal */}
        <section className="mb-12">
          <SectionHeader title={t(locale, "generatedMemes")} className="mb-4" />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-sm)]">
            <p className="text-[var(--text-base)] text-[var(--fg-muted)]">
              {memes.length > 0
                ? formatMemeSummary(locale, memes.length, run.scores.memeability)
                : `Memeability ${Math.round(run.scores.memeability)}/100 — no parody mutations.`}
            </p>
            {memes.length > 0 && (
              <Button variant="outline" size="md" onClick={() => setMemeModalOpen(true)}>
                {t(locale, "viewMemes")}
              </Button>
            )}
          </div>
        </section>
      </div>

      <MemeModal
        open={memeModalOpen}
        onClose={() => setMemeModalOpen(false)}
        memes={memes}
        memeability={run.scores.memeability}
        title={t(locale, "memeMutationReport")}
      />
    </PageShell>
  );
}
