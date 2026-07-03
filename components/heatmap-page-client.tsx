"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CulturalHeatmap,
  CulturalHeatmapEmpty,
} from "@/components/cultural-heatmap";
import { PageShell } from "@/components/page-shell";
import { SectionHeader } from "@/components/ui/card";
import { PendingButtonLink } from "@/components/ui/pending-link";
import { Select } from "@/components/ui/select";
import { HeatmapPageSkeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/language-provider";
import { highestRiskRegion } from "@/lib/cultural-stress-map";
import { t } from "@/lib/i18n";
import type { SimulationRun } from "@/lib/agents/types";

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
      <Select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        fieldSize="lg"
        className="max-w-lg"
      >
        <option value="">Select a simulation…</option>
        {completed.map((run) => (
          <option key={run.id} value={run.id}>
            {run.campaign?.slogan ?? run.id.slice(0, 8)} —{" "}
            {new Date(run.createdAt).toLocaleDateString()}
          </option>
        ))}
      </Select>
      {emptyMessage && (
        <p className="text-[15px] text-[var(--fg-muted)]">{emptyMessage}</p>
      )}
    </div>
  );
}

function HeatmapContent() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("runId") ?? "";

  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState(runIdParam);
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    fetch("/api/campaigns?list=true")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setListError(data.error ?? `Failed to load simulations (${res.status})`);
          return;
        }
        setRuns(data.runs ?? []);
      })
      .catch(() => setListError("Failed to load simulations"))
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    const id = runIdParam || selectedRunId;
    if (!id) return;
    let cancelled = false;
    fetch(`/api/campaigns?runId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setRun(null);
        else setRun(data as SimulationRun);
      })
      .catch(() => {
        if (!cancelled) setRun(null);
      })
      .finally(() => {
        if (!cancelled) setLoadedId(id);
      });
    return () => {
      cancelled = true;
    };
  }, [runIdParam, selectedRunId]);

  const activeId = runIdParam || selectedRunId;
  const displayRun = activeId ? run : null;
  const runLoading = Boolean(activeId) && loadedId !== activeId;
  const showSkeleton = listLoading || runLoading;

  return (
    <PageShell footer={false}>
      <div className="heatmap-page">
      <SectionHeader
        className="heatmap-page-header"
        eyebrow={t(locale, "heatmap")}
        title={t(locale, "stressMapTitle")}
        description={t(locale, "stressMapDescription")}
      />

      {!listLoading && (
        <div className="mb-8">
          <RunPicker
            runs={runs}
            selectedId={activeId}
            onChange={setSelectedRunId}
            emptyMessage={
              listError
                ? listError
                : runs.length > 0 && runs.every((r) => r.status !== "complete")
                  ? "No completed simulations yet — finish a run from the home page first."
                  : runs.length === 0 && !listError
                    ? "No simulations yet — run one from the home page."
                    : undefined
            }
          />
        </div>
      )}

      {showSkeleton && <HeatmapPageSkeleton />}

      {!showSkeleton && !activeId && (
        <div className="content-enter card-glow rounded-2xl border border-[var(--border)] px-6 py-12 text-center">
          <p className="text-[15px] text-[var(--fg-muted)]">
            {t(locale, "stressMapSelectRun")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <PendingButtonLink href="/" variant="primary" size="md">
              {t(locale, "newSimulation")}
            </PendingButtonLink>
            <PendingButtonLink href="/history" variant="secondary" size="md">
              {t(locale, "history")}
            </PendingButtonLink>
          </div>
        </div>
      )}

      {!showSkeleton && activeId && displayRun && !displayRun.culturalStressMap && (
        <div className="content-enter">
          <CulturalHeatmapEmpty locale={locale} />
        </div>
      )}

      {!showSkeleton && activeId && displayRun?.culturalStressMap && (
        <div className="content-enter">
          <CulturalHeatmap
            stressMap={displayRun.culturalStressMap}
            locale={locale}
            slogan={displayRun.campaign?.slogan}
            defaultRegion={highestRiskRegion(displayRun.culturalStressMap)}
          />
        </div>
      )}
      </div>
    </PageShell>
  );
}

export function HeatmapPageClient() {
  return (
    <Suspense
      fallback={
        <PageShell footer={false}>
          <HeatmapPageSkeleton />
        </PageShell>
      }
    >
      <HeatmapContent />
    </Suspense>
  );
}
