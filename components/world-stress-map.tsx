"use client";

import { memo, useMemo, useState } from "react";
import type { CulturalStressMap, MarketStress } from "@/lib/agents/types";
import { MARKET_CATALOG } from "@/lib/markets/catalog";
import {
  buildLandPaths,
  formatCoords,
  marketCoords,
} from "@/lib/markets/world-projection";
import { riskLevel } from "@/lib/scoring";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const VIEW_W = 960;
const VIEW_H = 480;
const DOT_SPACING = 9;
const DOT_RADIUS = 1.05;
const HIT_RADIUS = 14;       // invisible hover/click target
const CLUSTER_THRESHOLD = 18; // px — markers within this radius fan out

const TONE = {
  high: {
    color: "var(--map-tone-high)",
    soft: "var(--map-tone-high-soft)",
    glow: "var(--map-tone-high-glow)",
  },
  medium: {
    color: "var(--map-tone-medium)",
    soft: "var(--map-tone-medium-soft)",
    glow: "var(--map-tone-medium-glow)",
  },
  low: {
    color: "var(--map-tone-low)",
    soft: "var(--map-tone-low-soft)",
    glow: "var(--map-tone-low-glow)",
  },
} as const;

type MarketPoint = {
  def: (typeof MARKET_CATALOG)[number];
  stress: MarketStress;
  /** Geographic position. */
  gx: number;
  gy: number;
  /** Possibly de-clustered display position. */
  x: number;
  y: number;
};

function severityTier(value: number): "low" | "medium" | "high" {
  return riskLevel(value);
}

/**
 * Detect markers within CLUSTER_THRESHOLD of each other and fan them out
 * radially around their centroid, so each is individually targetable.
 * Original geographic coords are preserved in {gx, gy} for the leader line.
 */
