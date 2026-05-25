"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import type { SimulationRun } from "@/lib/agents/types";

export default function HistoryPage() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Simulation History</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your saved runs and generated memes.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            New simulation
          </Link>
        </div>

        {loading && <p className="text-zinc-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && runs.length === 0 && (
          <p className="text-zinc-400">No simulations yet. Run your first one from the home page.</p>
        )}

        <div className="space-y-3">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/runs/${run.id}`}
              className="block rounded-xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-red-500/40 hover:bg-zinc-900"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {run.campaign?.slogan ?? "Untitled campaign"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {new Date(run.createdAt).toLocaleString()} · {run.status}
                  </p>
                </div>
                {run.scores && (
                  <div className="flex gap-3 text-xs text-zinc-400">
                    <span>Backfire: {Math.round(run.scores.backfireScore)}</span>
                    <span>Memeability: {Math.round(run.scores.memeability)}</span>
                    <span>{run.memes?.length ?? 0} memes</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
