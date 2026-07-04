"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { SectionHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { riskLevel } from "@/lib/scoring";
import { loadBranches } from "@/lib/branches/client";
import {
  FAILURE_TONE,
  LiveDocument,
  PreMortemDocument,
} from "@/components/premortem-document";
import type { SimulationRun } from "@/lib/agents/types";
import type { FailureType, PreMortemReport } from "@/lib/premortem/types";

/**
 * A campaign version the report can be written against: either the original copy
 * or a Counterfactual Branching variant. The original always sorts first.
 */
type SloganVariant = { id: string; label: string; slogan: string };
const ORIGINAL_VARIANT_ID = "__original__";

/** Clamp a string to `max` chars with an ellipsis — for the compact picker. */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/* ──────────────────────────────────────────────────────────────────
   Pre-Mortem Generator — pick a completed run, then generate the
   forward-dated post-mortem its worst plausible outcome would force the
   brand to publish six months later. The document streams in over SSE,
   then persists as an iteration. Patterned on boardroom-mode.tsx but
   single-document rather than a multi-agent debate.
   ────────────────────────────────────────────────────────────────── */

type LiveMeta = {
  failureType: FailureType;
  failureLabel: string;
  publishDate: string;
  topCriticName: string;
  worstSeverity: number;
  backfireScore: number;
};

/* ── Run picker ───────────────────────────────────────────────────── */

function RunPicker({
  runs,
  selectedId,
  onChange,
  emptyMessage,
}: {
  runs: SimulationRun[];
  selectedId: string;
  onChange: (id: string) => void;
  emptyMessage?: string;
}) {
  const completed = runs.filter((r) => r.status === "complete");
  return (
    <div className="space-y-2">
      <Select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        fieldSize="lg"
        className="max-w-lg"
      >
        <option value="">Select a campaign…</option>
        {completed.map((run) => (
          <option key={run.id} value={run.id}>
            {run.campaign?.slogan ?? run.id.slice(0, 8)} —{" "}
            {new Date(run.createdAt).toLocaleDateString()}
          </option>
        ))}
      </Select>
      {emptyMessage && (
        <p className="text-[13px] text-[var(--fg-muted)]">{emptyMessage}</p>
      )}
    </div>
  );
}

/* ── Slogan-version picker ────────────────────────────────────────────
   Lets the report be written against any slogan version forked in
   Counterfactual Branching, not just the campaign's original copy. Only shown
   when ≥1 variant exists.
   ────────────────────────────────────────────────────────────────── */

function SloganVariantPicker({
  variants,
  selectedId,
  onChange,
  disabled,
}: {
  variants: SloganVariant[];
  selectedId: string;
  onChange: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        Campaign version
      </label>
      <Select
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        title="Write the pre-mortem for the original slogan or any counterfactual variant"
        fieldSize="lg"
        className="sm:max-w-xs"
      >
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.id === ORIGINAL_VARIANT_ID ? "Original" : `⎇ ${v.label}`} —{" "}
            {truncate(v.slogan, 40)}
          </option>
        ))}
      </Select>
    </div>
  );
}

/* ── Left pane: the campaign + the worst outcome being dramatized ──── */

