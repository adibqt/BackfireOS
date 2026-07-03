"use client";

import { useEffect, useState } from "react";
import { AgentsDossierSection } from "@/components/simulate/agents-dossier-section";
import { BacklashTerritorySection } from "@/components/simulate/backlash-territory-section";
import { MemeSummaryRow } from "@/components/simulate/meme-summary-row";
import { MemeModal } from "@/components/meme-modal";
import { HeroVerdictSection } from "@/components/simulate/hero-verdict-section";
import { RadarCenterpieceSection } from "@/components/simulate/radar-centerpiece-section";
import { SimulateSectionNav } from "@/components/simulate/simulate-section-nav";
import { SectionDivider } from "@/components/simulate/section-divider";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { topAgentQuote } from "@/lib/simulate-ui";
import type { SimulationRun } from "@/lib/agents/types";
import { PageSkeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <PageShell footer={false}>
      <PageSkeleton />
    </PageShell>
  );
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
  const mockCount = (run.verdicts ?? []).filter((v) => v.source === "mock").length;
  const memes = run.memes ?? [];

  return (
    <PageShell footer={false} bare>
      <SimulateSectionNav locale={locale} />
      <div className="xl:pl-[4.75rem]">
      <HeroVerdictSection
        slogan={run.campaign?.slogan ?? "Campaign analysis"}
        createdAt={run.createdAt}
        score={headlineScore}
        agentQuote={topAgentQuote(run.verdicts ?? [])}
        campaignId={run.campaignId}
      />

      <SectionDivider />

      <RadarCenterpieceSection scores={run.scores} labels={labels} />

      <SectionDivider />

      <AgentsDossierSection
        verdicts={run.verdicts ?? []}
        mockCount={mockCount}
        labels={{
          severity: labels.severity,
          reasoning: labels.reasoning,
          sampleAttack: labels.sampleAttack,
        }}
      />

      <SectionDivider />

      <BacklashTerritorySection
        verdicts={run.verdicts ?? []}
        polarizationCoefficient={run.scores.polarizationCoefficient}
        campaignSlogan={run.campaign?.slogan ?? "Campaign"}
        culturalStressMap={run.culturalStressMap}
        runId={id}
        locale={locale}
      />

      <SectionDivider />

      <MemeSummaryRow
        count={memes.length}
        score={run.scores.memeability}
        onOpen={() => setMemeModalOpen(true)}
      />

      <MemeModal
        open={memeModalOpen}
        onClose={() => setMemeModalOpen(false)}
        memes={memes}
        memeability={run.scores.memeability}
        title={t(locale, "memeMutationReport")}
      />
      </div>
    </PageShell>
  );
}
