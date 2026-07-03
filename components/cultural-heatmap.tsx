"use client";

import { useMemo, useState } from "react";
import type {
  CulturalStressMap,
  MacroRegion,
  MarketStress,
} from "@/lib/agents/types";
import { getMarket, MACRO_REGIONS, MARKET_CATALOG } from "@/lib/markets/catalog";
import { countFlaggedMarkets, topRiskMarkets } from "@/lib/cultural-stress-map";
import { riskLevel } from "@/lib/scoring";
import { t, type Locale } from "@/lib/i18n";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { WorldStressMap } from "@/components/world-stress-map";
import { cn } from "@/lib/utils";

const LEVEL_TONE = {
  low: {
    ring: "text-[var(--success)]",
    bar: "bg-[var(--success)]",
    bg: "bg-[var(--success-soft)]",
    border: "border-[var(--success)]/20",
    accent: "var(--success)",
    badgeBg: "var(--success-soft)",
    glow: "var(--success-glow)",
  },
  medium: {
    ring: "text-[var(--warning)]",
    bar: "bg-[var(--warning)]",
    bg: "bg-[var(--warning-soft)]",
    border: "border-[var(--warning)]/20",
    accent: "var(--warning)",
    badgeBg: "var(--warning-soft)",
    glow: "var(--warning-glow)",
  },
  high: {
    ring: "text-[var(--danger)]",
    bar: "bg-[var(--danger)]",
    bg: "bg-[var(--danger-soft)]",
    border: "border-[var(--danger)]/20",
    accent: "var(--danger)",
    badgeBg: "var(--danger-soft)",
    glow: "var(--danger-glow)",
  },
} as const;

function regionLabel(locale: Locale, region: MacroRegion): string {
  const key =
    region === "south_asia"
      ? "regionSouthAsia"
      : region === "mena"
        ? "regionMena"
        : "regionSea";
  return t(locale, key);
}

function MiniRing({ value }: { value: number }) {
  const radius = 16;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  const level = riskLevel(value);
  const tone = LEVEL_TONE[level];

  return (
    <div className="relative h-12 w-12 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-[var(--bg-elev-3)]"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-700 ease-out", tone.ring)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold text-[var(--fg)]">
        {Math.round(value)}
      </span>
    </div>
  );
}