function WorstOutcomePanel({
  run,
  debatedSlogan,
  variantLabel,
}: {
  run: SimulationRun;
  /** The slogan actually on trial — a counterfactual variant, when chosen. */
  debatedSlogan?: string;
  variantLabel?: string | null;
}) {
  const campaign = run.campaign;
  if (!campaign) return null;

  const slogan = debatedSlogan ?? campaign.slogan;
  const isVariant =
    Boolean(variantLabel) && slogan.trim() !== campaign.slogan.trim();

  const topVerdicts = [...(run.verdicts ?? [])]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 4);

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[image:var(--veil)] backdrop-blur-xl">
        {campaign.imageUrl && (
          <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--bg-elev-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={campaign.imageUrl}
              alt="Campaign creative"
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-5 p-4 sm:p-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
                The campaign
              </p>
              {isVariant && (
                <Badge variant="accent" title={`Counterfactual variant: ${variantLabel}`}>
                  ⎇ {variantLabel}
                </Badge>
              )}
            </div>
            <blockquote className="relative rounded-xl border border-[var(--border)] bg-[var(--fill-faint)] px-4 py-3">
              <span
                className="absolute left-0 top-0 h-full w-[3px] rounded-l-xl bg-[var(--border-strong)]"
                aria-hidden
              />
              <p className="font-display text-[15px] font-semibold leading-snug tracking-tight text-[var(--fg)] sm:text-[17px]">
                “{slogan}”
              </p>
              {isVariant && (
                <p className="mt-2 truncate font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  original: “{campaign.slogan}”
                </p>
              )}
            </blockquote>
          </div>

          {campaign.brief && (
            <BriefRow label="Brief">{campaign.brief}</BriefRow>
          )}
          {campaign.brandValues && (
            <BriefRow label="Brand values">{campaign.brandValues}</BriefRow>
          )}

          {run.scores && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Backfire Score
              </p>
              <p className="font-display text-[28px] font-semibold leading-none tracking-tight text-[var(--danger)]">
                {Math.round(run.scores.backfireScore)}
                <span className="ml-1 font-mono text-[12px] text-[var(--fg-subtle)]">
                  / 100
                </span>
              </p>
            </div>
          )}

          {topVerdicts.length > 0 && (
            <div className="border-t border-[var(--border)] pt-4">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Worst-case findings
              </p>
              <div className="space-y-2.5">
                {topVerdicts.map((v) => {
                  const level = riskLevel(v.severity);
                  const color =
                    level === "high"
                      ? "var(--danger)"
                      : level === "medium"
                        ? "var(--warning)"
                        : "var(--success)";
                  return (
                    <div key={v.agentId}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-[var(--fg-muted)]">
                          {v.agentName}
                        </span>
                        <span
                          className="font-mono text-[11px] font-medium"
                          style={{ color }}
                        >
                          {Math.round(v.severity)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--fill-hover)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, v.severity)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BriefRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
        {label}
      </p>
      <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
        {children}
      </p>
    </div>
  );
}

/* ── Iteration timeline ───────────────────────────────────────────── */

function IterationTimeline({
  iterations,
  currentId,
  generating,
  onSelect,
}: {
  iterations: PreMortemReport[];
  currentId: string | null;
  generating: boolean;
  onSelect: (r: PreMortemReport) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/40 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          Iterations
        </p>
        <Badge variant="outline">{iterations.length} saved</Badge>
      </div>
      <ul className="max-h-[min(420px,50vh)] divide-y divide-[var(--border)] overflow-y-auto sm:max-h-[420px]">
        {iterations.map((it) => {
          const tone = FAILURE_TONE[it.failureType];
          const active = it.id === currentId;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it)}
                disabled={generating}
                className={cn(
                  "flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                  active ? "bg-[var(--fill-hover)]" : "hover:bg-[var(--fill-soft)]"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
                      #{it.iteration}
                    </span>
                    <Badge variant={tone.badge} dot>
                      {tone.label}
                    </Badge>
                    {it.branchLabel && (
                      <span className="truncate font-mono text-[10px] uppercase tracking-wider text-[var(--accent-200)]">
                        ⎇ {it.branchLabel}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--fg-subtle)]">
                    {new Date(it.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="line-clamp-2 text-[13px] text-[var(--fg-muted)]">
                  {it.headline}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  severity {it.worstSeverity}/100
                  {it.source === "mock" ? " · heuristic" : ""}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

function PreMortemInner() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("runId") ?? "";

  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState(runIdParam);
  const [listError, setListError] = useState("");
  const [fullRun, setFullRun] = useState<SimulationRun | null>(null);

  const [markdown, setMarkdown] = useState("");
  const [liveMeta, setLiveMeta] = useState<LiveMeta | null>(null);
  const [report, setReport] = useState<PreMortemReport | null>(null);
  const [iterations, setIterations] = useState<PreMortemReport[]>([]);
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Slogan versions sourced from the campaign's Counterfactual Branching variants.
  const [variants, setVariants] = useState<SloganVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] =
    useState<string>(ORIGINAL_VARIANT_ID);

  const docEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeId = runIdParam || selectedRunId;

  // Reset the view when the selected campaign changes (adjust-state-during-render).
  const [loadedFor, setLoadedFor] = useState(activeId);
  if (activeId !== loadedFor) {
    setLoadedFor(activeId);
    setMarkdown("");
    setLiveMeta(null);
    setReport(null);
    setIterations([]);
    setFullRun(null);
    setError("");
    setStatus("");
    setVariants([]);
    setSelectedVariantId(ORIGINAL_VARIANT_ID);
  }

  // Load the list of campaigns.
  useEffect(() => {
    fetch("/api/campaigns?list=true")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setListError(data.error ?? `Failed to load campaigns (${res.status})`);
          return;
        }
        setRuns(data.runs ?? []);
      })
      .catch(() => setListError("Failed to load campaigns"));
  }, []);

  // When the selected campaign changes, load its saved pre-mortems + full run.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    fetch(`/api/premortem?runId=${activeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const saved = (data.iterations as PreMortemReport[] | undefined) ?? [];
        setIterations(saved);
        if (saved[0]) setReport(saved[0]);
      })
      .catch(() => {});
    fetch(`/api/campaigns?runId=${activeId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((run: SimulationRun | null) => {
        if (!cancelled && run && run.id === activeId) setFullRun(run);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const listRun = runs.find((r) => r.id === activeId);
  const selectedRun = fullRun && fullRun.id === activeId ? fullRun : listRun;
  const campaignId = selectedRun?.campaignId;
  const originalSlogan = selectedRun?.campaign?.slogan ?? "";

  // Load the campaign's branch slogans as selectable versions. The original copy
  // always leads; branch variants follow, de-duplicated by slogan (a fresh fork
  // is byte-identical to its parent, so it would otherwise list the same line twice).
  useEffect(() => {
    if (!campaignId || !originalSlogan) return;
    let cancelled = false;
    const original: SloganVariant = {
      id: ORIGINAL_VARIANT_ID,
      label: "Original",
      slogan: originalSlogan,
    };
    loadBranches(campaignId)
      .then((branches) => {
        if (cancelled) return;
        const seen = new Set([originalSlogan.trim()]);
        const list: SloganVariant[] = [original];
        for (const b of branches ?? []) {
          const slogan = b.slogan?.trim();
          if (!slogan || seen.has(slogan)) continue;
          seen.add(slogan);
          list.push({ id: b.id, label: b.label, slogan });
        }
        setVariants(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [campaignId, originalSlogan]);

  // Auto-scroll the document as it streams in.
  useEffect(() => {
    docEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [markdown, report]);

  // Clean up any in-flight stream on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(async () => {
    if (!activeId || generating) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGenerating(true);
    setError("");
    setMarkdown("");
    setLiveMeta(null);
    setReport(null);
    setStatus("Reconstructing the worst outcome…");

    // Write the report for the chosen slogan version. The original needs no
    // override; a variant rides along as a slogan + branch provenance.
    const variant = variants.find((v) => v.id === selectedVariantId);
    const payload =
      variant && variant.id !== ORIGINAL_VARIANT_ID
        ? {
            runId: activeId,
            slogan: variant.slogan,
            branchId: variant.id,
            branchLabel: variant.label,
          }
        : { runId: activeId };

    try {
      const res = await fetch("/api/premortem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate pre-mortem");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const lines = part.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim());

          if (event === "premortem_start") {
            setLiveMeta(data as LiveMeta);
            setStatus("Drafting the post-mortem…");
          } else if (event === "token") {
            setMarkdown((prev) => prev + (data as { token: string }).token);
          } else if (event === "complete") {
            const r = data as PreMortemReport;
            setReport(r);
            setMarkdown("");
            setIterations((prev) => [r, ...prev.filter((it) => it.id !== r.id)]);
          } else if (event === "error") {
            setError((data as { message: string }).message);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Pre-mortem failed");
      }
    } finally {
      setGenerating(false);
      setStatus("");
    }
  }, [activeId, generating, variants, selectedVariantId]);

  const viewIteration = useCallback((r: PreMortemReport) => {
    abortRef.current?.abort();
    setGenerating(false);
    setMarkdown("");
    setStatus("");
    setReport(r);
  }, []);

  const hasOutput = report !== null || markdown.length > 0 || generating;

  // The slogan actually on trial in the current view: a finished report's slogan,
  // or — during a fresh run — the version picked from Counterfactual Branching.
  const liveVariant =
    selectedVariantId !== ORIGINAL_VARIANT_ID
      ? variants.find((v) => v.id === selectedVariantId)
      : undefined;
  const debatedSlogan = report?.campaignSlogan ?? liveVariant?.slogan;
  const variantLabel = report
    ? report.branchLabel ?? null
    : liveVariant?.label ?? null;

  return (
    <PageShell footer={false} wide>
      <SectionHeader
        eyebrow={t(locale, "postMortem")}
        title="The post-mortem you'd be forced to publish"
        description="Pick a completed simulation. Backfire takes its worst plausible outcome — the harshest red-team verdict, the backfire risk, the cultural tripwires — and writes the incident report and public apology your brand would publish six months from now. Confront the blind spot before it costs you."
        className="mb-6 sm:mb-8"
      />

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 w-full flex-1">
          <RunPicker
            runs={runs}
            selectedId={activeId}
            onChange={setSelectedRunId}
            emptyMessage={
              listError
                ? listError
                : runs.length > 0 && runs.every((r) => r.status !== "complete")
                  ? "No completed campaigns yet — finish a simulation from the home page first."
                  : runs.length === 0 && !listError
                    ? "No campaigns yet — run a simulation from the home page."
                    : undefined
            }
          />
        </div>
        {activeId && variants.length > 1 && (
          <SloganVariantPicker
            variants={variants}
            selectedId={selectedVariantId}
            onChange={setSelectedVariantId}
            disabled={generating}
          />
        )}
        {activeId && (
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={generate}
            disabled={generating}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {status || "Generating…"}
              </span>
            ) : selectedVariantId !== ORIGINAL_VARIANT_ID ? (
              "Write this version's pre-mortem"
            ) : iterations.length > 0 ? (
              "Re-generate pre-mortem"
            ) : (
              "Generate pre-mortem"
            )}
          </Button>
        )}
      </div>

      {!activeId && (
        <div className="card-glow rounded-2xl border border-[var(--border)] px-6 py-12 text-center">
          <p className="text-[15px] text-[var(--fg-muted)]">
            Select a completed campaign to generate its pre-mortem.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/" variant="primary" size="md">
              {t(locale, "newSimulation")}
            </ButtonLink>
            <ButtonLink href="/history" variant="secondary" size="md">
              {t(locale, "history")}
            </ButtonLink>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex gap-3 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {activeId && selectedRun?.campaign && (hasOutput || iterations.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)_20rem]">
          {/* Left: the campaign + the worst outcome being dramatized. */}
          <aside className="order-2 min-w-0 lg:order-none">
            <WorstOutcomePanel
              run={selectedRun}
              debatedSlogan={debatedSlogan}
              variantLabel={variantLabel}
            />
          </aside>

          {/* Center: the streaming / final document. */}
          <div className="order-1 min-w-0 lg:order-none">
            {report && !generating ? (
              <PreMortemDocument report={report} />
            ) : liveMeta ? (
              <LiveDocument
                markdown={markdown}
                failureType={liveMeta.failureType}
                publishDate={liveMeta.publishDate}
              />
            ) : generating ? (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-[var(--border)] bg-[var(--bg-elev-1)]/30 px-6 py-16 text-center">
                <svg
                  className="h-5 w-5 animate-spin text-[var(--accent)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle
                    className="opacity-20"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <p className="max-w-xs text-[13px] text-[var(--fg-muted)]">
                  {status || "Reconstructing the worst outcome…"}
                </p>
              </div>
            ) : null}
            <div ref={docEndRef} />
          </div>

          {/* Right: browsable history of every generated iteration. */}
          {iterations.length > 0 && (
            <aside className="order-3 min-w-0 lg:col-span-2 lg:order-none xl:col-span-1 xl:sticky xl:top-24 xl:self-start">
              <IterationTimeline
                iterations={iterations}
                currentId={report?.id ?? null}
                generating={generating}
                onSelect={viewIteration}
              />
            </aside>
          )}
        </div>
      )}
    </PageShell>
  );
}

export function PreMortemGenerator() {
  return (
    <Suspense
      fallback={
        <PageShell footer={false} wide>
          <div className="shimmer h-40 rounded-2xl" />
        </PageShell>
      }
    >
      <PreMortemInner />
    </Suspense>
  );
}
