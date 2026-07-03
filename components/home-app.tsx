"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UploadForm } from "@/components/upload-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PendingButtonLink } from "@/components/ui/pending-link";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import type { SimulationRun } from "@/lib/agents/types";

const MODES = [
  {
    href: "/heatmap",
    title: "Cultural Heat Map",
    desc: "City-by-city severity across Bangladesh.",
    status: "live" as const,
    icon: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.95 8 11.7z" />
      </>
    ),
  },
  {
    href: "/branches",
    title: "Counterfactual Branching",
    desc: "Fork campaigns and watch scores shift.",
    status: "live" as const,
    icon: (
      <>
        <circle cx="6" cy="3" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M6 5.5v10" />
        <path d="M18 9c0 3-4 4-12 4" />
      </>
    ),
  },
  {
    href: "/boardroom",
    title: "Boardroom Mode",
    desc: "Synthetic personas debate your campaign live.",
    status: "live" as const,
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    href: "/post-mortem",
    title: "Regulatory Pre-Mortem",
    desc: "Draft the apology your brand would publish later.",
    status: "preview" as const,
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </>
    ),
  },
] as const;

function RecentRunsStrip() {
  const [runs, setRuns] = useState<SimulationRun[]>([]);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((res) => res.json())
      .then((data) => {
        const list = (data.runs ?? data ?? []) as SimulationRun[];
        setRuns(Array.isArray(list) ? list.slice(0, 3) : []);
      })
      .catch(() => setRuns([]));
  }, []);

  if (runs.length === 0) return null;

  return (
    <section className="mb-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-section-heading text-[var(--fg)]">Recent Runs</h2>
        <PendingButtonLink href="/history" variant="ghost" size="sm">
          View all →
        </PendingButtonLink>
      </div>
      <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-2 md:-mx-8 md:px-8">
        {runs.map((run, i) => {
          const score = run.scores?.backfireScore ?? 0;

          return (
            <RevealOnScroll key={run.id} index={i}>
              <Link
                href={`/runs/${run.id}`}
                className="flex w-[min(100%,280px)] shrink-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 no-underline transition-colors hover:border-[var(--border-strong)]"
              >
                <p className="truncate text-card-title text-[var(--fg)]">
                  {run.campaign?.slogan ?? "Untitled run"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[var(--text-lg)] font-medium tabular-nums text-[var(--fg)]">
                    {Math.round(score)}
                  </span>
                  <span className="font-mono text-[var(--text-xs)] text-[var(--fg-subtle)]">
                    Backfire Score
                  </span>
                </div>
              </Link>
            </RevealOnScroll>
          );
        })}
      </div>
    </section>
  );
}

export function HomeApp({ liveAi }: { liveAi: boolean }) {
  return (
    <>
      <section className="flex min-h-[100dvh] flex-col justify-center pb-16 pt-4 md:pb-20">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_420px] lg:gap-12">
          <div>
            <h1 className="text-page-title text-[var(--fg)] md:text-[var(--text-3xl)] lg:text-[clamp(2.25rem,5vw,3.5rem)]">
              <span className="text-gradient">Backfire OS</span>
            </h1>
            <p className="mt-4 max-w-lg text-[var(--text-lg)] text-[var(--fg-muted)]">
              Penetration testing for marketing campaigns — before the internet does.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Badge variant={liveAi ? "live" : "demo"} dot>
                {liveAi ? "Live AI · Gemini" : "Demo Mode"}
              </Badge>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="#simulate" variant="primary" size="lg">
                Run Simulation
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </ButtonLink>
              <PendingButtonLink href="/history" variant="secondary" size="lg">
                View past runs
              </PendingButtonLink>
            </div>
          </div>

          <div id="simulate" className="lg:sticky lg:top-24 lg:self-start">
            <UploadForm liveAi={liveAi} />
          </div>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="mb-8 text-section-heading text-[var(--fg)]">Modes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m, i) => (
            <RevealOnScroll key={m.href} index={i}>
              <Link
                href={m.href}
                className="group flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-sm)] no-underline transition-colors hover:border-[var(--border-strong)] card-glow"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-elevated)] text-[var(--accent)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    {m.icon}
                  </svg>
                </div>
                <h3 className="text-card-title text-[var(--fg)]">{m.title}</h3>
                <p className="mt-1.5 line-clamp-1 text-[var(--text-base)] text-[var(--fg-muted)]">
                  {m.desc}
                </p>
                <div className="mt-4">
                  {m.status === "live" ? (
                    <Badge variant="accent" dot>
                      Live
                    </Badge>
                  ) : (
                    <Badge variant="outline">In preview</Badge>
                  )}
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <RecentRunsStrip />
    </>
  );
}
