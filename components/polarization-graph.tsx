"use client";

import { useEffect, useState } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import { riskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const ORBIT_R = 145;
const CENTER_R = 24;
const AGENT_R = 20;
const ANIM_MS = 1100;
const PROXIMITY_THRESHOLD = 18;

const AGENT_SHORT: Record<string, string> = {
  meme_engineer: "MEME",
  regional_outsider: "RGON",
  cynical_journalist: "PRSS",
  rival_brand: "RVBL",
  regulatory_activist: "REGU",
  brand_purist: "BRND",
};

function severityColor(s: number): string {
  const lv = riskLevel(s);
  return lv === "high" ? "var(--danger)" : lv === "medium" ? "var(--warning)" : "var(--success)";
}

function severitySoft(s: number): string {
  const lv = riskLevel(s);
  return lv === "high" ? "var(--danger-soft)" : lv === "medium" ? "var(--warning-soft)" : "var(--success-soft)";
}

function useProgress(): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setP(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ANIM_MS);
      setP(1 - (1 - t) ** 3);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return p;
}

interface GraphNode {
  id: string;
  short: string;
  fullName: string;
  severity: number;
  x: number;
  y: number;
  isCenter: boolean;
}

interface GraphEdge {
  src: string;
  tgt: string;
  weight: number;
  kind: "spoke" | "citation" | "proximity";
}

function buildGraph(
  verdicts: AgentVerdict[],
  slogan: string
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const step = (2 * Math.PI) / verdicts.length;

  const nodes: GraphNode[] = [
    {
      id: "campaign",
      short: "AD",
      fullName: slogan,
      severity: -1,
      x: CX,
      y: CY,
      isCenter: true,
    },
    ...verdicts.map((v, i) => {
      const a = -Math.PI / 2 + i * step;
      return {
        id: v.agentId,
        short: AGENT_SHORT[v.agentId] ?? v.agentName.slice(0, 4).toUpperCase(),
        fullName: v.agentName,
        severity: v.severity,
        x: CX + ORBIT_R * Math.cos(a),
        y: CY + ORBIT_R * Math.sin(a),
        isCenter: false,
      };
    }),
  ];

  const edges: GraphEdge[] = verdicts.map((v) => ({
    src: "campaign",
    tgt: v.agentId,
    weight: v.severity / 100,
    kind: "spoke" as const,
  }));

  for (let i = 0; i < verdicts.length; i++) {
    for (let j = i + 1; j < verdicts.length; j++) {
      const a = verdicts[i];
      const b = verdicts[j];
      const shared = a.citationIds.filter((id) => b.citationIds.includes(id));
      if (shared.length > 0) {
        edges.push({
          src: a.agentId,
          tgt: b.agentId,
          weight: Math.min(1, shared.length / 3),
          kind: "citation",
        });
      } else if (Math.abs(a.severity - b.severity) <= PROXIMITY_THRESHOLD) {
        const diff = Math.abs(a.severity - b.severity);
        edges.push({
          src: a.agentId,
          tgt: b.agentId,
          weight: ((PROXIMITY_THRESHOLD - diff) / PROXIMITY_THRESHOLD) * 0.6,
          kind: "proximity",
        });
      }
    }
  }

  return { nodes, edges };
}

