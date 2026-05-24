"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentVerdictCard } from "@/components/agent-verdict-card";
import { MemeGrid } from "@/components/meme-grid";
import { ScoreDashboard } from "@/components/score-dashboard";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import type { SimulationRun } from "@/lib/agents/types";

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
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center text-red-400">
          {error}
        </main>
      </>
    );
  }

  if (!run?.scores) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-16 text-center text-zinc-400">
          Loading simulation results...
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-zinc-500">Simulation Run</p>
            <h1 className="text-3xl font-bold text-white">
              {run.campaign?.slogan ?? "Campaign Analysis"}
            </h1>
            {run.campaign?.brandValues && (
              <p className="mt-2 text-sm text-zinc-400">{run.campaign.brandValues}</p>
            )}
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            {t(locale, "newSimulation")}
          </Link>
        </div>

        <section className="mb-10">
          <ScoreDashboard scores={run.scores} labels={labels} />
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-white">
            {t(locale, "agentVerdicts")}
          </h2>
          <div className="space-y-3">
            {(run.verdicts ?? []).map((verdict) => (
              <AgentVerdictCard
                key={verdict.agentId}
                verdict={verdict}
                labels={{
                  severity: labels.severity,
                  reasoning: labels.reasoning,
                  sampleAttack: labels.sampleAttack,
                }}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-white">
            {t(locale, "generatedMemes")}
          </h2>
          <MemeGrid memes={run.memes ?? []} />
        </section>
      </main>
    </>
  );
}