function MarketCard({
  stress,
  selected,
  onSelect,
  locale,
  compact,
}: {
  stress: MarketStress;
  selected: boolean;
  onSelect: () => void;
  locale: Locale;
  compact?: boolean;
}) {
  const def = getMarket(stress.marketId);
  if (!def) return null;

  const level = riskLevel(stress.severity);
  const tone = LEVEL_TONE[level];
  const flagged = stress.severity >= 40;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border text-left transition-all duration-200",
        compact ? "p-3 pl-[18px]" : "p-4 pl-[18px]",
        selected
          ? cn(
              "border-transparent ring-1",
              tone.bg,
            )
          : cn(
              "border-[var(--border)] bg-[var(--bg-surface)]",
              "hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]",
            ),
        !flagged && "opacity-55",
      )}
      style={
        selected
          ? { boxShadow: `0 0 0 1px ${tone.accent}40, inset 0 0 0 1px ${tone.accent}20` }
          : undefined
      }
    >
      {/* Left accent bar */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px] rounded-l-2xl transition-opacity duration-200",
          selected ? "opacity-100" : "opacity-40 group-hover:opacity-70",
        )}
        style={{ backgroundColor: tone.accent }}
      />

      <div className="flex items-start gap-3">
        <MiniRing value={stress.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <p className="font-display text-[14px] font-semibold text-[var(--fg)]">
              {def.label}
            </p>
            <span className="text-[11px] text-[var(--fg-subtle)]">{def.country}</span>
          </div>
          {!compact && (
            <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-[var(--fg-muted)]">
              {flagged ? stress.summary : t(locale, "noTripwires")}
            </p>
          )}
          {flagged && stress.triggers.length > 0 && (
            <div
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
              style={{ backgroundColor: tone.badgeBg }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tone.accent }}
              />
              <span
                className="font-mono text-[9px] uppercase tracking-wider"
                style={{ color: tone.accent }}
              >
                {stress.triggers.length}{" "}
                {stress.triggers.length === 1
                  ? t(locale, "triggerSingular")
                  : t(locale, "triggerPlural")}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function TriggerList({ stress, locale }: { stress: MarketStress; locale: Locale }) {
  if (stress.severity < 40) {
    return (
      <p className="text-[13px] text-[var(--fg-muted)]">{t(locale, "noTripwires")}</p>
    );
  }

  if (stress.triggers.length === 0) {
    return (
      <p className="text-[13px] text-[var(--fg-muted)]">{stress.summary}</p>
    );
  }

  return (
    <ul className="space-y-3">
      {stress.triggers.map((trigger, i) => (
        <li
          key={`${trigger.type}-${i}`}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3.5"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={trigger.type === "copy" ? "accent" : "info"}>
              {trigger.type === "copy" ? t(locale, "triggerCopy") : t(locale, "triggerVisual")}
            </Badge>
          </div>
          <p className="font-display text-[14px] font-medium text-[var(--fg)]">
            &ldquo;{trigger.text}&rdquo;
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {trigger.reason}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function CulturalHeatmap({
  stressMap,
  locale,
  slogan,
  compact = false,
  defaultRegion,
}: {
  stressMap: CulturalStressMap;
  locale: Locale;
  slogan?: string;
  compact?: boolean;
  defaultRegion?: MacroRegion;
}) {
  const stressByMarket = useMemo(
    () => new Map(stressMap.markets.map((m) => [m.marketId, m])),
    [stressMap]
  );

  const initialRegion =
    defaultRegion ??
    (() => {
      const avg: Record<MacroRegion, { sum: number; count: number }> = {
        south_asia: { sum: 0, count: 0 },
        mena: { sum: 0, count: 0 },
        sea: { sum: 0, count: 0 },
      };
      for (const stress of stressMap.markets) {
        const def = getMarket(stress.marketId);
        if (!def) continue;
        avg[def.region].sum += stress.severity;
        avg[def.region].count += 1;
      }
      let best: MacroRegion = "south_asia";
      let bestAvg = -1;
      for (const region of MACRO_REGIONS) {
        const { sum, count } = avg[region];
        const a = count > 0 ? sum / count : 0;
        if (a > bestAvg) {
          bestAvg = a;
          best = region;
        }
      }
      return best;
    })();

  const [activeRegion, setActiveRegion] = useState<MacroRegion>(initialRegion);
  const regionMarkets = useMemo(
    () => MARKET_CATALOG.filter((m) => m.region === activeRegion),
    [activeRegion]
  );
  const regionStresses = useMemo(
    () =>
      regionMarkets
        .map((m) => stressByMarket.get(m.id))
        .filter((s): s is MarketStress => Boolean(s))
        .sort((a, b) => b.severity - a.severity),
    [regionMarkets, stressByMarket]
  );

  const [selectedId, setSelectedId] = useState<string>(
    regionStresses[0]?.marketId ?? regionMarkets[0]?.id ?? ""
  );

  const handleSelectMarket = (marketId: string) => {
    setSelectedId(marketId);
    const def = getMarket(marketId);
    if (def) setActiveRegion(def.region);
  };

  const selectedStress = stressByMarket.get(selectedId);
  const topMarkets = topRiskMarkets(stressMap, 3);
  const flaggedCount = countFlaggedMarkets(stressMap);

  // Per-region high-risk counts for tab badges
  const regionHighCounts = useMemo(() => {
    const counts: Record<MacroRegion, number> = { south_asia: 0, mena: 0, sea: 0 };
    for (const stress of stressMap.markets) {
      const def = getMarket(stress.marketId);
      if (!def) continue;
      if (stress.severity >= 70) counts[def.region]++;
    }
    return counts;
  }, [stressMap]);

  return (
    <div className={cn("space-y-6", compact && "space-y-4")}>
      {!compact && (
        <WorldStressMap
          stressMap={stressMap}
          locale={locale}
          selectedId={selectedId}
          onSelect={handleSelectMarket}
        />
      )}

      {!compact && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {slogan && (
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
                {t(locale, "stressMapFor")}
              </p>
            )}
            {slogan && (
              <h2 className="mt-1 font-display text-xl font-semibold text-[var(--fg)] md:text-2xl">
                {slogan}
              </h2>
            )}
            <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
              {MARKET_CATALOG.length} {t(locale, "marketsAnalyzed")} · {flaggedCount}{" "}
              {t(locale, "marketsFlagged")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {topMarkets.map((m) => {
              const def = getMarket(m.marketId);
              if (!def) return null;
              return (
                <RiskBadge
                  key={m.marketId}
                  level={riskLevel(m.severity)}
                  score={m.severity}
                  label={def.label}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Region tabs */}
      <div className="flex flex-wrap gap-2">
        {MACRO_REGIONS.map((region) => {
          const isActive = activeRegion === region;
          const highCount = regionHighCounts[region];
          return (
            <button
              key={region}
              type="button"
              onClick={() => {
                setActiveRegion(region);
                const first = MARKET_CATALOG.find((m) => m.region === region);
                if (first) handleSelectMarket(first.id);
              }}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-medium transition-all duration-200",
                isActive
                  ? "border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent-400)] shadow-[0_0_16px_-4px_var(--accent-glow)]"
                  : "border-[var(--border)] bg-[var(--bg-elev-1)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]",
              )}
            >
              {regionLabel(locale, region)}
              {highCount > 0 && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-mono text-[9px] font-bold",
                    isActive
                      ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                      : "bg-[var(--danger-soft)] text-[var(--danger)]",
                  )}
                >
                  {highCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Market cards grid */}
        <div className="grid gap-2.5 sm:grid-cols-2">
          {regionStresses.map((stress) => (
            <MarketCard
              key={stress.marketId}
              stress={stress}
              selected={selectedId === stress.marketId}
              onSelect={() => handleSelectMarket(stress.marketId)}
              locale={locale}
              compact={compact}
            />
          ))}
        </div>

        {/* Detail panel */}
        {selectedStress && (
          <DetailPanel stress={selectedStress} locale={locale} />
        )}
      </div>
    </div>
  );
}

function DetailPanel({ stress, locale }: { stress: MarketStress; locale: Locale }) {
  const def = getMarket(stress.marketId);
  const level = riskLevel(stress.severity);
  const tone = LEVEL_TONE[level];

  return (
    <div className="card-glow overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Colored header strip */}
      <div
        className="border-b border-[var(--border)] px-5 py-4"
        style={{ background: `linear-gradient(135deg, ${tone.glow}, transparent)` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-[17px] font-semibold text-[var(--fg)]">
              {def?.label}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--fg-subtle)]">
              {def?.country}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <RiskBadge
              level={level}
              score={stress.severity}
              label={t(locale, "severity")}
            />
          </div>
        </div>

        {/* Severity progress bar */}
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elev-3)]">
            <div
              className={cn("h-full rounded-full transition-all duration-700", tone.bar)}
              style={{ width: `${Math.min(100, stress.severity)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-5">
        <p className="mb-5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
          {stress.summary}
        </p>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
          {t(locale, "flaggedElements")}
        </p>
        <TriggerList stress={stress} locale={locale} />
      </div>
    </div>
  );
}

export function CulturalHeatmapEmpty({
  locale,
}: {
  locale: Locale;
}) {
  return (
    <div className="card-glow rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-[var(--fg)]">
        {t(locale, "stressMapUnavailable")}
      </p>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-[var(--fg-muted)]">
        {t(locale, "stressMapUnavailableHint")}
      </p>
    </div>
  );
}
