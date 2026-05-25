import type { RunScores } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const METRICS: {
  key: keyof RunScores;
  labelKey: string;
  inverse?: boolean;
  description?: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "backfireScore",
    labelKey: "backfireScore",
    description: "Overall adversarial impact",
    icon: (
      <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2z" />
    ),
  },
  {
    key: "resonance",
    labelKey: "resonance",
    inverse: true,
    description: "Audience connection strength",
    icon: (
      <>
        <path d="M2 12h3" />
        <path d="M19 12h3" />
        <path d="M7 6c1.5 2 1.5 10 0 12" />
        <path d="M17 6c-1.5 2-1.5 10 0 12" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    key: "backfireRisk",
    labelKey: "backfireRisk",
    description: "Peak severity from any agent",
    icon: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
  },
  {
    key: "memeability",
    labelKey: "memeability",
    description: "Viral parody potential",
    icon: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <line x1="9" y1="9" x2="9.01" y2="9" />
        <line x1="15" y1="9" x2="15.01" y2="9" />
      </>
    ),
  },
  {
    key: "brandSafetyDrift",
    labelKey: "brandSafetyDrift",
    description: "Campaign vs brand values gap",
    icon: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
  },
  {
    key: "polarizationCoefficient",
    labelKey: "polarization",
    description: "Agent disagreement spread",
    icon: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="15" y2="12" />
        <line x1="3" y1="18" x2="18" y2="18" />
      </>
    ),
  },
];

function level(value: number, inverse?: boolean) {
  return riskLevel(inverse ? 100 - value : value);
}

const LEVEL_TONE = {
  low: { ring: "text-[var(--success)]", bar: "bg-[var(--success)]", text: "text-[var(--success)]" },
  medium: { ring: "text-[var(--warning)]", bar: "bg-[var(--warning)]", text: "text-[var(--warning)]" },
  high: { ring: "text-[var(--danger)]", bar: "bg-[var(--danger)]", text: "text-[var(--danger)]" },
} as const;

function ScoreRing({ value, inverse }: { value: number; inverse?: boolean }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const tone = LEVEL_TONE[level(value, inverse)];

  return (
    <div className="relative h-[68px] w-[68px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden>
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-[var(--bg-elev-3)]"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", tone.ring)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-[17px] font-semibold text-[var(--fg)]">
        {Math.round(value)}
      </span>
    </div>
  );
}

export function ScoreDashboard({
  scores,
  labels,
}: {
  scores: RunScores;
  labels: Record<string, string>;
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {METRICS.map(({ key, labelKey, inverse, description, icon }, i) => {
        const value = scores[key];
        const tone = LEVEL_TONE[level(value, inverse)];
        return (
          <div
            key={key}
            className="card-glow group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-5 backdrop-blur-xl fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start gap-4">
              <ScoreRing value={value} inverse={inverse} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--fg-subtle)]"
                    aria-hidden
                  >
                    {icon}
                  </svg>
                  <p className="text-[13px] font-medium text-[var(--fg)]">
                    {labels[labelKey] ?? labelKey}
                  </p>
                </div>
                {description && (
                  <p className="mt-1 text-[12px] leading-snug text-[var(--fg-subtle)]">
                    {description}
                  </p>
                )}
                <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev-3)]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      tone.bar
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
