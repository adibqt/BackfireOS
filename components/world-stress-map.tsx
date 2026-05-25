"use client";

import { useMemo, useState } from "react";
import type { CulturalStressMap, MarketStress } from "@/lib/agents/types";
import { getMarket, MARKET_CATALOG } from "@/lib/markets/catalog";
import {
  formatCoords,
  marketCoords,
  WORLD_LAND_PATHS,
} from "@/lib/markets/world-projection";
import { riskLevel } from "@/lib/scoring";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const VIEW_W = 960;
const VIEW_H = 480;

function heatColor(severity: number): string {
  if (severity >= 70) return "rgba(255, 45, 55, 0.95)";
  if (severity >= 40) return "rgba(255, 90, 45, 0.85)";
  return "rgba(255, 140, 60, 0.55)";
}

function heatRadius(severity: number): number {
  return 18 + (severity / 100) * 42;
}

export function WorldStressMap({
  stressMap,
  locale,
  selectedId,
  onSelect,
  className,
}: {
  stressMap: CulturalStressMap;
  locale: Locale;
  selectedId?: string;
  onSelect?: (marketId: string) => void;
  className?: string;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const stressByMarket = useMemo(
    () => new Map(stressMap.markets.map((m) => [m.marketId, m])),
    [stressMap]
  );

  const points = useMemo(() => {
    return MARKET_CATALOG.map((def) => {
      const stress = stressByMarket.get(def.id);
      const coords = marketCoords(def, VIEW_W, VIEW_H);
      if (!coords || !stress) return null;
      return { def, stress, ...coords };
    }).filter(Boolean) as Array<{
      def: (typeof MARKET_CATALOG)[number];
      stress: MarketStress;
      x: number;
      y: number;
    }>;
  }, [stressByMarket]);

  const focusId = hoveredId ?? selectedId ?? null;
  const focusMarket = focusId ? getMarket(focusId) : points[0]?.def;
  const focusStress = focusId ? stressByMarket.get(focusId) : points[0]?.stress;

  const graticuleLines = useMemo(() => {
    const meridians: number[] = [];
    const parallels: number[] = [];
    for (let lng = -180; lng <= 180; lng += 30) meridians.push(lng);
    for (let lat = -60; lat <= 60; lat += 30) parallels.push(lat);
    return { meridians, parallels };
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[#050508]",
        className
      )}
    >
      {/* Scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)",
        }}
      />

      {/* Header bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-[rgba(0,212,170,0.15)] bg-[rgba(0,212,170,0.04)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[rgba(0,212,170,0.85)]">
        <span>{t(locale, "globalOverview")}</span>
        <span className="hidden sm:inline">
          {focusMarket ? formatCoords(focusMarket.lat, focusMarket.lng) : "—"}
          {focusStress != null && (
            <span className="ml-3 text-[rgba(255,90,70,0.9)]">
              SEV: {Math.round(focusStress.severity)}
            </span>
          )}
        </span>
      </div>

      <div className="relative aspect-[2/1] w-full">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-full w-full"
          role="img"
          aria-label={t(locale, "stressMapTitle")}
        >
          <defs>
            <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0a1018" />
              <stop offset="100%" stopColor="#030306" />
            </radialGradient>
            <filter id="heatBlur" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="1 0 0 0 0  0 0.15 0 0 0  0 0 0.1 0 0  0 0 0 0.9 0"
                result="redBlur"
              />
              <feMerge>
                <feMergeNode in="redBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {/* Ocean */}
          <rect width={VIEW_W} height={VIEW_H} fill="url(#oceanGrad)" />

          {/* Graticule */}
          <g stroke="rgba(0,212,170,0.06)" strokeWidth="0.5" fill="none">
            {graticuleLines.meridians.map((lng) => {
              const x = ((lng + 180) / 360) * VIEW_W;
              return <line key={`m-${lng}`} x1={x} y1={0} x2={x} y2={VIEW_H} />;
            })}
            {graticuleLines.parallels.map((lat) => {
              const y = ((90 - lat) / 180) * VIEW_H;
              return <line key={`p-${lat}`} x1={0} y1={y} x2={VIEW_W} y2={y} />;
            })}
          </g>

          {/* Continent wireframes */}
          <g
            fill="rgba(0,212,170,0.03)"
            stroke="rgba(0,212,170,0.18)"
            strokeWidth="0.8"
          >
            {WORLD_LAND_PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          {/* Heat blobs — sorted low to high so hot spots render on top */}
          <g filter="url(#heatBlur)">
            {[...points]
              .sort((a, b) => a.stress.severity - b.stress.severity)
              .map(({ def, stress, x, y }) => {
                const active = focusId === def.id;
                const opacity =
                  stress.severity < 40
                    ? 0.12 + (stress.severity / 100) * 0.2
                    : 0.35 + (stress.severity / 100) * 0.55;
                return (
                  <circle
                    key={def.id}
                    cx={x}
                    cy={y}
                    r={heatRadius(stress.severity) * (active ? 1.15 : 1)}
                    fill={heatColor(stress.severity)}
                    opacity={opacity}
                    className="transition-all duration-300"
                  />
                );
              })}
          </g>

          {/* Interactive pins */}
          {points.map(({ def, stress, x, y }) => {
            const active = focusId === def.id;
            const level = riskLevel(stress.severity);
            const pinColor =
              level === "high"
                ? "#ff2d37"
                : level === "medium"
                  ? "#ff6b2b"
                  : "#ffb347";

            return (
              <g
                key={def.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(def.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelect?.(def.id)}
                role="button"
                tabIndex={0}
                aria-label={`${def.label}, severity ${stress.severity}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.(def.id);
                  }
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 7 : 5}
                  fill={pinColor}
                  stroke={active ? "#fff" : "rgba(255,255,255,0.4)"}
                  strokeWidth={active ? 1.5 : 0.8}
                  filter="url(#pinGlow)"
                  className="transition-all duration-200"
                />
                {active && (
                  <g>
                    <rect
                      x={x + 10}
                      y={y - 28}
                      width={Math.max(def.label.length * 6.5 + 36, 80)}
                      height={22}
                      rx={4}
                      fill="rgba(5,5,8,0.92)"
                      stroke="rgba(255,90,70,0.4)"
                      strokeWidth="0.5"
                    />
                    <text
                      x={x + 14}
                      y={y - 13}
                      fill="rgba(255,255,255,0.9)"
                      fontSize="10"
                      fontFamily="ui-monospace, monospace"
                    >
                      {def.label} · {Math.round(stress.severity)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="relative z-20 flex flex-wrap items-center gap-4 border-t border-[rgba(0,212,170,0.1)] px-4 py-2.5 font-mono text-[9px] uppercase tracking-wider text-[var(--fg-subtle)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#ff2d37] shadow-[0_0_8px_#ff2d37]" />
          {t(locale, "heatHigh")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#ff6b2b] shadow-[0_0_6px_#ff6b2b]" />
          {t(locale, "heatMedium")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#ffb347] opacity-60" />
          {t(locale, "heatLow")}
        </span>
      </div>
    </div>
  );
}
