"use client";

import type { LiveStats } from "@/lib/docs/types";
import { Button } from "@/components/ui/button";

const SOURCE_LABEL: Record<LiveStats["source"], string> = {
  database: "Live · Supabase",
  memory: "Live · in-memory (demo)",
  static: "Static fallback",
};

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <p className="font-display text-2xl font-semibold tracking-tight text-[var(--fg)] tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{label}</p>
    </div>
  );
}

/** Live system dashboard strip (controlled — the experience owns the stats state). */
export function LiveStatsPanel({
  stats,
  onRefresh,
  loading = false,
}: {
  stats: LiveStats;
  onRefresh?: () => void;
  loading?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--success)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] pulse-dot" />
          {SOURCE_LABEL[stats.source]}
        </span>
        {onRefresh && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            loading={loading}
            loadingLabel="Refreshing…"
            className="no-print"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat value={stats.runs} label="Simulation runs" />
        <Stat value={stats.completedRuns} label="Completed runs" />
        <Stat value={stats.campaigns} label="Campaigns" />
        <Stat value={stats.verdicts} label="Agent verdicts" />
        <Stat value={stats.brands} label="Brand entities" />
        <Stat value={stats.ragSamples} label="RAG samples" />
        <Stat value={stats.agents} label="Red-team agents" />
        <Stat
          value={new Date(stats.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          label="As of"
        />
      </div>
    </div>
  );
}
