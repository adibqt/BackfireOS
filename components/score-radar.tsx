"use client";

import { useEffect, useState } from "react";
import type { RunScores } from "@/lib/agents/types";

/**
 * ScoreRadar — animated 6-axis radar chart visualizing all composite
 * Backfire metrics on one canvas. Larger polygon area = more risk.
 *
 * Each axis is positioned so visually-paired metrics sit across from each
 * other (e.g. Resonance — the only "good" signal — sits opposite the
 * peak-risk axes). Resonance is inverted on the radar so the polygon
 * remains intuitive: more shape = more trouble.
 */

type Metric = {
  key: string;
  label: string;
  short: string;
  /** Value to plot on the polygon (0–100). Higher = more shape. */
  value: number;
  /** Value to display as a number — keeps the user-facing semantics. */
  display: number;
  inverse?: boolean;
};

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 132;
const RINGS = [0.2, 0.4, 0.6, 0.8, 1.0];
const ANIM_DURATION = 1100;

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
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return progress;
}

function tone(value: number): { stroke: string; bar: string } {
  if (value >= 70) return { stroke: "var(--danger)", bar: "bg-[var(--danger)]" };
  if (value >= 40) return { stroke: "var(--warning)", bar: "bg-[var(--warning)]" };
  return { stroke: "var(--success)", bar: "bg-[var(--success)]" };
}

