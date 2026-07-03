"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageShell, PageHero } from "@/components/page-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { riskLevel } from "@/lib/scoring";
import type { SimulationRun } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function RunRow({
  run,
  onDelete,
  deleting,
}: {
  run: SimulationRun;
  onDelete: () => void;
  deleting: boolean;
}) {
  const score = run.scores?.backfireScore ?? 0;
  const level = riskLevel(score);
  const tone = {
    low: { bar: "bg-[var(--success)]", text: "text-[var(--success)]", border: "hover:border-[var(--success)]/30" },
    medium: { bar: "bg-[var(--warning)]", text: "text-[var(--warning)]", border: "hover:border-[var(--warning)]/30" },
    high: { bar: "bg-[var(--danger)]", text: "text-[var(--danger)]", border: "hover:border-[var(--danger)]/30" },
  }[level];

  return (
    <div
      className={cn(
        "group flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 lift",
        tone.border
      )}
    >
      <Link
        href={`/runs/${run.id}`}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-4"
      >
        {/* Score ring */}
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg className="absolute h-14 w-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
            <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="3" className="text-[var(--bg-elev-3)]" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 22}
              strokeDashoffset={2 * Math.PI * 22 - (score / 100) * 2 * Math.PI * 22}
              className={cn("transition-all duration-700", tone.text)}
            />
          </svg>
          <span className={cn("relative font-display text-[14px] font-semibold", tone.text)}>
            {Math.round(score)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold tracking-tight text-[var(--fg)] group-hover:text-[var(--accent-400)]">
            {run.campaign?.slogan ?? "Untitled campaign"}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-[var(--fg-subtle)]">
            <span className="font-mono">{timeAgo(run.createdAt)}</span>
            <span>·</span>
            <span className="capitalize">{run.status}</span>
            {run.memes && (
              <>
                <span>·</span>
                <span>{run.memes.length} memes</span>
              </>
            )}
          </p>
        </div>

        {run.scores && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={level === "high" ? "danger" : level === "medium" ? "warning" : "success"}
            >
              Backfire {Math.round(run.scores.backfireScore)}
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Meme {Math.round(run.scores.memeability)}
            </Badge>
          </div>
        )}

        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-[var(--fg-subtle)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]"
          aria-hidden
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>
      <Button
        variant="danger"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        disabled={deleting}
      >
        {deleting ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}

export default function HistoryPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns?list=true")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Failed to load history (${res.status})`);
          return;
        }
        setRuns(data.runs ?? []);
      })
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return runs;
    const q = query.toLowerCase();
    return runs.filter((r) =>
      (r.campaign?.slogan ?? "").toLowerCase().includes(q)
    );
  }, [runs, query]);

  const stats = useMemo(() => {
    const total = runs.length;
    const avg =
      total > 0
        ? runs.reduce((sum, r) => sum + (r.scores?.backfireScore ?? 0), 0) / total
        : 0;
    const high = runs.filter((r) => (r.scores?.backfireScore ?? 0) >= 70).length;
    return { total, avg, high };
  }, [runs]);

  const handleDelete = async (runId: string) => {
    if (!confirm("Delete this simulation? This cannot be undone.")) {
      return;
    }
    setDeletingId(runId);
    setError("");
    try {
      const res = await fetch(`/api/campaigns/${runId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete simulation");
        return;
      }
      setRuns((prev) => prev.filter((r) => r.id !== runId));
    } catch {
      setError("Failed to delete simulation");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PageShell footer={false}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <PageHero
          eyebrow="Archive"
          title="Simulation history"
          description="Every run, every verdict, every meme — saved to your account."
        />
        <ButtonLink href="/" variant="primary">
          New simulation
        </ButtonLink>
      </div>

      {/* Stats strip */}
      {!loading && !error && runs.length > 0 && (
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total runs" value={stats.total.toString()} />
          <StatCard label="Average Backfire" value={Math.round(stats.avg).toString()} accent />
          <StatCard label="High-risk runs" value={stats.high.toString()} />
        </div>
      )}

      {/* Search */}
      {!loading && !error && runs.length > 0 && (
        <div className="mb-6">
          <Input
            placeholder="Search campaigns…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer h-[88px] rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-5 py-4 text-[var(--danger)]">
          {error}
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] py-20 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,var(--aurora-1),transparent_70%)]"
          />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 3h18v18H3z" />
                <path d="M21 9H3" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <p className="font-display text-[18px] text-[var(--fg)]">No simulations yet</p>
            <p className="mt-1.5 text-sm text-[var(--fg-muted)]">
              Run your first campaign and it will appear here.
            </p>
            <ButtonLink href="/" variant="primary" className="mt-6">
              Run your first simulation
            </ButtonLink>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((run) => (
          <RunRow
            key={run.id}
            run={run}
            onDelete={() => handleDelete(run.id)}
            deleting={deletingId === run.id}
          />
        ))}
        {!loading && !error && filtered.length === 0 && runs.length > 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] py-10 text-center text-sm text-[var(--fg-muted)]">
            No campaigns match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </PageShell>
  );
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5">
      <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-display text-3xl font-semibold tracking-tight",
          accent ? "text-gradient-accent" : "text-[var(--fg)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