export function PolarizationGraph({
  verdicts,
  polarizationCoefficient,
  campaignSlogan,
}: {
  verdicts: AgentVerdict[];
  polarizationCoefficient: number;
  campaignSlogan: string;
}) {
  const p = useProgress();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (verdicts.length === 0) return null;

  const { nodes, edges } = buildGraph(verdicts, campaignSlogan);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const connectedTo = selectedId
    ? new Set(
        edges.flatMap((e) =>
          e.src === selectedId ? [e.tgt] : e.tgt === selectedId ? [e.src] : []
        )
      )
    : null;

  function nodeAlpha(nodeId: string): number {
    if (!selectedId) return 1;
    if (nodeId === selectedId || connectedTo?.has(nodeId)) return 1;
    return 0.1;
  }

  function edgeAlpha(e: GraphEdge): number {
    if (!selectedId) return 1;
    return e.src === selectedId || e.tgt === selectedId ? 1 : 0;
  }

  function toggleNode(nodeId: string) {
    setSelectedId((prev) => (prev === nodeId ? null : nodeId));
  }

  const crossEdges = edges
    .filter((e) => e.kind !== "spoke")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  // Cross-edges phase in after spokes and nodes are mostly settled
  const crossOpacity = Math.max(0, (p - 0.6) / 0.4);

  const coampColor =
    polarizationCoefficient >= 25
      ? "var(--danger)"
      : polarizationCoefficient >= 12
        ? "var(--warning)"
        : "var(--success)";

  const coampNote =
    polarizationCoefficient >= 25
      ? "Critics are attacking from many unrelated directions at once. No single fix will neutralize the risk — this campaign needs a broad rethink."
      : polarizationCoefficient >= 12
        ? "Some critics share the same pressure points, but others are coming from different angles. Prioritise the overlapping issues first."
        : "All your critics are zeroing in on the same weakness. That's actually good news — one targeted fix could address most of the risk.";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[image:var(--veil)] p-6 backdrop-blur-xl md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_45%_at_50%_50%,rgba(255,77,87,0.08),transparent_70%)]"
      />

      <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
        {/* Graph */}
        <div className="mx-auto w-full max-w-[420px]">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="h-auto w-full"
            role="img"
            aria-label="Agent co-amplification network graph"
            onClick={() => setSelectedId(null)}
            style={{ cursor: selectedId ? "default" : "default" }}
          >
            <defs>
              <filter id="pgNodeGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="pgEdgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Orbit guide ring */}
            <circle
              cx={CX}
              cy={CY}
              r={ORBIT_R}
              fill="none"
              stroke="white"
              strokeOpacity={0.05}
              strokeWidth={1}
              strokeDasharray="4 6"
            />

            {/* Spoke edges — grow from center outward */}
            {edges
              .filter((e) => e.kind === "spoke")
              .map((e) => {
                const tgt = byId.get(e.tgt);
                if (!tgt) return null;
                const color = severityColor(tgt.severity);
                return (
                  <line
                    key={e.tgt}
                    x1={CX}
                    y1={CY}
                    x2={CX + (tgt.x - CX) * p}
                    y2={CY + (tgt.y - CY) * p}
                    stroke={color}
                    strokeOpacity={(0.14 + e.weight * 0.22) * edgeAlpha(e)}
                    strokeWidth={1 + e.weight * 2.2}
                    style={{ transition: "stroke-opacity 0.2s" }}
                  />
                );
              })}

            {/* Cross edges — curved arcs, fade in after spokes */}
            {edges
              .filter((e) => e.kind !== "spoke")
              .map((e) => {
                const src = byId.get(e.src);
                const tgt = byId.get(e.tgt);
                if (!src || !tgt) return null;
                // Control point: bow outward away from center
                const mx = (src.x + tgt.x) / 2;
                const my = (src.y + tgt.y) / 2;
                const dx = mx - CX;
                const dy = my - CY;
                const len = Math.hypot(dx, dy) || 1;
                const cpx = mx + (dx / len) * 28;
                const cpy = my + (dy / len) * 28;
                const isCitation = e.kind === "citation";
                return (
                  <path
                    key={`${e.src}-${e.tgt}`}
                    d={`M ${src.x} ${src.y} Q ${cpx} ${cpy} ${tgt.x} ${tgt.y}`}
                    fill="none"
                    stroke={isCitation ? "var(--accent)" : "var(--fg-muted)"}
                    strokeOpacity={
                      (isCitation ? 0.45 + e.weight * 0.35 : 0.18 + e.weight * 0.22) *
                      crossOpacity *
                      edgeAlpha(e)
                    }
                    strokeWidth={isCitation ? 1.5 : 1}
                    strokeDasharray={e.kind === "proximity" ? "3 4" : undefined}
                    filter={isCitation ? "url(#pgEdgeGlow)" : undefined}
                    style={{ transition: "stroke-opacity 0.2s" }}
                  />
                );
              })}

            {/* Agent nodes */}
            {nodes
              .filter((n) => !n.isCenter)
              .map((n) => {
                const color = severityColor(n.severity);
                const soft = severitySoft(n.severity);
                const isSelected = selectedId === n.id;
                const isHighlighted = !selectedId || isSelected || connectedTo?.has(n.id);
                return (
                  <g
                    key={n.id}
                    style={{ opacity: p * nodeAlpha(n.id), cursor: "pointer", transition: "opacity 0.2s" }}
                    onClick={(evt) => { evt.stopPropagation(); toggleNode(n.id); }}
                  >
                    {/* selection / connection ring */}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={AGENT_R + 7}
                      fill={color}
                      fillOpacity={isHighlighted ? (isSelected ? 0.18 : 0.06) : 0.06}
                    />
                    {isSelected && (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={AGENT_R + 10}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        strokeOpacity={0.55}
                        strokeDasharray="4 3"
                      />
                    )}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={AGENT_R}
                      fill={soft}
                      stroke={color}
                      strokeWidth={isHighlighted ? 2 : 1.5}
                      strokeOpacity={isHighlighted ? 0.9 : 0.65}
                      filter="url(#pgNodeGlow)"
                    />
                    <text
                      x={n.x}
                      y={n.y - 3}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={8}
                      fontFamily="var(--font-mono),monospace"
                      letterSpacing="0.06em"
                      fill={color}
                      fontWeight={700}
                    >
                      {n.short}
                    </text>
                    <text
                      x={n.x}
                      y={n.y + 9}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="var(--font-mono),monospace"
                      fill={color}
                      fillOpacity={0.75}
                    >
                      {n.severity}
                    </text>
                  </g>
                );
              })}

            {/* Center campaign node */}
            <g
              style={{ opacity: p * nodeAlpha("campaign"), cursor: "pointer", transition: "opacity 0.2s" }}
              onClick={(evt) => { evt.stopPropagation(); toggleNode("campaign"); }}
            >
              <circle cx={CX} cy={CY} r={CENTER_R + 9} fill="var(--accent)" fillOpacity={selectedId === "campaign" ? 0.15 : 0.07} />
              {selectedId === "campaign" && (
                <circle
                  cx={CX}
                  cy={CY}
                  r={CENTER_R + 13}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeOpacity={0.45}
                  strokeDasharray="4 3"
                />
              )}
              <circle
                cx={CX}
                cy={CY}
                r={CENTER_R}
                fill="var(--bg-elev-2)"
                stroke="var(--accent)"
                strokeWidth={selectedId === "campaign" ? 2 : 1.5}
                strokeOpacity={selectedId === "campaign" ? 0.85 : 0.5}
              />
              <text
                x={CX}
                y={CY - 4}
                textAnchor="middle"
                fontSize={8}
                fontFamily="var(--font-mono),monospace"
                letterSpacing="0.1em"
                fill="var(--accent)"
                fontWeight={700}
              >
                AD
              </text>
              <text
                x={CX}
                y={CY + 7}
                textAnchor="middle"
                fontSize={7}
                fontFamily="var(--font-mono),monospace"
                fill="var(--fg-subtle)"
              >
                CAMP.
              </text>
            </g>
          </svg>
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              How to read this
            </p>
            <h3 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-[var(--fg)]">
              Backlash propagation map
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">
              The lines between critics show where your campaign is most exposed.
              A <span className="text-[var(--accent)] font-medium">solid line</span> means
              two critics referenced the exact same cultural flashpoint — a shared trigger
              that can set both off simultaneously.
              A <span className="text-[var(--fg)] font-medium">dashed line</span> means their
              severity scores are close, so a news cycle that activates one will likely
              activate the other too.
            </p>
          </div>

          {/* Polarization coefficient */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              How spread out is the criticism?
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="font-display text-3xl font-semibold tracking-tight"
                style={{ color: coampColor }}
              >
                {polarizationCoefficient}
              </span>
              <span className="text-[13px] text-[var(--fg-muted)]">
                spread score{" "}
                <span className="text-[var(--fg-subtle)]">
                  (0 = everyone agrees · 50+ = all over the place)
                </span>
              </span>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--fg-subtle)]">
              {coampNote}
            </p>
          </div>

          {/* Top co-amplification pairs */}
          {crossEdges.length > 0 && (
            <div>
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Most likely to pile on together
              </p>
              <p className="mb-2.5 text-[12px] text-[var(--fg-subtle)]">
                If one of these critics gets triggered, the other probably will too.
              </p>
              <ul className="space-y-2">
                {crossEdges.map((e) => {
                  const src = byId.get(e.src);
                  const tgt = byId.get(e.tgt);
                  if (!src || !tgt) return null;
                  const isCitation = e.kind === "citation";
                  return (
                    <li
                      key={`${e.src}-${e.tgt}`}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)] px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] text-[var(--fg)]">
                          <span className="font-medium">{src.fullName}</span>
                          <span className="mx-1.5 text-[var(--fg-subtle)]">&amp;</span>
                          <span className="font-medium">{tgt.fullName}</span>
                        </p>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px]",
                            isCitation
                              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                              : "bg-[var(--bg-elev-2)] text-[var(--fg-subtle)]"
                          )}
                        >
                          {isCitation ? "same trigger" : "similar severity"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">
                        {isCitation
                          ? "Both critics referenced the same cultural example from the dataset."
                          : "Their risk scores are close — a news cycle that amplifies one will likely amplify the other."}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Legend */}
          <div className="space-y-1.5">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              What the lines mean
            </p>
            <div className="flex items-center gap-2.5 text-[12px] text-[var(--fg-muted)]">
              <svg width="28" height="10" aria-hidden>
                <line x1="0" y1="5" x2="28" y2="5" stroke="var(--accent)" strokeWidth="1.5" />
              </svg>
              Same cultural flashpoint triggered both critics
            </div>
            <div className="flex items-center gap-2.5 text-[12px] text-[var(--fg-muted)]">
              <svg width="28" height="10" aria-hidden>
                <line
                  x1="0"
                  y1="5"
                  x2="28"
                  y2="5"
                  stroke="var(--fg-muted)"
                  strokeWidth="1"
                  strokeDasharray="3 4"
                />
              </svg>
              Similar severity — likely to trend together
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