export function ScoreRadar({
  scores,
  labels,
}: {
  scores: RunScores;
  labels: Record<string, string>;
}) {
  const progress = useAnimatedProgress();

  // Order matters — pairs across the radar. Resonance (the only "good"
  // signal) sits opposite Backfire Score for visual contrast.
  const metrics: Metric[] = [
    {
      key: "backfireScore",
      label: labels.backfireScore,
      short: "Backfire",
      value: scores.backfireScore,
      display: scores.backfireScore,
    },
    {
      key: "backfireRisk",
      label: labels.backfireRisk,
      short: "Risk",
      value: scores.backfireRisk,
      display: scores.backfireRisk,
    },
    {
      key: "memeability",
      label: labels.memeability,
      short: "Meme",
      value: scores.memeability,
      display: scores.memeability,
    },
    {
      key: "polarization",
      label: labels.polarization,
      short: "Polar.",
      value: scores.polarizationCoefficient,
      display: scores.polarizationCoefficient,
    },
    {
      key: "brandSafetyDrift",
      label: labels.brandSafetyDrift,
      short: "Drift",
      value: scores.brandSafetyDrift,
      display: scores.brandSafetyDrift,
    },
    {
      key: "resonance",
      label: labels.resonance,
      short: "Reson.",
      value: 100 - scores.resonance,
      display: scores.resonance,
      inverse: true,
    },
  ];

  const angleStep = (2 * Math.PI) / metrics.length;
  // Start at top (–90°) so the first axis is straight up
  const startAngle = -Math.PI / 2;

  const polar = (radius: number, i: number) => {
    const a = startAngle + i * angleStep;
    return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)] as const;
  };

  // Animated data polygon points
  const dataPoints = metrics.map((m, i) =>
    polar((Math.max(0, Math.min(100, m.value)) / 100) * R * progress, i)
  );
  const polygonStr = dataPoints.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");

  // Headline = highest-risk axis
  const headline = metrics.reduce((acc, m) => (m.value > acc.value ? m : acc), metrics[0]);
  const headlineTone = tone(headline.value);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[image:var(--veil)] p-6 backdrop-blur-xl md:p-8">
      {/* Aurora */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_50%,rgba(255,77,87,0.12),transparent_70%)]"
      />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
        {/* Chart */}
        <div className="relative mx-auto w-full max-w-[420px]">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-auto w-full"
            role="img"
            aria-label="Composite metric radar"
          >
            <defs>
              <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.45" />
                <stop offset="65%" stopColor="var(--accent)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
              </radialGradient>
              <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Concentric ring guides */}
            {RINGS.map((scale, idx) => {
              const ringPts = metrics
                .map((_, i) => {
                  const [x, y] = polar(scale * R, i);
                  return `${x.toFixed(2)},${y.toFixed(2)}`;
                })
                .join(" ");
              return (
                <polygon
                  key={scale}
                  points={ringPts}
                  fill="none"
                  stroke="white"
                  strokeOpacity={0.04 + idx * 0.015}
                  strokeWidth={1}
                  className="fade-in"
                  style={{ animationDelay: `${idx * 70}ms` }}
                />
              );
            })}

            {/* Axes */}
            {metrics.map((_, i) => {
              const [x, y] = polar(R, i);
              return (
                <line
                  key={i}
                  x1={CX}
                  y1={CY}
                  x2={x}
                  y2={y}
                  stroke="white"
                  strokeOpacity={0.08}
                  strokeWidth={1}
                  className="fade-in"
                  style={{ animationDelay: `${100 + i * 40}ms` }}
                />
              );
            })}

            {/* Tick marks at 50% on each axis */}
            {metrics.map((_, i) => {
              const [x, y] = polar(R * 0.5, i);
              return (
                <circle
                  key={`tick-${i}`}
                  cx={x}
                  cy={y}
                  r={1.5}
                  fill="white"
                  fillOpacity={0.18}
                  className="fade-in"
                  style={{ animationDelay: `${200 + i * 40}ms` }}
                />
              );
            })}

            {/* Data polygon fill */}
            <polygon
              points={polygonStr}
              fill="url(#radarFill)"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinejoin="round"
              filter="url(#radarGlow)"
              style={{ transition: "opacity 200ms ease", opacity: progress > 0.05 ? 1 : 0 }}
            />

            {/* Vertex dots */}
            {dataPoints.map(([x, y], i) => (
              <g key={`vx-${i}`}>
                <circle cx={x} cy={y} r={6} fill="var(--accent)" fillOpacity={0.18} />
                <circle
                  cx={x}
                  cy={y}
                  r={3.5}
                  fill="var(--accent)"
                  stroke="var(--bg)"
                  strokeWidth={1.5}
                />
              </g>
            ))}

            {/* Center pin */}
            <circle cx={CX} cy={CY} r={3} fill="white" fillOpacity={0.4} />
            <circle cx={CX} cy={CY} r={1.25} fill="var(--accent)" />

            {/* Axis labels (outside the polygon) */}
            {metrics.map((m, i) => {
              const [x, y] = polar(R + 28, i);
              // Anchor based on horizontal position
              const dx = x - CX;
              const anchor: "start" | "middle" | "end" =
                Math.abs(dx) < 6 ? "middle" : dx > 0 ? "start" : "end";
              const labelTone = tone(m.value);
              return (
                <g
                  key={`lbl-${i}`}
                  className="fade-in"
                  style={{ animationDelay: `${900 + i * 60}ms` }}
                >
                  <text
                    x={x}
                    y={y - 4}
                    textAnchor={anchor}
                    fontSize={11}
                    fontFamily="var(--font-mono), monospace"
                    letterSpacing="0.08em"
                    fill="var(--fg-subtle)"
                    style={{ textTransform: "uppercase" }}
                  >
                    {m.short}
                  </text>
                  <text
                    x={x}
                    y={y + 12}
                    textAnchor={anchor}
                    fontSize={16}
                    fontWeight={600}
                    fontFamily="var(--font-display), sans-serif"
                    fill={labelTone.stroke}
                  >
                    {Math.round(m.display)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel — legend + headline */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              Composite radar
            </p>
            <h3 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-[var(--fg)]">
              Six axes. One silhouette.
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">
              Larger polygon area means greater overall vulnerability. The shape
              tells you which direction the campaign is failing.
            </p>
          </div>

          {/* Headline pill */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              Highest-risk axis
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-display text-3xl font-semibold tracking-tight"
                style={{ color: headlineTone.stroke }}
              >
                {Math.round(headline.display)}
              </span>
              <span className="text-[13px] text-[var(--fg)]">{headline.label}</span>
            </div>
          </div>

          {/* Compact legend */}
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {metrics.map((m) => {
              const t = tone(m.value);
              return (
                <li
                  key={m.key}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="flex items-center gap-2 text-[var(--fg-muted)]">
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
