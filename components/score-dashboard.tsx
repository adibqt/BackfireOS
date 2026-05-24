import type { RunScores } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";

const METRICS: { key: keyof RunScores; labelKey: string; inverse?: boolean }[] = [
  { key: "backfireScore", labelKey: "backfireScore" },
  { key: "resonance", labelKey: "resonance", inverse: true },
  { key: "backfireRisk", labelKey: "backfireRisk" },
  { key: "memeability", labelKey: "memeability" },
  { key: "brandSafetyDrift", labelKey: "brandSafetyDrift" },
  { key: "polarizationCoefficient", labelKey: "polarization" },
];

function barColor(score: number, inverse?: boolean) {
  const level = riskLevel(inverse ? 100 - score : score);
  if (level === "low") return "bg-emerald-500";
  if (level === "medium") return "bg-amber-500";
  return "bg-red-500";
}

export function ScoreDashboard({
  scores,
  labels,
}: {
  scores: RunScores;
  labels: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {METRICS.map(({ key, labelKey, inverse }) => {
        const value = scores[key];
        return (
          <div
            key={key}
            className="rounded-xl border border-white/10 bg-zinc-900/70 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-zinc-300">{labels[labelKey] ?? labelKey}</span>
              <span className="text-2xl font-bold text-white">{value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full ${barColor(value, inverse)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
