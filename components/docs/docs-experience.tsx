"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LogoBadge } from "@/components/logo";
import {
  SECTIONS,
  PITCH_SECTIONS,
  TECHNICAL_SECTIONS,
  ARCHITECTURE_COLUMNS,
  DATAFLOW_STAGES,
  MERMAID_ARCHITECTURE,
  MERMAID_DATAFLOW,
  type DocSection,
} from "@/lib/docs/content";
import { docsToMarkdown } from "@/lib/docs/markdown";
import type { DocsConfig, LiveStats } from "@/lib/docs/types";
import { cn } from "@/lib/utils";
import { BlockRenderer } from "./blocks";
import { TeamGrid } from "./team-grid";
import { FeatureMatrix } from "./feature-matrix";
import { FlowDiagram } from "./flow-diagram";

export function DocsExperience({
  config,
  initialStats,
  isAdmin,
  preview,
}: {
  config: DocsConfig;
  initialStats: LiveStats;
  isAdmin: boolean;
  preview: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string>(SECTIONS[0]?.id ?? "");
  const [stats, setStats] = useState<LiveStats>(initialStats);
  const [statsLoading, setStatsLoading] = useState(false);
  const [shared, setShared] = useState(false);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/docs/live", { cache: "no-store" });
      if (res.ok) setStats(((await res.json()) as { stats: LiveStats }).stats);
    } catch {
      /* keep last good */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Scroll spy — highlight the section nearest the top of the viewport.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false)
    );
  }, [query]);

  const visibleIds = useMemo(() => new Set(filtered.map((s) => s.id)), [filtered]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }

  function exportMarkdown() {
    const md = docsToMarkdown(config, stats);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backfire-os-docs.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin + "/docs" : "/docs";
    try {
      if (navigator.share) {
        await navigator.share({ title: `${config.teamName} — Documentation`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="docs-root min-h-screen">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <header className="no-print sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <LogoBadge size="sm" glow={false} />
            <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--fg)]">
              Docs
            </span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success-soft)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[var(--success)] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] pulse-dot" />
            Live
          </span>

          <div className="relative ml-auto hidden sm:block">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search docs…"
              className="h-9 w-44 rounded-lg border border-[var(--border-strong)] bg-white/[0.03] pl-8 pr-3 text-[13px] text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)]/50 lg:w-56"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <ToolbarButton onClick={() => window.print()} title="Export as PDF (print)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span className="hidden md:inline">PDF</span>
            </ToolbarButton>
            <ToolbarButton onClick={exportMarkdown} title="Export as Markdown">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="hidden md:inline">Markdown</span>
            </ToolbarButton>
            <ToolbarButton onClick={share} title="Copy shareable link">
              {shared ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
              )}
              <span className="hidden md:inline">{shared ? "Copied" : "Share"}</span>
            </ToolbarButton>
            {isAdmin && (
              <Link
                href="/docs/admin"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] px-3 text-[13px] font-medium text-[var(--accent-400)] no-underline transition-colors hover:bg-[var(--accent)]/15"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.2.61.78 1.05 1.43 1.05H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {preview && (
        <div className="no-print border-b border-[var(--warning)]/20 bg-[var(--warning-soft)]">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-2 text-[12.5px] text-[var(--warning)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Preview mode — this page is not currently public.
            {isAdmin && (
              <Link href="/docs/admin" className="ml-1 font-medium underline">
                Manage visibility →
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="docs-layout mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[230px_1fr]">
        {/* ── Sidebar nav ──────────────────────────────────────── */}
        <aside className="no-print hidden lg:block">
          <div className="sticky top-[76px] max-h-[calc(100vh-100px)] space-y-5 overflow-y-auto pr-2">
            <NavGroup
              label="Pitch deck"
              sections={PITCH_SECTIONS}
              activeId={activeId}
              visibleIds={visibleIds}
              onJump={jumpTo}
            />
            <NavGroup
              label="Technical"
              sections={TECHNICAL_SECTIONS}
              activeId={activeId}
              visibleIds={visibleIds}
              onJump={jumpTo}
            />
          </div>
        </aside>

        {/* ── Content ──────────────────────────────────────────── */}
        <main className="docs-content min-w-0">
          <DocsHero config={config} stats={stats} onRefresh={refreshStats} loading={statsLoading} />

          {/* Mobile section jump */}
          <div className="no-print mt-6 lg:hidden">
            <select
              value={activeId}
              onChange={(e) => jumpTo(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elev-1)] px-3 text-[14px] text-[var(--fg)] outline-none"
            >
              <optgroup label="Pitch deck">
                {PITCH_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </optgroup>
              <optgroup label="Technical">
                {TECHNICAL_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="mt-12 space-y-16">
            {SECTIONS.map((section) => (
              <SectionView
                key={section.id}
                section={section}
                hidden={!visibleIds.has(section.id)}
                config={config}
                stats={stats}
                onRefresh={refreshStats}
                loading={statsLoading}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-[14px] text-[var(--fg-subtle)]">
                No sections match “{query}”.
              </p>
            )}
          </div>

          <footer className="mt-20 border-t border-[var(--border)] pt-6 text-[12px] text-[var(--fg-subtle)]">
            <p>
              © {new Date().getFullYear()} {config.teamName} · Live documentation.
              {config.updatedAt && (
                <> Last updated {new Date(config.updatedAt).toLocaleString()}.</>
              )}
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-white/[0.03] px-3 text-[13px] font-medium text-[var(--fg-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--fg)]"
    >
      {children}
    </button>
  );
}

function NavGroup({
  label,
  sections,
  activeId,
  visibleIds,
  onJump,
}: {
  label: string;
  sections: DocSection[];
  activeId: string;
  visibleIds: Set<string>;
  onJump: (id: string) => void;
}) {
  const shown = sections.filter((s) => visibleIds.has(s.id));
  if (!shown.length) return null;
  return (
    <div>
      <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {label}
      </p>
      <ul className="space-y-0.5">
        {shown.map((s) => {
          const active = activeId === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onJump(s.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-400)]"
                    : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
                )}
              >
                <span
                  className={cn(
                    "h-1 w-1 shrink-0 rounded-full transition-colors",
                    active ? "bg-[var(--accent)]" : "bg-[var(--fg-faint)]"
                  )}
                />
                {s.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DocsHero({
  config,
  stats,
  onRefresh,
  loading,
}: {
  config: DocsConfig;
  stats: LiveStats;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-7 md:p-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,77,87,0.16),transparent_70%)]" />
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
      <div className="relative">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
          <span className="h-px w-7 bg-[var(--accent)]/60" />
          {config.teamName} · Live Documentation
        </span>
        <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-[1.08] tracking-tight text-[var(--fg)] md:text-5xl">
          Pitch deck & technical whitepaper — synced with the live system
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-[var(--fg-muted)]">
          Understand the product in 2 minutes, evaluate the system in 10. Every figure
          below is pulled from the running application, not a slide.
        </p>
      </div>
    </section>
  );
}

function SectionView({
  section,
  hidden,
  config,
  stats,
  onRefresh,
  loading,
}: {
  section: DocSection;
  hidden: boolean;
  config: DocsConfig;
  stats: LiveStats;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <section
      id={section.id}
      className={cn("scroll-mt-24", hidden && "hidden")}
      aria-hidden={hidden}
    >
      <p className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
        <span className="h-px w-6 bg-[var(--accent)]/60" />
        {section.eyebrow}
      </p>
      <h2 className="font-display text-2xl font-semibold tracking-tight text-[var(--fg)] md:text-3xl">
        {section.title}
      </h2>
      {section.description && (
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
          {section.description}
        </p>
      )}

      <div className="mt-6 space-y-5">
        {section.blocks.map((b, i) => (
          <BlockRenderer key={i} block={b} />
        ))}

        {section.special === "team" && (
          <TeamGrid team={config.team} teamName={config.teamName} />
        )}
        {section.special === "contributors" && (
          <TeamGrid team={config.team} compact />
        )}
        {section.special === "feature-matrix" && <FeatureMatrix />}
        {section.special === "diagram-architecture" && (
          <FlowDiagram columns={ARCHITECTURE_COLUMNS} mermaid={MERMAID_ARCHITECTURE} />
        )}
        {section.special === "diagram-dataflow" && (
          <FlowDiagram columns={DATAFLOW_STAGES} mermaid={MERMAID_DATAFLOW} />
        )}
      </div>
    </section>
  );
}
