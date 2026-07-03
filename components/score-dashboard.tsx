"use client";

import type { RunScores } from "@/lib/agents/types";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";

const METRICS: {
  key: keyof RunScores;
  labelKey: string;
}[] = [
  { key: "backfireScore", labelKey: "backfireScore" },
  { key: "resonance", labelKey: "resonance" },
  { key: "backfireRisk", labelKey: "backfireRisk" },
  { key: "memeability", labelKey: "memeability" },
  { key: "brandSafetyDrift", labelKey: "brandSafetyDrift" },
  { key: "polarizationCoefficient", labelKey: "polarization" },
];

export function ScoreDashboard({
  scores,
  labels,
}: {
  scores: RunScores;
  labels: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
      {METRICS.map(({ key, labelKey }, i) => {
        const value = scores[key];
        return (
          <RevealOnScroll key={key} index={i}>
            <div className="flex flex-col justify-between bg-[var(--bg-surface)] px-5 py-5">
              <p className="font-mono text-[var(--text-3xl)] font-medium leading-none tracking-tight text-[var(--fg)]">
                {Math.round(value)}
              </p>
              <p className="mt-4 font-mono text-[var(--text-xs)] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                {labels[labelKey] ?? labelKey}
              </p>
            </div>
          </RevealOnScroll>
        );
      })}
    </div>
  );
}