function declusterPoints(
  base: Array<Omit<MarketPoint, "x" | "y">>
): MarketPoint[] {
  // Simple greedy clustering — O(n²) is fine at n=21
  const clusters: number[][] = [];
  base.forEach((_, i) => {
    let placed = false;
    for (const cluster of clusters) {
      const seed = base[cluster[0]];
      const p = base[i];
      const d = Math.hypot(seed.gx - p.gx, seed.gy - p.gy);
      if (d < CLUSTER_THRESHOLD) {
        cluster.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([i]);
  });

  const out: MarketPoint[] = new Array(base.length);
  for (const cluster of clusters) {
    if (cluster.length === 1) {
      const i = cluster[0];
      out[i] = { ...base[i], x: base[i].gx, y: base[i].gy };
      continue;
    }
    // Centroid
    const cx =
      cluster.reduce((s, i) => s + base[i].gx, 0) / cluster.length;
    const cy =
      cluster.reduce((s, i) => s + base[i].gy, 0) / cluster.length;
    // Sort cluster members by severity DESC so highest severity gets the top slot
    const sorted = [...cluster].sort(
      (a, b) => base[b].stress.severity - base[a].stress.severity
    );
    const radius = Math.max(CLUSTER_THRESHOLD * 0.55, 9);
    sorted.forEach((i, k) => {
      const angle = (k / sorted.length) * Math.PI * 2 - Math.PI / 2;
      out[i] = {
        ...base[i],
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
  }
  return out;
}

/* ─── Static map background — memoised so hover doesn't re-render ─── */

const MapBackground = memo(function MapBackground({
  landPaths,
}: {
  landPaths: string[];
}) {
  return (
    <>
      <defs>
        <pattern
          id="dotGrid"
          x="0"
          y="0"
          width={DOT_SPACING}
          height={DOT_SPACING}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={DOT_SPACING / 2}
            cy={DOT_SPACING / 2}
            r={DOT_RADIUS}
            fill="var(--map-dot-grid)"
          />
        </pattern>
        <mask id="landMask">
          <rect width={VIEW_W} height={VIEW_H} fill="black" />
          <g fill="white">
            {landPaths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        </mask>
        <linearGradient
          id="landStroke"
          x1="0"
          y1="0"
          x2="0"
          y2={VIEW_H}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--map-land-from)" />
          <stop offset="100%" stopColor="var(--map-land-to)" />
        </linearGradient>
        <filter id="markerGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Graticule */}
      <g
        stroke="var(--map-grid-stroke)"
        strokeWidth="0.5"
        fill="none"
        pointerEvents="none"
      >
        {Array.from({ length: 13 }).map((_, i) => {
          const lng = -180 + i * 30;
          const x = ((lng + 180) / 360) * VIEW_W;
          return <line key={`m-${lng}`} x1={x} y1={0} x2={x} y2={VIEW_H} />;
        })}
        {Array.from({ length: 7 }).map((_, i) => {
          const lat = 60 - i * 20;
          const y = ((90 - lat) / 180) * VIEW_H;
          return <line key={`p-${lat}`} x1={0} y1={y} x2={VIEW_W} y2={y} />;
        })}
      </g>

      {/* Equator */}
      <line
        x1={0}
        y1={VIEW_H / 2}
        x2={VIEW_W}
        y2={VIEW_H / 2}
        stroke="var(--map-grid-stroke)"
        strokeDasharray="2 4"
        pointerEvents="none"
      />

      {/* Faint continent fills behind dots */}
      <g
        fill="var(--map-ocean-fill)"
        stroke="url(#landStroke)"
        strokeWidth="0.5"
        pointerEvents="none"
      >
        {landPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      {/* Dot-grid continents */}
      <rect
        width={VIEW_W}
        height={VIEW_H}
        fill="url(#dotGrid)"
        mask="url(#landMask)"
        pointerEvents="none"
      />
    </>
  );
});

/* ─── Static halos — also memoised; hover doesn't re-render them ─── */

const HaloLayer = memo(function HaloLayer({ points }: { points: MarketPoint[] }) {
  // Use 'screen' blend so overlapping halos saturate cleanly instead of
  // piling additively into bright orange blobs.
  return (
    <g pointerEvents="none" style={{ mixBlendMode: "screen" }}>
      {points.map(({ def, stress, x, y }) => {
        const tier = severityTier(stress.severity);
        const tone = TONE[tier];
        const sev = Math.min(100, Math.max(0, stress.severity));
        // Smaller, capped halo radii — was 14+sev*0.26 outer, now 10+sev*0.16
        const outerR = 10 + sev * 0.16;
        const midR = 5 + sev * 0.08;
        return (
          <g key={def.id}>
            <circle cx={x} cy={y} r={outerR} fill={tone.soft} />
            <circle cx={x} cy={y} r={midR} fill={tone.soft} />
          </g>
        );
      })}
    </g>
  );
});

/* ─── Main component ─── */

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

  const landPaths = useMemo(() => buildLandPaths(VIEW_W, VIEW_H), []);

  // Compute marker points, then de-cluster overlapping ones.
  const points = useMemo(() => {
    const base = MARKET_CATALOG.map((def) => {
      const stress = stressByMarket.get(def.id);
      const coords = marketCoords(def, VIEW_W, VIEW_H);
      if (!coords || !stress) return null;
      return { def, stress, gx: coords.x, gy: coords.y };
    }).filter(Boolean) as Array<Omit<MarketPoint, "x" | "y">>;
    return declusterPoints(base);
  }, [stressByMarket]);

  // Render markers from low severity to high so high-sev markers sit on top
  // (and capture hit-tests when fan-out positions still overlap slightly).
  const orderedPoints = useMemo(
    () => [...points].sort((a, b) => a.stress.severity - b.stress.severity),
    [points]
  );

  const focusId = hoveredId;
  const focusPoint = focusId
    ? points.find((p) => p.def.id === focusId) ?? null
    : null;

  const headlineStats = useMemo(() => {
    const high = points.filter((p) => p.stress.severity >= 70).length;
    const moderate = points.filter(
      (p) => p.stress.severity >= 40 && p.stress.severity < 70
    ).length;
    const avg = points.length
      ? Math.round(
          points.reduce((sum, p) => sum + p.stress.severity, 0) / points.length
        )
      : 0;
    return { high, moderate, avg, total: points.length };
  }, [points]);

  return (
    <div
      className={cn(
        "world-stress-map relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,var(--map-bg-from)_0%,var(--map-bg-to)_100%)] shadow-[var(--shadow-lg)]",
        className
      )}
    >
      {/* ─── Top chrome ─── */}
      <div className="heatmap-chrome relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-strong)] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--ink-secondary)]">
              {t(locale, "globalOverview")}
            </p>
            <p className="font-display text-[17px] font-semibold tracking-tight text-[var(--ink-primary)] sm:text-[18px]">
              Cultural stress · global
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Kpi label="Markets" value={headlineStats.total.toString()} />
          <Kpi label="High" value={headlineStats.high.toString()} tone="high" />
          <Kpi
            label="Moderate"
            value={headlineStats.moderate.toString()}
            tone="medium"
          />
          <Kpi label="Avg" value={headlineStats.avg.toString()} />
        </div>
      </div>

      {/* ─── Map + detail panel ─── */}
      <div className="grid lg:grid-cols-[1fr_300px]">
        <div className="relative aspect-[2/1] w-full overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_50%,var(--map-vignette))] z-10"
          />

          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="h-full w-full"
            role="img"
            aria-label={t(locale, "stressMapTitle")}
          >
            <MapBackground landPaths={landPaths} />
            <HaloLayer points={points} />

            {/* Leader lines for de-clustered markers — drawn before markers */}
            <g pointerEvents="none">
              {points.map(({ def, gx, gy, x, y, stress }) => {
                const dx = x - gx;
                const dy = y - gy;
                if (dx * dx + dy * dy < 4) return null; // not declustered
                const tone = TONE[severityTier(stress.severity)];
                return (
                  <line
                    key={`lead-${def.id}`}
                    x1={gx}
                    y1={gy}
                    x2={x}
                    y2={y}
                    stroke={tone.color}
                    strokeWidth="0.6"
                    strokeOpacity={focusId === def.id ? 0.7 : 0.25}
                  />
                );
              })}
            </g>

            {/* Geographic anchor pin for declustered markers */}
            <g pointerEvents="none">
              {points.map(({ def, gx, gy, x, y, stress }) => {
                const dx = x - gx;
                const dy = y - gy;
                if (dx * dx + dy * dy < 4) return null;
                const tone = TONE[severityTier(stress.severity)];
                return (
                  <circle
                    key={`anchor-${def.id}`}
                    cx={gx}
                    cy={gy}
                    r="1.2"
                    fill={tone.color}
                    opacity="0.6"
                  />
                );
              })}
            </g>

            {/* Pulse ring — ONLY for the focused marker (was: every high-sev) */}
            {focusPoint && (
              <circle
                cx={focusPoint.x}
                cy={focusPoint.y}
                r="6"
                fill="none"
                stroke={TONE[severityTier(focusPoint.stress.severity)].color}
                strokeWidth="1.2"
                opacity="0.6"
                pointerEvents="none"
              >
                <animate
                  attributeName="r"
                  from="5"
                  to="18"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  from="0.6"
                  to="0"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </circle>
            )}

            {/* Static visual markers — no pointer events */}
            <g pointerEvents="none">
              {orderedPoints.map(({ def, stress, x, y }) => {
                const tier = severityTier(stress.severity);
                const tone = TONE[tier];
                const isFocus = focusId === def.id;
                const isSelected = isFocus;
                const ringR = isFocus ? 10 : 7;

                return (
                  <g key={`vis-${def.id}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={ringR}
                      fill="none"
                      stroke={tone.color}
                      strokeWidth={isFocus ? 1.5 : 1}
                      opacity={isFocus ? 0.95 : 0.62}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={isFocus ? 3.5 : 2.8}
                      fill={tone.color}
                      stroke="var(--map-marker-stroke)"
                      strokeWidth={0.8}
                      filter={isFocus ? "url(#markerGlow)" : undefined}
                    />
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={15}
                        fill="none"
                        stroke={tone.color}
                        strokeWidth="0.8"
                        strokeDasharray="2 3"
                        opacity="0.7"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Invisible hit targets — separate layer ON TOP. Larger than the
                visible dot so hover is forgiving, but laid out top-down so
                higher-severity markers win when they overlap. */}
            <g>
              {orderedPoints.map(({ def, stress, x, y }) => (
                <circle
                  key={`hit-${def.id}`}
                  cx={x}
                  cy={y}
                  r={HIT_RADIUS}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredId(def.id)}
                  onMouseLeave={() =>
                    setHoveredId((id) => (id === def.id ? null : id))
                  }
                  onClick={() => onSelect?.(def.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${def.label}, severity ${Math.round(stress.severity)}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(def.id);
                    }
                  }}
                />
              ))}
            </g>

            {/* Tooltip near focused marker */}
            {focusPoint &&
              (() => {
                const { def, stress, x, y } = focusPoint;
                const tone = TONE[severityTier(stress.severity)];
                const right = x > VIEW_W * 0.7;
                const top = y > VIEW_H * 0.7;
                const tx = right ? x - 12 : x + 12;
                const ty = top ? y - 10 : y + 10;
                const anchor = right ? "end" : "start";
                const align = top ? "baseline" : "hanging";

                return (
                  <g pointerEvents="none">
                    <line
                      x1={x}
                      y1={y}
                      x2={tx}
                      y2={ty}
                      stroke={tone.color}
                      strokeWidth="0.6"
                      opacity="0.5"
                    />
                    <g
                      transform={`translate(${tx} ${ty}) translate(${
                        right ? -6 : 6
                      } ${top ? -6 : 6})`}
                    >
                      <rect
                        x={anchor === "end" ? -172 : 0}
                        y={align === "baseline" ? -46 : 0}
                        width="172"
                        height="46"
                        rx="8"
                        fill="var(--tooltip-bg)"
                        stroke={tone.color}
                        strokeWidth="0.9"
                        strokeOpacity="0.75"
                      />
                      <text
                        x={anchor === "end" ? -162 : 10}
                        y={align === "baseline" ? -28 : 18}
                        fill="var(--tooltip-fg)"
                        fontSize="13"
                        fontFamily="var(--font-display), system-ui"
                        fontWeight="600"
                      >
                        {def.label}
                      </text>
                      <text
                        x={anchor === "end" ? -162 : 10}
                        y={align === "baseline" ? -14 : 32}
                        fill="var(--tooltip-fg-muted)"
                        fontSize="11"
                        fontFamily="var(--font-mono), monospace"
                        letterSpacing="0.08em"
                      >
                        {def.country.toUpperCase()}
                      </text>
                      <text
                        x={anchor === "end" ? -14 : 162}
                        y={align === "baseline" ? -20 : 24}
                        textAnchor="end"
                        fill={tone.color}
                        fontSize="18"
                        fontFamily="var(--font-display), system-ui"
                        fontWeight="700"
                      >
                        {Math.round(stress.severity)}
                      </text>
                    </g>
                  </g>
                );
              })()}
          </svg>
        </div>

        {/* DETAIL PANEL */}
        <div className="heatmap-chrome border-t border-[var(--border-strong)] p-5 sm:p-6 lg:border-l lg:border-t-0">
          {focusPoint ? (
            <DetailPanel point={focusPoint} locale={locale} />
          ) : (
            <EmptyPanel locale={locale} />
          )}
        </div>
      </div>

      {/* ─── Bottom strip ─── */}
      <div className="heatmap-chrome relative z-20 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-strong)] px-5 py-3.5 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
          <LegendDot tone="high" label={t(locale, "heatHigh")} sublabel="70 — 100" />
          <LegendDot tone="medium" label={t(locale, "heatMedium")} sublabel="40 — 69" />
          <LegendDot tone="low" label={t(locale, "heatLow")} sublabel="0 — 39" />
        </div>
        {focusPoint && (
          <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
            {formatCoords(focusPoint.def.lat, focusPoint.def.lng)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ───────────────────────────────────────── */

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "high" | "medium";
}) {
  const colorClass =
    tone === "high"
      ? "text-[var(--danger)]"
      : tone === "medium"
        ? "text-[var(--warning)]"
        : "text-[var(--fg)]";
  return (
    <div className="flex items-baseline gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5">
      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-secondary)] sm:text-[12px]">
        {label}
      </span>
      <span className={cn("font-display text-[16px] font-semibold tabular-nums sm:text-[17px]", colorClass)}>
        {value}
      </span>
    </div>
  );
}

function LegendDot({
  tone,
  label,
  sublabel,
}: {
  tone: "high" | "medium" | "low";
  label: string;
  sublabel: string;
}) {
  const t = TONE[tone];
  return (
    <span className="flex items-center gap-2">
      <span className="relative inline-flex h-3 w-3 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: t.soft }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.glow}` }}
        />
      </span>
      <span className="font-display text-[14px] font-medium text-[var(--ink-primary)] sm:text-[15px]">
        {label}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-secondary)] sm:text-[12px]">
        {sublabel}
      </span>
    </span>
  );
}

function DetailPanel({
  point,
  locale,
}: {
  point: MarketPoint;
  locale: Locale;
}) {
  const { def, stress } = point;
  const tier = severityTier(stress.severity);
  const tone = TONE[tier];
  const tierLabel =
    tier === "high"
      ? t(locale, "heatHigh")
      : tier === "medium"
        ? t(locale, "heatMedium")
        : t(locale, "heatLow");

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--ink-secondary)]">
          {def.country}
        </p>
        <h3 className="mt-1 font-display text-[22px] font-semibold tracking-tight text-[var(--ink-primary)] sm:text-[24px]">
          {def.label}
        </h3>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-[12px] font-medium uppercase tracking-wider text-[var(--ink-secondary)]">
            Severity
          </p>
          <span
            className="font-display text-4xl font-semibold tabular-nums"
            style={{ color: tone.color }}
          >
            {Math.round(stress.severity)}
          </span>
        </div>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--bg-inset)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, stress.severity))}%`,
              backgroundColor: tone.color,
              boxShadow: `0 0 12px ${tone.glow}`,
            }}
          />
        </div>
        <p
          className="mt-2 font-mono text-[12px] font-medium uppercase tracking-wider"
          style={{ color: tone.color }}
        >
          {tierLabel}
        </p>
      </div>

      <p className="text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        {stress.severity >= 40
          ? stress.summary
          : t(locale, "noTripwires")}
      </p>

      {stress.triggers.length > 0 && (
        <div className="mt-auto space-y-2.5">
          <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-[var(--ink-secondary)]">
            {t(locale, "flaggedElements")}
          </p>
          {stress.triggers.slice(0, 2).map((trig, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] p-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider sm:text-[11px]"
                  style={{
                    backgroundColor: tone.soft,
                    color: tone.color,
                  }}
                >
                  {trig.type === "copy"
                    ? t(locale, "triggerCopy")
                    : t(locale, "triggerVisual")}
                </span>
              </div>
              <p className="line-clamp-2 text-[14px] leading-snug text-[var(--ink-primary)]">
                &ldquo;{trig.text}&rdquo;
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyPanel({ locale }: { locale: Locale }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="6" x2="12" y2="14" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      </div>
      <p className="font-display text-[16px] font-semibold text-[var(--ink-primary)] sm:text-[17px]">
        Hover a market
      </p>
      <p className="mt-2 max-w-[220px] text-[14px] leading-relaxed text-[var(--ink-secondary)]">
        {t(locale, "stressMapTitle")}
      </p>
    </div>
  );
}

