"use client";

import { useEffect, useState } from "react";
import type { RunScores } from "@/lib/agents/types";

/**
 * ScoreRadar — animated 6-axis radar chart visualizing all composite
 * Backfire metrics on one canvas. Larger polygon area = more risk.
 */

export type RadarMetric = {
  key: string;
  label: string;
  short: string;
  value: number;
  display: number;
  inverse?: boolean;
};

export const DEFAULT_RADAR_SIZE = 400;
export const DEFAULT_RADAR_R = 132;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1.0];
const ANIM_DURATION = 1100;

export function buildRadarMetrics(
  scores: RunScores,
  labels: Record<string, string>
): RadarMetric[] {
  return [
    {
      key: "backfireScore",
      label: labels.backfireScore ?? "Backfire Score",
      short: "Backfire",
      value: scores.backfireScore,
      display: scores.backfireScore,
    },
    {
      key: "backfireRisk",
      label: labels.backfireRisk ?? "Backfire Risk",
      short: "Risk",
      value: scores.backfireRisk,
      display: scores.backfireRisk,
    },
    {
      key: "memeability",
      label: labels.memeability ?? "Memeability",
      short: "Meme",
      value: scores.memeability,
      display: scores.memeability,
    },
    {
      key: "polarization",
      label: labels.polarization ?? "Polarization",
      short: "Polar.",
      value: scores.polarizationCoefficient,
      display: scores.polarizationCoefficient,
    },
    {
      key: "brandSafetyDrift",
      label: labels.brandSafetyDrift ?? "Brand-Safety Drift",
      short: "Drift",
      value: scores.brandSafetyDrift,
      display: scores.brandSafetyDrift,
    },
    {
      key: "resonance",
      label: labels.resonance ?? "Resonance",
      short: "Reson.",
      value: 100 - scores.resonance,
      display: scores.resonance,
      inverse: true,
    },
  ];
}

export function radarPolar(
  cx: number,
  cy: number,
  r: number,
  i: number,
  count: number
): readonly [number, number] {
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2;
  const a = startAngle + i * angleStep;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function useAnimatedProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ANIM_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return progress;
}

function tone(value: number): { stroke: string; bar: string } {
  if (value >= 70) return { stroke: "var(--signal)", bar: "bg-[var(--signal)]" };
  if (value >= 40) return { stroke: "var(--warning)", bar: "bg-[var(--warning)]" };
  return { stroke: "var(--success)", bar: "bg-[var(--success)]" };
}

export function ScoreRadar({
  scores,
  labels,
  size = DEFAULT_RADAR_SIZE,
  showChrome = true,
}: {
  scores: RunScores;
  labels: Record<string, string>;
  size?: number;
  showChrome?: boolean;
}) {
  const progress = useAnimatedProgress();
  const metrics = buildRadarMetrics(scores, labels);
  const scale = size / DEFAULT_RADAR_SIZE;
  const CX = size / 2;
  const CY = size / 2;
  const R = DEFAULT_RADAR_R * scale;
  const count = metrics.length;

  const polar = (radius: number, i: number) => radarPolar(CX, CY, radius, i, count);

  const dataPoints = metrics.map((m, i) =>
    polar((Math.max(0, Math.min(100, m.value)) / 100) * R * progress, i)
  );
  const polygonStr = dataPoints.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  const headline = metrics.reduce((acc, m) => (m.value > acc.value ? m : acc), metrics[0]);
  const headlineTone = tone(headline.value);
  const gradientId = showChrome ? "radarFill" : "radarFillCenterpiece";

  const chart = (
    <div className={showChrome ? "relative mx-auto w-full max-w-[420px]" : "relative"}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full"
        role="img"
        aria-label="Composite metric radar"
      >
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.35" />
            <stop offset="65%" stopColor="var(--signal)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.04" />
          </radialGradient>
          {!showChrome ? null : (
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {RINGS.map((ringScale, idx) => {
          const ringPts = metrics
            .map((_, i) => {
              const [x, y] = polar(ringScale * R, i);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");
          return (
            <polygon
              key={ringScale}
              points={ringPts}
              fill="none"
              stroke="var(--chart-grid)"
              strokeOpacity={0.04 + idx * 0.015}
              strokeWidth={1}
              className="fade-in"
              style={{ animationDelay: `${idx * 70}ms` }}
            />
          );
        })}

        {metrics.map((_, i) => {
          const [x, y] = polar(R, i);
          return (
            <line
              key={i}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="var(--chart-grid)"
              strokeOpacity={0.08}
              strokeWidth={1}
              className="fade-in"
              style={{ animationDelay: `${100 + i * 40}ms` }}
            />
          );
        })}

        {metrics.map((_, i) => {
          const [x, y] = polar(R * 0.5, i);
          return (
            <circle
              key={`tick-${i}`}
              cx={x}
              cy={y}
              r={1.5 * scale}
              fill="var(--chart-axis)"
              fillOpacity={0.18}
              className="fade-in"
              style={{ animationDelay: `${200 + i * 40}ms` }}
            />
          );
        })}

        <polygon
          points={polygonStr}
          fill={`url(#${gradientId})`}
          stroke="var(--signal)"
          strokeWidth={2 * scale}
          strokeLinejoin="round"
          filter={showChrome ? "url(#radarGlow)" : undefined}
          style={{ transition: "opacity 200ms ease", opacity: progress > 0.05 ? 1 : 0 }}
        />

        {dataPoints.map(([x, y], i) => (
          <g key={`vx-${i}`}>
            <circle cx={x} cy={y} r={6 * scale} fill="var(--signal)" fillOpacity={0.18} />
            <circle
              cx={x}
              cy={y}
              r={3.5 * scale}
              fill="var(--signal)"
              stroke="var(--bg-base)"
              strokeWidth={1.5 * scale}
            />
          </g>
        ))}

        <circle cx={CX} cy={CY} r={3 * scale} fill="var(--chart-axis)" fillOpacity={0.4} />
        <circle cx={CX} cy={CY} r={1.25 * scale} fill="var(--signal)" />

        {showChrome &&
          metrics.map((m, i) => {
            const [x, y] = polar(R + 28 * scale, i);
            const dx = x - CX;
            const anchor: "start" | "middle" | "end" =
              Math.abs(dx) < 6 * scale ? "middle" : dx > 0 ? "start" : "end";
            const labelTone = tone(m.value);
            return (
              <g
                key={`lbl-${i}`}
                className="fade-in"
                style={{ animationDelay: `${900 + i * 60}ms` }}
              >
                <text
                  x={x}
                  y={y - 4 * scale}
                  textAnchor={anchor}
                  fontSize={11 * scale}
                  fontFamily="var(--font-mono), monospace"
                  letterSpacing="0.08em"
                  fill="var(--ink-tertiary)"
                  style={{ textTransform: "uppercase" }}
                >
                  {m.short}
                </text>
                <text
                  x={x}
                  y={y + 12 * scale}
                  textAnchor={anchor}
                  fontSize={16 * scale}
                  fontWeight={600}
                  fontFamily="var(--font-display), serif"
                  fill={labelTone.stroke}
                >
                  {Math.round(m.display)}
                </text>
              </g>
            );
          })}
      </svg>
    </div>
  );

  if (!showChrome) {
    return chart;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--bg-elevated)] p-6 md:p-8">
      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
        {chart}
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--ink-tertiary)]">
              Composite radar
            </p>
            <h3 className="mt-1.5 font-display text-2xl font-semibold text-[var(--ink-primary)]">
              Six axes. One silhouette.
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-secondary)]">
              Larger polygon area means greater overall vulnerability. The shape
              tells you which direction the campaign is failing.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--bg-inset)] p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-tertiary)]">
              Highest-risk axis
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-display text-3xl font-semibold"
                style={{ color: headlineTone.stroke }}
              >
                {Math.round(headline.display)}
              </span>
              <span className="text-[13px] text-[var(--ink-primary)]">{headline.label}</span>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {metrics.map((m) => {
              const t = tone(m.value);
              return (
                <li
                  key={m.key}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="flex items-center gap-2 text-[var(--ink-secondary)]">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: t.stroke }}
                    />
                    <span className="truncate">{m.label}</span>
                  </span>
                  <span
                    className="font-mono text-[12px] font-medium tabular-nums"
                    style={{ color: t.stroke }}
                  >
                    {Math.round(m.display)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
