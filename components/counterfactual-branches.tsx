"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { scoreBranch } from "@/lib/branches/heuristic";
import { branchContentKey } from "@/lib/branches/types";
import { seedBranches } from "@/lib/branches/seed";
import {
  apiAppendEvent,
  apiCreateBranch,
  apiDeleteBranch,
  apiPatchBranch,
  listCampaigns,
  loadBranches,
  loadEvents,
  type CampaignOption,
} from "@/lib/branches/client";
import type {
  Branch,
  BranchEvent,
  BranchEventType,
  BranchScores as Scores,
  BranchScoreResponse,
  Lang,
  PersistedAi,
  ScoreSource,
  Tone,
  TopCritic,
} from "@/lib/branches/types";

/* ──────────────────────────────────────────────────────────────────
   Counterfactual Branching — "Git for campaigns"
   Tweak any element of a branch and watch the Resonance and Backfire
   scores propagate in real time across a visual tree of campaign
   variants. The instant estimate is a deterministic heuristic
   (lib/branches/heuristic); the authoritative score comes from the AI
   red-team panel via POST /api/branch-score, with content-hash caching
   so an unedited fork — or reverted copy — never pays for a second call.
   ────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────
   AI scoring — per-branch authoritative verdict from the war room
   ────────────────────────────────────────────────────────────────── */

/** What we keep client-side for each branch that has been AI-scored. */
type AiState = {
  status: "idle" | "loading" | "done" | "error";
  scores?: Scores;
  source?: ScoreSource;
  topCritic?: TopCritic | null;
  cached?: boolean;
  /**
   * The content key (see branchContentKey) the stored verdict belongs to. When
   * the branch's live content key drifts from this, the AI verdict is stale and
   * the UI offers a re-run (or auto-rescores when that mode is on).
   */
  contentKey?: string;
  error?: string;
};

/** Human-readable names for the editable fields, used in "edit" commit messages. */
const FIELD_LABELS: Record<string, string> = {
  slogan: "slogan",
  cast: "cast",
  tagline: "tagline",
  cta: "CTA",
  riskyLine: "risky line",
  tone: "tone",
  language: "language",
  label: "label",
  author: "author",
};

/**
 * Reconstructs commit history from tree data — used to seed the demo log and as
 * a fallback when a pre-existing campaign tree has no stored events yet. Only
 * the data-derivable commits (forks + AI scores) are produced here; live edits /
 * prunes / baselines accrue as real events once the user acts.
 */
function deriveEvents(
  items: {
    id: string;
    parentId: string | null;
    label: string;
    createdAt: number;
    ai?: PersistedAi | null;
  }[]
): BranchEvent[] {
  const labelById = new Map(items.map((b) => [b.id, b.label]));
  const out: BranchEvent[] = [];
  for (const b of items) {
    if (b.parentId) {
      out.push({
        id: `fork-${b.id}`,
        type: "fork",
        ts: b.createdAt,
        message: `${b.label} forked from ${labelById.get(b.parentId) ?? "parent"}`,
        branchId: b.id,
      });
    }
    if (b.ai && b.ai.source === "ai") {
      out.push({
        id: `score-${b.id}`,
        type: "score",
        ts: Date.parse(b.ai.scoredAt) || b.createdAt,
        message: `${b.label} scored by AI war room — backfire ${b.ai.scores.backfireScore}, resonance ${b.ai.scores.resonance}`,
        branchId: b.id,
      });
    }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, 100);
}

/* ──────────────────────────────────────────────────────────────────
   Seed tree — believable bKash-flavoured starter branches.
   Shared with the persistence layer (lib/branches/seed); used here as the
   local-only fallback when /api/branches is unavailable (logged out or no
   Supabase configured).
   ────────────────────────────────────────────────────────────────── */

const SEED: Branch[] = seedBranches();

/* ──────────────────────────────────────────────────────────────────
   Tree layout — top-down tidy tree. Generations cascade DOWN the canvas
   (root at the top, forks fanning out left/right beneath their parent) so
   even a near-linear lineage fills the full vertical height instead of
   stranding it as dead space. Row spacing stretches to fill a target
   height, then floors at MIN_V_GAP and lets deep trees scroll.
   ────────────────────────────────────────────────────────────────── */

type Pos = { x: number; y: number; depth: number };
const NODE_W = 204;
const NODE_H = 98;
const H_GAP = 244; // horizontal distance between adjacent leaf centers
const PAD_X = 96;
const PAD_TOP = 104;
const PAD_BOTTOM = 76;
const CANVAS_H = 620; // target fill height for the tree viewport
const MIN_V_GAP = 156; // floor on generation spacing before we scroll

function layoutTree(branches: Branch[]): {
  positions: Record<string, Pos>;
  width: number;
  height: number;
  maxDepth: number;
  vGap: number;
} {
  const byParent: Record<string, Branch[]> = {};
  for (const b of branches) {
    const p = b.parentId ?? "__root__";
    (byParent[p] ??= []).push(b);
  }
  for (const k of Object.keys(byParent)) {
    byParent[k].sort((a, b) => a.createdAt - b.createdAt);
  }

  // First pass: assign each node a (depth, column) in abstract grid units.
  // Leaves claim the next free column; parents center over their children.
  const grid: Record<string, { depth: number; col: number }> = {};
  let nextLeaf = 0;
  let maxDepth = 0;

  const visit = (id: string, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = byParent[id] ?? [];
    if (kids.length === 0) {
      const col = nextLeaf++;
      grid[id] = { depth, col };
      return col;
    }
    const cols = kids.map((c) => visit(c.id, depth + 1));
    const col = (Math.min(...cols) + Math.max(...cols)) / 2;
    grid[id] = { depth, col };
    return col;
  };

  const roots = branches.filter((b) => b.parentId === null);
  for (const r of roots) visit(r.id, 0);

  const leafCount = Math.max(1, nextLeaf);
  const vGap =
    maxDepth > 0
      ? Math.max(MIN_V_GAP, (CANVAS_H - PAD_TOP - PAD_BOTTOM) / maxDepth)
      : 0;

  // Second pass: project grid units to pixels.
  const positions: Record<string, Pos> = {};
  for (const id of Object.keys(grid)) {
    const g = grid[id];
    positions[id] = {
      x: PAD_X + NODE_W / 2 + g.col * H_GAP,
      y: maxDepth > 0 ? PAD_TOP + g.depth * vGap : CANVAS_H / 2,
      depth: g.depth,
    };
  }

  const width = PAD_X * 2 + NODE_W + (leafCount - 1) * H_GAP;
  const height =
    maxDepth > 0
      ? PAD_TOP + maxDepth * vGap + NODE_H / 2 + PAD_BOTTOM
      : CANVAS_H;
  return { positions, width, height, maxDepth, vGap };
}

/* ──────────────────────────────────────────────────────────────────
   Animated number ticker
   ────────────────────────────────────────────────────────────────── */

function useAnimatedNumber(value: number, duration = 380): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    fromRef.current = display;
    startRef.current = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}

function AnimatedNumber({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const d = useAnimatedNumber(value);
  return <>{d.toFixed(decimals)}</>;
}

/* ──────────────────────────────────────────────────────────────────
   Risk → tone mapping
   ────────────────────────────────────────────────────────────────── */

function riskTone(value: number): {
  label: string;
  color: string;
  soft: string;
} {
  if (value >= 70)
    return {
      label: "high",
      color: "var(--danger)",
      soft: "var(--danger-soft)",
    };
  if (value >= 45)
    return {
      label: "med",
      color: "var(--warning)",
      soft: "var(--warning-soft)",
    };
  return {
    label: "low",
    color: "var(--success)",
    soft: "var(--success-soft)",
  };
}

function resonanceTone(value: number): { color: string; soft: string } {
  if (value >= 70)
    return { color: "var(--success)", soft: "var(--success-soft)" };
  if (value >= 45)
    return { color: "var(--warning)", soft: "var(--warning-soft)" };
  return { color: "var(--danger)", soft: "var(--danger-soft)" };
}

/* ──────────────────────────────────────────────────────────────────
   Char-level diff (LCS-ish) — small enough for live editing
   ────────────────────────────────────────────────────────────────── */

type DiffOp = { type: "eq" | "add" | "del"; text: string };

function diffText(a: string, b: string): DiffOp[] {
  if (a === b) return [{ type: "eq", text: a }];
  const m = a.length;
  const n = b.length;
  if (m === 0) return [{ type: "add", text: b }];
  if (n === 0) return [{ type: "del", text: a }];
  // Bail out on long inputs to keep typing snappy.
  if (m * n > 60000) {
    return [
      { type: "del", text: a },
      { type: "add", text: b },
    ];
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const out: DiffOp[] = [];
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      out.push({ type: "eq", text: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      out.push({ type: "del", text: a[i - 1] });
      i--;
    } else {
      out.push({ type: "add", text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    out.push({ type: "del", text: a[--i] });
  }
  while (j > 0) {
    out.push({ type: "add", text: b[--j] });
  }
  out.reverse();
  // Coalesce runs of same type
  const merged: DiffOp[] = [];
  for (const op of out) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) last.text += op.text;
    else merged.push({ ...op });
  }
  return merged;
}

/* ──────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────── */

export function CounterfactualBranches() {
  const [branches, setBranches] = useState<Branch[]>(SEED);
  const [selectedId, setSelectedId] = useState<string>("fork-edge");
  // Commit history. Seeded from the demo tree; replaced by the campaign's real
  // events on load (see loadTree).
  const [log, setLog] = useState<BranchEvent[]>(() => deriveEvents(SEED));

  // Persisted score baselines for delta vs last commit (auto-refreshes on fork)
  const [baselines, setBaselines] = useState<Record<string, Scores>>(() => {
    const out: Record<string, Scores> = {};
    for (const b of SEED) out[b.id] = scoreBranch(b);
    return out;
  });

  // Score history for sparkline of selected branch
  const [history, setHistory] = useState<Record<string, number[]>>(() => {
    const out: Record<string, number[]> = {};
    for (const b of SEED) {
      const s = scoreBranch(b);
      out[b.id] = [s.backfireScore];
    }
    return out;
  });

  // Authoritative AI verdicts, keyed by branch id. Populated on demand.
  const [ai, setAi] = useState<Record<string, AiState>>({});
  // When on, editing an already-AI-scored branch re-runs the panel (debounced).
  const [autoAi, setAutoAi] = useState(false);

  // Persistence: true once the server tree has loaded and mutations should
  // sync. Stays false in local-only mode (logged out / no Supabase), where the
  // tree behaves exactly like the original client-only demo.
  const [persisted, setPersisted] = useState(false);
  // Which campaign's tree is shown. null = the standalone demo tree.
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  // Guards against out-of-order responses when the user switches trees quickly.
  const loadSeq = useRef(0);
  // Debounced field-save: coalesce keystrokes into one PATCH per branch.
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingPatch = useRef<Record<string, Partial<Branch>>>({});
  // In-flight create promises, so a debounced edit to a just-forked branch
  // waits for its POST to land before PATCHing (avoids a 404 race).
  const creating = useRef<Record<string, Promise<void> | undefined>>({});

  // Loads (and on first visit, seeds) a campaign's tree, replacing all derived
  // state. On failure for the demo tree we silently keep the local SEED — the
  // public demo never breaks.
  const loadTree = useCallback(async (cid: string | null) => {
    const seq = ++loadSeq.current;
    setTreeLoading(true);
    // Tree + commit history load together.
    const [stored, events] = await Promise.all([
      loadBranches(cid),
      loadEvents(cid),
    ]);
    if (seq !== loadSeq.current) return; // a newer load superseded this one
    setTreeLoading(false);

    if (!stored || stored.length === 0) {
      if (stored === null && cid === null) setPersisted(false); // local demo
      return;
    }

    const branchList: Branch[] = stored.map((s) => ({
      id: s.id,
      parentId: s.parentId,
      label: s.label,
      author: s.author,
      slogan: s.slogan,
      cast: s.cast,
      tagline: s.tagline,
      cta: s.cta,
      riskyLine: s.riskyLine,
      tone: s.tone,
      language: s.language,
      createdAt: s.createdAt,
    }));

    const base: Record<string, Scores> = {};
    const hist: Record<string, number[]> = {};
    const aiHydrated: Record<string, AiState> = {};
    for (const s of stored) {
      const score = scoreBranch(s);
      base[s.id] = score;
      hist[s.id] = [score.backfireScore];
      if (s.ai) {
        aiHydrated[s.id] = {
          status: "done",
          source: s.ai.source,
          scores: s.ai.scores,
          topCritic: s.ai.topCritic,
          contentKey: s.ai.contentKey,
          cached: true,
        };
      }
    }

    const root = branchList.find((b) => b.parentId === null) ?? branchList[0];
    setBranches(branchList);
    setBaselines(base);
    setHistory(hist);
    setAi(aiHydrated);
    // Real recorded events are authoritative; for a pre-existing tree with no
    // events yet, fall back to derived fork/score commits so it isn't blank.
    setLog(events.length > 0 ? events : deriveEvents(stored));
    setSelectedId(root.id);
    setCampaignId(cid);
    setPersisted(true);
  }, []);

  // On mount: fetch the campaign list for the picker, then load the initial
  // tree (deep-linkable via ?campaign=<id> or ?runId=<id> from run-aware nav).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      let initial = params.get("campaign");
      const runId = params.get("runId");

      // Header nav from /runs/[id] passes runId; trees are keyed by campaign.
      if (!initial && runId) {
        try {
          const res = await fetch(`/api/campaigns?runId=${encodeURIComponent(runId)}`);
          if (res.ok) {
            const run = (await res.json()) as { campaignId?: string };
            if (run.campaignId) {
              initial = run.campaignId;
              const url = new URL(window.location.href);
              url.searchParams.set("campaign", run.campaignId);
              window.history.replaceState(null, "", url.toString());
            }
          }
        } catch {
          /* fall through to demo tree */
        }
      }

      const list = await listCampaigns();
      if (cancelled) return;
      setCampaigns(list);
      await loadTree(initial || null);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTree]);

  // Switch the visible tree and reflect it in the URL for shareable deep links.
  const pickCampaign = useCallback(
    (cid: string | null) => {
      if (cid === campaignId) return;
      const url = new URL(window.location.href);
      if (cid) url.searchParams.set("campaign", cid);
      else url.searchParams.delete("campaign");
      window.history.replaceState(null, "", url.toString());
      void loadTree(cid);
    },
    [campaignId, loadTree]
  );

  // Append a commit to the history: optimistic local prepend + durable POST
  // (when persisted). Every mutation routes through here.
  const recordEvent = useCallback(
    (type: BranchEventType, message: string, branchId: string | null) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `ev-${Math.random().toString(36).slice(2)}`;
      const event: BranchEvent = { id, type, message, ts: Date.now(), branchId };
      setLog((l) => [event, ...l].slice(0, 100));
      if (persisted) {
        void apiAppendEvent({ id, campaignId, branchId, type, message, ts: event.ts });
      }
    },
    [persisted, campaignId]
  );

  const selected = useMemo(
    () => branches.find((b) => b.id === selectedId) ?? branches[0],
    [branches, selectedId]
  );
  const parent = useMemo<Branch | null>(
    () =>
      (selected?.parentId
        ? branches.find((b) => b.id === selected.parentId)
        : null) ?? null,
    [branches, selected]
  );

  const allScores = useMemo<Record<string, Scores>>(() => {
    const out: Record<string, Scores> = {};
    for (const b of branches) out[b.id] = scoreBranch(b);
    return out;
  }, [branches]);

  const selScores = allScores[selected.id];
  const parentScores = parent ? allScores[parent.id] : null;
  const baseline = baselines[selected.id];

  // Append backfireScore to history when it changes
  const lastBackfireRef = useRef<number>(selScores.backfireScore);
  useEffect(() => {
    const cur = allScores[selected.id]?.backfireScore;
    if (typeof cur !== "number") return;
    if (cur !== lastBackfireRef.current) {
      lastBackfireRef.current = cur;
      setHistory((h) => {
        const arr = (h[selected.id] ?? []).slice();
        arr.push(cur);
        if (arr.length > 32) arr.shift();
        return { ...h, [selected.id]: arr };
      });
    }
  }, [allScores, selected.id]);

  const { positions, width, height } = useMemo(() => layoutTree(branches), [branches]);

  // ─── AI war room ─────────────────────────────────────────────────
  // Fetch the authoritative red-team verdict for a branch snapshot. The server
  // memoizes by content hash, so re-scoring unchanged content is effectively
  // free; we still guard against firing a duplicate request for content that is
  // already in flight.
  const scoreWithAI = useCallback(async (branch: Branch) => {
    const key = branchContentKey(branch);
    let skip = false;
    setAi((prev) => {
      const cur = prev[branch.id];
      if (cur?.status === "loading" && cur.contentKey === key) {
        skip = true;
        return prev;
      }
      return {
        ...prev,
        [branch.id]: { ...cur, status: "loading", contentKey: key },
      };
    });
    if (skip) return;

    try {
      const res = await fetch("/api/branch-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as BranchScoreResponse;
      setAi((prev) => ({
        ...prev,
        [branch.id]: {
          status: "done",
          scores: data.scores,
          source: data.source,
          topCritic: data.topCritic,
          cached: data.cached,
          contentKey: key,
        },
      }));
      // Persist the verdict so a reload rehydrates it without replaying the panel.
      if (persisted) {
        void apiPatchBranch(branch.id, {
          ai: {
            source: data.source,
            scores: data.scores,
            topCritic: data.topCritic,
            contentKey: key,
            scoredAt: new Date().toISOString(),
          },
        });
      }
      const srcLabel =
        data.source === "ai"
          ? data.cached
            ? "AI war room (cached)"
            : "AI war room"
          : data.source === "mock"
          ? "engine fallback"
          : "heuristic (no model key)";
      recordEvent(
        "score",
        `${branch.label} scored by ${srcLabel} — backfire ${data.scores.backfireScore}, resonance ${data.scores.resonance}`,
        branch.id
      );
    } catch (e) {
      setAi((prev) => ({
        ...prev,
        [branch.id]: {
          ...prev[branch.id],
          status: "error",
          error: e instanceof Error ? e.message : "Scoring failed",
        },
      }));
    }
  }, [persisted, recordEvent]);

  // Auto-rescore: when enabled, edits to a branch that already carries an AI
  // verdict re-run the panel after a short idle window. Only the selected
  // branch is watched, so background variants never burn quota silently.
  const selKey = branchContentKey(selected);
  const selAi = ai[selected.id];
  useEffect(() => {
    if (!autoAi) return;
    if (!selAi || selAi.status === "loading") return;
    if (selAi.contentKey === selKey) return; // already fresh
    const t = setTimeout(() => {
      void scoreWithAI(selected);
    }, 1500);
    return () => clearTimeout(t);
    // selected is intentionally read at fire time; selKey captures its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAi, selKey, selAi?.status, selAi?.contentKey, selected.id]);

  // Debounced field edit: coalesce keystrokes into one "edit" commit + one PATCH.
  function schedulePatch(id: string, label: string, patch: Partial<Branch>) {
    pendingPatch.current[id] = { ...pendingPatch.current[id], ...patch };
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const queued = pendingPatch.current[id];
      delete pendingPatch.current[id];
      if (!queued) return;
      const fields = Object.keys(queued)
        .map((k) => FIELD_LABELS[k] ?? k)
        .filter(Boolean);
      if (fields.length) {
        recordEvent("edit", `${label} · edited ${fields.join(", ")}`, id);
      }
      if (persisted) {
        // If the branch is still being created, wait for that POST first.
        await creating.current[id];
        await apiPatchBranch(id, queued);
      }
    }, 700);
  }

  function patchSelected(patch: Partial<Branch>) {
    setBranches((bs) => bs.map((b) => (b.id === selected.id ? { ...b, ...patch } : b)));
    schedulePatch(selected.id, selected.label, patch);
  }

  function forkSelected() {
    const id =
      persisted && typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `fork-${Math.random().toString(36).slice(2, 8)}`;
    const sib = branches.filter((b) => b.parentId === selected.id).length;
    const parentLabel = selected.label.split(" ")[0].replace("v", "");
    const [maj, min] = parentLabel.split(".").map((n) => parseInt(n, 10));
    const label = `v${maj}.${(min || 0) + sib + 1} · ${
      ["variant", "remix", "spin", "shadow"][sib % 4]
    }`;
    const newBranch: Branch = {
      ...selected,
      id,
      parentId: selected.id,
      label,
      author: "You",
      createdAt: Date.now(),
    };
    const s = scoreBranch(newBranch);
    setBranches((bs) => [...bs, newBranch]);
    setBaselines((b) => ({ ...b, [id]: s }));
    setHistory((h) => ({ ...h, [id]: [s.backfireScore] }));
    // A fresh fork is byte-identical to its parent, so it shares the parent's
    // content key — inherit any AI verdict so the new node shows the real score
    // immediately, no extra model call. (The server cache would return the same
    // thing if asked.) Edits then mark it stale and trigger a re-score.
    const parentAi = ai[selected.id];
    if (parentAi?.status === "done" && parentAi.scores) {
      setAi((a) => ({ ...a, [id]: { ...parentAi, cached: true } }));
    }
    setSelectedId(id);
    recordEvent("fork", `${label} forked from ${selected.label}`, id);

    if (persisted) {
      const createPromise = apiCreateBranch({
        id,
        parentId: newBranch.parentId,
        campaignId,
        createdAt: newBranch.createdAt,
        label: newBranch.label,
        author: newBranch.author,
        slogan: newBranch.slogan,
        cast: newBranch.cast,
        tagline: newBranch.tagline,
        cta: newBranch.cta,
        riskyLine: newBranch.riskyLine,
        tone: newBranch.tone,
        language: newBranch.language,
      }).finally(() => {
        delete creating.current[id];
      });
      creating.current[id] = createPromise;
      // Persist the inherited parent verdict onto the new node too, so a reload
      // shows it without re-running the panel. Chain off the create so it can't
      // race ahead of the POST (which would 404).
      if (parentAi?.status === "done" && parentAi.scores && parentAi.source && parentAi.contentKey) {
        const inherited = {
          source: parentAi.source,
          scores: parentAi.scores,
          topCritic: parentAi.topCritic ?? null,
          contentKey: parentAi.contentKey,
          scoredAt: new Date().toISOString(),
        };
        void createPromise.then(() => apiPatchBranch(id, { ai: inherited }));
      }
    }
  }

  function resetToBaseline() {
    if (!baseline) return;
    recordEvent("baseline", `${selected.label} · baseline committed`, selected.id);
    setBaselines((b) => ({ ...b, [selected.id]: scoreBranch(selected) }));
  }

  function deleteSelected() {
    if (!selected.parentId) return; // cannot delete root
    const drop = new Set<string>([selected.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of branches) {
        if (b.parentId && drop.has(b.parentId) && !drop.has(b.id)) {
          drop.add(b.id);
          changed = true;
        }
      }
    }
    setBranches((bs) => bs.filter((b) => !drop.has(b.id)));
    setSelectedId(selected.parentId);
    recordEvent(
      "prune",
      `${selected.label} pruned (${drop.size} node${drop.size > 1 ? "s" : ""})`,
      selected.parentId
    );
    // Server cascades the subtree from the root id we delete.
    if (persisted) void apiDeleteBranch(selected.id);
  }

  // ─── render ────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <Header
        branches={branches}
        selected={selected}
        scores={selScores}
        parentScores={parentScores}
        baseline={baseline}
        persisted={persisted}
      />

      {campaigns.length > 0 && (
        <CampaignPicker
          campaigns={campaigns}
          campaignId={campaignId}
          loading={treeLoading}
          onPick={pickCampaign}
        />
      )}

      {/* Main split: tree + inspector */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
        <TreeCanvas
          branches={branches}
          positions={positions}
          width={width}
          height={height}
          selectedId={selected.id}
          allScores={allScores}
          ai={ai}
          onSelect={setSelectedId}
        />

        <Inspector
          branch={selected}
          parent={parent}
          scores={selScores}
          parentScores={parentScores}
          baseline={baseline}
          history={history[selected.id] ?? []}
          ai={selAi}
          aiStale={selAi?.status === "done" && selAi.contentKey !== selKey}
          autoAi={autoAi}
          onToggleAuto={() => setAutoAi((v) => !v)}
          onScoreAI={() => void scoreWithAI(selected)}
          onPatch={patchSelected}
          onFork={forkSelected}
          onReset={resetToBaseline}
          onDelete={deleteSelected}
        />
      </div>

      {/* Footer row */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.2fr]">
        <DiffPanel branch={selected} parent={parent} />
        <ActivityLog log={log} />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Header — live KPI tickers
   ────────────────────────────────────────────────────────────────── */

function Header({
  branches,
  selected,
  scores,
  parentScores,
  baseline,
  persisted,
}: {
  branches: Branch[];
  selected: Branch;
  scores: Scores;
  parentScores: Scores | null;
  baseline: Scores | undefined;
  persisted: boolean;
}) {
  const baseRef = baseline ?? scores;
  const deltaBackfire = scores.backfireScore - baseRef.backfireScore;
  const deltaResonance = scores.resonance - baseRef.resonance;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(255,77,87,0.18),transparent_70%)]"
      />
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />

      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="accent" dot>
              Live demo · counterfactual engine
            </Badge>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
              style={{
                borderColor: "var(--border)",
                color: persisted ? "var(--success)" : "var(--fg-subtle)",
              }}
              title={
                persisted
                  ? "Your tree is saved — forks, edits and verdicts persist across reloads"
                  : "Not signed in — changes live only in this session"
              }
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: persisted ? "var(--success)" : "var(--fg-subtle)",
                }}
              />
              {persisted ? "synced" : "local only"}
            </span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            Git for campaigns
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl lg:text-5xl">
            Counterfactual <span className="text-gradient-accent">Branching</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Tweak a slogan, swap the cast, drop a risky line. Watch{" "}
            <span className="text-[var(--fg)]">Resonance</span> and{" "}
            <span className="text-[var(--fg)]">Backfire</span> scores ripple
            across every variant in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <KpiTile
            label="Active branch"
            value={selected.label}
            sub={`by ${selected.author}`}
            mono
          />
          <KpiTile
            label="Total variants"
            value={String(branches.length)}
            sub={`${branches.filter((b) => b.author === "You").length} yours`}
          />
          <KpiBigNumber
            label="Backfire"
            value={scores.backfireScore}
            delta={deltaBackfire}
            invert
          />
          <KpiBigNumber
            label="Resonance"
            value={scores.resonance}
            delta={deltaResonance}
          />
          {parentScores && (
            <KpiTile
              label="vs parent"
              value={
                (scores.backfireScore - parentScores.backfireScore >= 0 ? "+" : "") +
                (scores.backfireScore - parentScores.backfireScore) +
                " bf"
              }
              sub={
                (scores.resonance - parentScores.resonance >= 0 ? "+" : "") +
                (scores.resonance - parentScores.resonance) +
                " res"
              }
              mono
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Campaign picker — choose which campaign's variant tree to branch
   ────────────────────────────────────────────────────────────────── */

function CampaignPicker({
  campaigns,
  campaignId,
  loading,
  onPick,
}: {
  campaigns: CampaignOption[];
  campaignId: string | null;
  loading: boolean;
  onPick: (id: string | null) => void;
}) {
  const active = campaigns.find((c) => c.campaignId === campaignId);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/50 px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        ⎇ tree for
      </span>
      <Select
          value={campaignId ?? ""}
          onChange={(e) => onPick(e.target.value || null)}
          fieldSize="sm"
          wrapperClassName="min-w-[200px]"
        >
          <option value="">Demo tree (bKash)</option>
          {campaigns.map((c) => (
            <option key={c.campaignId} value={c.campaignId}>
              {truncate(c.slogan, 48)}
              {c.backfireScore != null ? ` · bf ${c.backfireScore}` : ""}
            </option>
          ))}
        </Select>

      {campaignId === null ? (
        <Badge variant="default">standalone demo</Badge>
      ) : (
        <Badge variant="accent" dot>
          {active ? "real campaign" : "campaign"}
        </Badge>
      )}

      {active?.createdAt && (
        <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
          run {new Date(active.createdAt).toISOString().split("T")[0]}
        </span>
      )}

      {loading && (
        <span className="ml-auto inline-flex items-center gap-2 font-mono text-[11px] text-[var(--fg-subtle)]">
          <span className="inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-[var(--accent)]" />
          loading tree…
        </span>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  mono = false,
}: {
  label: string;
  value: string;
  sub: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-[140px] rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/70 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate font-semibold tracking-tight text-[var(--fg)]",
          mono ? "font-mono text-[13px]" : "text-[15px]"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-[var(--fg-subtle)]">{sub}</p>
    </div>
  );
}

function KpiBigNumber({
  label,
  value,
  delta,
  invert = false,
}: {
  label: string;
  value: number;
  delta: number;
  invert?: boolean;
}) {
  const tone = invert ? riskTone(value) : resonanceTone(value);
  const deltaSign = delta === 0 ? 0 : delta > 0 ? 1 : -1;
  const deltaIsBad = invert ? deltaSign > 0 : deltaSign < 0;
  const deltaColor =
    deltaSign === 0
      ? "var(--fg-subtle)"
      : deltaIsBad
      ? "var(--danger)"
      : "var(--success)";

  return (
    <div
      className="relative min-w-[150px] overflow-hidden rounded-2xl border px-4 py-3"
      style={{
        borderColor: "var(--border)",
        background: `linear-gradient(180deg, ${tone.soft}, transparent 80%)`,
      }}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="font-display text-3xl font-semibold tabular-nums tracking-tight"
          style={{ color: tone.color }}
        >
          <AnimatedNumber value={value} />
        </span>
        <span className="text-[12px] text-[var(--fg-subtle)]">/100</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[11px] font-mono">
        <span style={{ color: deltaColor }}>
          {deltaSign > 0 ? "▲" : deltaSign < 0 ? "▼" : "—"}{" "}
          {Math.abs(delta).toFixed(0)}
        </span>
        <span className="text-[var(--fg-subtle)]">since fork</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Tree canvas
   ────────────────────────────────────────────────────────────────── */

function TreeCanvas({
  branches,
  positions,
  width,
  height,
  selectedId,
  allScores,
  ai,
  onSelect,
}: {
  branches: Branch[];
  positions: Record<string, Pos>;
  width: number;
  height: number;
  selectedId: string;
  allScores: Record<string, Scores>;
  ai: Record<string, AiState>;
  onSelect: (id: string) => void;
}) {
  const h = Math.max(height, CANVAS_H);

  // Generation rails — one faint guide per depth, derived from node positions.
  const depthY = new Map<number, number>();
  for (const p of Object.values(positions)) {
    if (!depthY.has(p.depth)) depthY.set(p.depth, p.y);
  }
  const rails = Array.from(depthY.entries()).sort((a, b) => a[0] - b[0]);

  // Root anchor for the ambient spine that anchors the whole cascade.
  const root = branches.find((x) => !x.parentId) ?? branches[0];
  const rootPos = root ? positions[root.id] : undefined;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.006))] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-8%,rgba(255,77,87,0.16),transparent_72%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_15%_100%,rgba(120,140,255,0.07),transparent_70%)]"
      />
      <div className="bg-dot absolute inset-0 opacity-30" aria-hidden />

      <div className="relative flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            branch · tree
          </span>
          <Badge variant="accent" dot>
            live
          </Badge>
          <span className="hidden font-mono text-[10px] text-[var(--fg-subtle)] sm:inline">
            {branches.length} nodes · {rails.length} gen
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--fg-subtle)]">
          <Legend swatch="var(--success)" label="low risk" />
          <Legend swatch="var(--warning)" label="medium" />
          <Legend swatch="var(--danger)" label="high" />
        </div>
      </div>

      <div className="relative max-h-[680px] min-h-[560px] overflow-auto">
        <svg
          viewBox={`0 0 ${width} ${h}`}
          width={width}
          height={h}
          className="block"
          role="img"
          aria-label="Counterfactual branch tree"
        >
          <defs>
            <filter id="nodeGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="softBlur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <linearGradient id="cardFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.012)" />
            </linearGradient>
            <linearGradient id="spine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,77,87,0.55)" />
              <stop offset="100%" stopColor="rgba(255,77,87,0)" />
            </linearGradient>
            <radialGradient id="rootPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,77,87,0.5)" />
              <stop offset="100%" stopColor="rgba(255,77,87,0)" />
            </radialGradient>
          </defs>

          {/* Generation rails — horizontal guides + labels */}
          {rails.map(([depth, y]) => (
            <g key={`rail-${depth}`}>
              <line
                x1={28}
                y1={y}
                x2={width - 20}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
                strokeDasharray="2 8"
              />
              <text
                x={28}
                y={y - 12}
                fontSize={9}
                fontFamily="var(--font-mono), monospace"
                fill="var(--fg-subtle)"
                opacity={0.6}
                style={{ letterSpacing: "0.22em", textTransform: "uppercase" }}
              >
                {depth === 0 ? "gen 0 · root" : `gen ${depth}`}
              </text>
            </g>
          ))}

          {/* Ambient spine descending from the root */}
          {rootPos && (
            <line
              x1={rootPos.x}
              y1={rootPos.y}
              x2={rootPos.x}
              y2={h - PAD_BOTTOM / 2}
              stroke="url(#spine)"
              strokeWidth={2}
              opacity={0.4}
            />
          )}

          {/* Edges — vertical bezier, tinted by the child's risk */}
          {branches.map((b) => {
            if (!b.parentId) return null;
            const a = positions[b.parentId];
            const c = positions[b.id];
            if (!a || !c) return null;
            const x1 = a.x;
            const y1 = a.y + NODE_H / 2;
            const x2 = c.x;
            const y2 = c.y - NODE_H / 2;
            const my = (y1 + y2) / 2;
            const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
            const tone = riskTone(allScores[b.id].backfireScore);
            const onPath = b.id === selectedId || b.parentId === selectedId;
            return (
              <g key={`e-${b.id}`}>
                {/* soft colored underglow */}
                <path
                  d={d}
                  fill="none"
                  stroke={tone.color}
                  strokeWidth={onPath ? 7 : 5}
                  strokeLinecap="round"
                  opacity={onPath ? 0.28 : 0.12}
                  filter="url(#softBlur)"
                />
                {/* flowing dashed conduit */}
                <path
                  d={d}
                  fill="none"
                  stroke={tone.color}
                  strokeWidth={onPath ? 2.4 : 1.6}
                  strokeLinecap="round"
                  strokeDasharray="5 11"
                  opacity={onPath ? 1 : 0.7}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="32"
                    to="0"
                    dur={onPath ? "1s" : "1.8s"}
                    repeatCount="indefinite"
                  />
                </path>
                {onPath && (
                  <circle r={3.5} fill={tone.color} filter="url(#nodeGlow)">
                    <animateMotion dur="2s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {branches.map((b) => {
            const p = positions[b.id];
            if (!p) return null;
            const score = allScores[b.id];
            const tone = riskTone(score.backfireScore);
            const isSel = b.id === selectedId;
            const isRoot = !b.parentId;
            const av = ai[b.id];
            const aiScored = av?.status === "done" && av.source === "ai";
            const aiLoading = av?.status === "loading";
            return (
              <g
                key={b.id}
                className="bt-node"
                transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
                onClick={() => onSelect(b.id)}
              >
                {/* colored aura */}
                <rect
                  x={-8}
                  y={-8}
                  width={NODE_W + 16}
                  height={NODE_H + 16}
                  rx={18}
                  fill={tone.color}
                  opacity={isSel ? 0.22 : 0.1}
                  filter="url(#softBlur)"
                />
                {/* root pulse halo */}
                {isRoot && (
                  <circle cx={NODE_W / 2} cy={NODE_H / 2} r={NODE_H * 0.78} fill="url(#rootPulse)">
                    <animate
                      attributeName="opacity"
                      values="0.25;0.6;0.25"
                      dur="3.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* selected pulsing ring */}
                {isSel && (
                  <rect
                    x={-4}
                    y={-4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={15}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    opacity={0.6}
                    filter="url(#nodeGlow)"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.35;0.9;0.35"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                {/* card */}
                <rect
                  className="bt-card"
                  width={NODE_W}
                  height={NODE_H}
                  rx={13}
                  fill="var(--bg-elev-2)"
                  stroke={isSel ? "var(--accent)" : "rgba(255,255,255,0.12)"}
                  strokeWidth={isSel ? 1.5 : 1}
                />
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={13}
                  fill="url(#cardFill)"
                  pointerEvents="none"
                />
                {/* tone bar */}
                <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={tone.color}>
                  <animate
                    attributeName="opacity"
                    values="0.7;1;0.7"
                    dur="2.6s"
                    repeatCount="indefinite"
                  />
                </rect>
                <text
                  x={16}
                  y={22}
                  fontSize={10}
                  fontFamily="var(--font-mono), monospace"
                  fill="var(--fg-subtle)"
                  style={{ letterSpacing: "0.16em", textTransform: "uppercase" }}
                >
                  {truncate(b.label, 18)}
                </text>
                <text
                  x={16}
                  y={46}
                  fontSize={13}
                  fontFamily="var(--font-display), sans-serif"
                  fill="var(--fg)"
                  fontWeight={600}
                >
                  {truncate(b.slogan, 22)}
                </text>
                {/* mini bars */}
                <g transform={`translate(16, 64)`}>
                  <MiniBar
                    label="bf"
                    value={score.backfireScore}
                    color={riskTone(score.backfireScore).color}
                  />
                  <g transform="translate(86, 0)">
                    <MiniBar
                      label="res"
                      value={score.resonance}
                      color={resonanceTone(score.resonance).color}
                    />
                  </g>
                </g>
                {/* author chip — bottom right, smaller */}
                <text
                  x={NODE_W - 12}
                  y={NODE_H - 10}
                  fontSize={9}
                  textAnchor="end"
                  fontFamily="var(--font-mono), monospace"
                  fill="var(--fg-subtle)"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {b.author === "You" ? "● you" : truncate(b.author, 14)}
                </text>
                {/* AI verdict marker — top right */}
                {(aiScored || aiLoading) && (
                  <g transform={`translate(${NODE_W - 14}, 18)`}>
                    <circle
                      r={3}
                      fill={aiLoading ? "var(--warning)" : "var(--accent)"}
                    >
                      {aiLoading && (
                        <animate
                          attributeName="opacity"
                          values="0.3;1;0.3"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      )}
                    </circle>
                    <text
                      x={-7}
                      y={3}
                      fontSize={8}
                      textAnchor="end"
                      fontFamily="var(--font-mono), monospace"
                      fill={aiLoading ? "var(--warning)" : "var(--accent)"}
                      style={{ letterSpacing: "0.12em" }}
                    >
                      {aiLoading ? "…" : "AI"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          <style>{`
            .bt-node { cursor: pointer; }
            .bt-node .bt-card { transition: stroke 0.18s ease, filter 0.18s ease; }
            .bt-node:hover .bt-card { stroke: var(--accent); filter: brightness(1.12); }
          `}</style>
        </svg>
      </div>
    </div>
  );
}

function MiniBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const W = 56;
  return (
    <g>
      <text
        x={0}
        y={4}
        fontSize={9}
        fontFamily="var(--font-mono), monospace"
        fill="var(--fg-subtle)"
        style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}
      >
        {label}
      </text>
      <rect
        x={18}
        y={-4}
        width={W}
        height={6}
        rx={3}
        fill="rgba(255,255,255,0.06)"
      />
      <rect
        x={18}
        y={-4}
        width={(W * value) / 100}
        height={6}
        rx={3}
        fill={color}
      />
    </g>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: swatch }}
      />
      <span className="font-mono uppercase tracking-wider">{label}</span>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Inspector
   ────────────────────────────────────────────────────────────────── */

function Inspector({
  branch,
  parent,
  scores,
  parentScores,
  baseline,
  history,
  ai,
  aiStale,
  autoAi,
  onToggleAuto,
  onScoreAI,
  onPatch,
  onFork,
  onReset,
  onDelete,
}: {
  branch: Branch;
  parent: Branch | null;
  scores: Scores;
  parentScores: Scores | null;
  baseline: Scores | undefined;
  history: number[];
  ai: AiState | undefined;
  aiStale: boolean;
  autoAi: boolean;
  onToggleAuto: () => void;
  onScoreAI: () => void;
  onPatch: (p: Partial<Branch>) => void;
  onFork: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  // Promote the authoritative verdict into the headline grid, but only when it's
  // a real model verdict that still matches the current content. The moment the
  // branch is edited (stale) we fall back to the live estimate so the grid keeps
  // moving, and the war-room panel prompts a re-score.
  const aiPrimary =
    ai?.status === "done" && ai.source === "ai" && !aiStale ? ai.scores : undefined;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(255,77,87,0.14),transparent_70%)]"
      />

      <div className="relative flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            inspector
          </span>
          <Badge variant="default">{branch.label}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" onClick={onReset}>
            ↺ Commit baseline
          </Button>
          <Button
            size="xs"
            variant="danger"
            onClick={onDelete}
            disabled={!branch.parentId}
            title={branch.parentId ? "Prune branch" : "Cannot prune root"}
          >
            ⌫ Prune
          </Button>
          <Button size="xs" variant="primary" onClick={onFork}>
            ⎇ Fork
          </Button>
        </div>
      </div>

      <div className="relative space-y-5 p-5">
        {/* Score grid */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            {aiPrimary ? "scores · AI verdict" : "scores · live estimate"}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--fg-subtle)]">
            {aiPrimary
              ? "authoritative · est shown small"
              : "heuristic · run war room for AI"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <ScoreCell
            label="Backfire"
            value={scores.backfireScore}
            aiValue={aiPrimary?.backfireScore}
            base={baseline?.backfireScore}
            parent={parentScores?.backfireScore}
            invert
            spark={history}
          />
          <ScoreCell
            label="Resonance"
            value={scores.resonance}
            aiValue={aiPrimary?.resonance}
            base={baseline?.resonance}
            parent={parentScores?.resonance}
          />
          <ScoreCell
            label="Polarization"
            value={scores.polarization}
            aiValue={aiPrimary?.polarization}
            base={baseline?.polarization}
            parent={parentScores?.polarization}
            invert
          />
          <ScoreCell
            label="Memeability"
            value={scores.memeability}
            aiValue={aiPrimary?.memeability}
            base={baseline?.memeability}
            parent={parentScores?.memeability}
            invert
          />
          <ScoreCell
            label="Brand drift"
            value={scores.drift}
            aiValue={aiPrimary?.drift}
            base={baseline?.drift}
            parent={parentScores?.drift}
            invert
          />
          <ScoreCell
            label="Backfire risk"
            value={scores.backfireRisk}
            aiValue={aiPrimary?.backfireRisk}
            base={baseline?.backfireRisk}
            parent={parentScores?.backfireRisk}
            invert
          />
        </div>

        {/* AI war room — authoritative verdict from the red-team panel */}
        <AiVerdictPanel
          estimate={scores}
          ai={ai}
          stale={aiStale}
          autoAi={autoAi}
          onToggleAuto={onToggleAuto}
          onScoreAI={onScoreAI}
        />

        {/* Fields */}
        <div className="grid gap-3">
          <Field
            label="Slogan"
            value={branch.slogan}
            onChange={(v) => onPatch({ slogan: v })}
            placeholder="The headline"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Cast"
              value={branch.cast}
              onChange={(v) => onPatch({ cast: v })}
              placeholder="Family, celebrity, Gen-Z…"
            />
            <Field
              label="Tagline"
              value={branch.tagline}
              onChange={(v) => onPatch({ tagline: v })}
              placeholder="Supporting line"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label="Call-to-action"
              value={branch.cta}
              onChange={(v) => onPatch({ cta: v })}
              placeholder="Download · Sign up · Try"
            />
            <Field
              label="Risky line (optional)"
              value={branch.riskyLine}
              onChange={(v) => onPatch({ riskyLine: v })}
              placeholder="Drop a provocation to test"
              accent
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Tone"
              value={branch.tone}
              onChange={(v) => onPatch({ tone: v as Tone })}
              options={[
                { value: "playful", label: "Playful" },
                { value: "formal", label: "Formal" },
                { value: "warm", label: "Warm" },
                { value: "aggressive", label: "Aggressive" },
              ]}
            />
            <SelectField
              label="Language"
              value={branch.language}
              onChange={(v) => onPatch({ language: v as Lang })}
              options={[
                { value: "en", label: "English" },
                { value: "bn", label: "Bangla" },
                { value: "mixed", label: "Banglish (mixed)" },
              ]}
            />
          </div>
        </div>

        {parent && parentScores && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)]/60 px-4 py-3 text-[12px] text-[var(--fg-muted)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
              parent · {parent.label}
            </p>
            <p className="mt-1 line-clamp-1 text-[var(--fg)]">{parent.slogan}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   AI war room verdict — authoritative panel score + harshest critic
   ────────────────────────────────────────────────────────────────── */

const AI_METRICS = [
  { key: "backfireScore", label: "Backfire", invert: true },
  { key: "resonance", label: "Resonance", invert: false },
  { key: "polarization", label: "Polarization", invert: true },
  { key: "memeability", label: "Memeability", invert: false },
  { key: "drift", label: "Brand drift", invert: true },
  { key: "backfireRisk", label: "Backfire risk", invert: true },
] as const;

function aiSourceBadge(source: ScoreSource | undefined, cached: boolean | undefined) {
  if (source === "ai")
    return {
      label: cached ? "AI verdict · cached" : "AI verdict",
      color: "var(--accent)",
      soft: "var(--accent-soft)",
    };
  if (source === "mock")
    return {
      label: "engine fallback",
      color: "var(--warning)",
      soft: "var(--warning-soft)",
    };
  return {
    label: "heuristic · no model key",
    color: "var(--fg-subtle)",
    soft: "rgba(255,255,255,0.04)",
  };
}

function AiVerdictPanel({
  estimate,
  ai,
  stale,
  autoAi,
  onToggleAuto,
  onScoreAI,
}: {
  estimate: Scores;
  ai: AiState | undefined;
  stale: boolean;
  autoAi: boolean;
  onToggleAuto: () => void;
  onScoreAI: () => void;
}) {
  const status = ai?.status ?? "idle";
  const loading = status === "loading";
  const done = status === "done" && ai?.scores;
  const badge = aiSourceBadge(ai?.source, ai?.cached);
  // When a fresh real verdict is promoted into the headline grid, the panel's
  // own metric chips would just duplicate it — so only show them otherwise
  // (stale verdict, or a heuristic/mock fallback that isn't promoted).
  const promoted = Boolean(done && ai?.source === "ai" && !stale);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border"
      style={{
        borderColor: done && ai?.source === "ai" ? "var(--accent)" : "var(--border)",
        background:
          "linear-gradient(180deg, rgba(255,77,87,0.06), transparent 70%)",
      }}
    >
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--fg-subtle)]">
            ⚔ AI war room
          </span>
          {done && (
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
              style={{ color: badge.color, backgroundColor: badge.soft }}
            >
              {badge.label}
            </span>
          )}
          {done && stale && (
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
              style={{ color: "var(--warning)", backgroundColor: "var(--warning-soft)" }}
            >
              stale · edited
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleAuto}
            className={cn(
              "rounded-md px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors",
              autoAi
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--border)] text-[var(--fg-subtle)] hover:text-[var(--fg)]"
            )}
            title="Re-score automatically a moment after you stop editing"
          >
            auto {autoAi ? "on" : "off"}
          </button>
          <Button size="xs" variant={done ? "outline" : "primary"} onClick={onScoreAI} disabled={loading}>
            {loading ? "Convening…" : done ? (stale ? "↻ Re-score" : "↻ Re-run") : "⚔ Run war room"}
          </Button>
        </div>
      </div>

      <div className="p-4">
        {status === "idle" && (
          <p className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
            The grid above is an instant <span className="text-[var(--fg)]">estimate</span>.
            Run the six-critic red-team panel for an authoritative{" "}
            <span className="text-[var(--fg)]">Resonance</span> /{" "}
            <span className="text-[var(--fg)]">Backfire</span> verdict on this
            variant — identical or unedited forks are served from cache for free.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-1">
            <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-[var(--accent)]" />
            <p className="text-[12px] text-[var(--fg-muted)]">
              Convening six Bangladeshi critics — meme engineer, regional
              outsider, journalist, rival brand, regulator, brand purist…
            </p>
          </div>
        )}

        {status === "error" && (
          <p className="text-[12px] text-[var(--danger)]">
            {ai?.error ?? "Scoring failed."} — try again.
          </p>
        )}

        {done && ai?.scores && (
          <div className="space-y-4">
            {promoted && (
              <p className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
                Authoritative verdict shown in the grid above (with the live
                estimate in small text). The harshest critic:
              </p>
            )}
            {/* AI vs estimate metric chips — hidden once promoted to the grid */}
            {!promoted && (
            <div className="grid grid-cols-3 gap-2">
              {AI_METRICS.map((m) => {
                const aiVal = ai.scores![m.key];
                const estVal = estimate[m.key];
                const d = aiVal - estVal;
                const tone = m.invert ? riskTone(aiVal) : resonanceTone(aiVal);
                return (
                  <div
                    key={m.key}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-elev-1)]/50 px-2.5 py-2"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--fg-subtle)]">
                      {m.label}
                    </p>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span
                        className="font-display text-xl font-semibold tabular-nums"
                        style={{ color: tone.color }}
                      >
                        <AnimatedNumber value={aiVal} />
                      </span>
                      <span className="font-mono text-[9px] text-[var(--fg-subtle)]">
                        est {estVal}
                        {d !== 0 && (
                          <span className="ml-0.5">
                            {d > 0 ? "▲" : "▼"}
                            {Math.abs(d)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* Harshest critic callout */}
            {ai.topCritic && (
              <div
                className="rounded-xl border px-4 py-3"
                style={{
                  borderColor: "var(--border)",
                  background: "linear-gradient(180deg, var(--danger-soft), transparent 80%)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
                    harshest critic
                  </span>
                  <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
                    {ai.topCritic.agentName} ·{" "}
                    <span style={{ color: riskTone(ai.topCritic.severity).color }}>
                      {ai.topCritic.severity}/100
                    </span>
                  </span>
                </div>
                <p className="mt-2 font-mono text-[13px] italic leading-relaxed text-[var(--fg)]">
                  “{ai.topCritic.sampleAttack}”
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                  {ai.topCritic.reasoning}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreCell({
  label,
  value,
  base,
  parent,
  invert = false,
  spark,
  aiValue,
}: {
  label: string;
  value: number;
  base: number | undefined;
  parent: number | undefined;
  invert?: boolean;
  spark?: number[];
  /**
   * When set, this authoritative AI score becomes the primary number and the
   * heuristic `value` is demoted to an "est" subtext. Promoted only for a
   * fresh, real AI verdict (see Inspector).
   */
  aiValue?: number;
}) {
  const isAi = aiValue !== undefined;
  const shown = isAi ? aiValue : value;
  const tone = invert ? riskTone(shown) : resonanceTone(shown);

  // Estimate-vs-AI gap (AI mode) or baseline delta "since fork" (estimate mode).
  const dEst = isAi ? aiValue - value : 0;
  const dBase = base !== undefined ? value - base : 0;
  const dParent = parent !== undefined ? value - parent : 0;
  const deltaIsBad = invert ? dBase > 0 : dBase < 0;
  const deltaColor =
    dBase === 0
      ? "var(--fg-subtle)"
      : deltaIsBad
      ? "var(--danger)"
      : "var(--success)";

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-3 py-2.5"
      style={{
        borderColor: "var(--border)",
        background: `linear-gradient(180deg, ${tone.soft}, transparent 75%)`,
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          {label}
        </p>
        {isAi && (
          <span
            className="rounded-full px-1.5 py-px font-mono text-[8px] uppercase tracking-wider"
            style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft)" }}
          >
            AI
          </span>
        )}
      </div>
      <div className="mt-1 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span
            className="font-display text-2xl font-semibold tabular-nums tracking-tight"
            style={{ color: tone.color }}
          >
            <AnimatedNumber value={shown} />
          </span>
          {isAi ? (
            <span className="font-mono text-[10px] text-[var(--fg-subtle)]">
              est {value}
              {dEst !== 0 && (
                <span className="ml-0.5">
                  {dEst > 0 ? "▲" : "▼"}
                  {Math.abs(dEst)}
                </span>
              )}
            </span>
          ) : (
            base !== undefined && (
              <span
                className="font-mono text-[10px]"
                style={{ color: deltaColor }}
              >
                {dBase > 0 ? "▲" : dBase < 0 ? "▼" : "—"}
                {Math.abs(dBase)}
              </span>
            )
          )}
        </div>
        {!isAi && spark && spark.length > 1 && (
          <Sparkline values={spark} color={tone.color} />
        )}
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${shown}%`,
            backgroundColor: tone.color,
            boxShadow: `0 0 8px ${tone.color}`,
          }}
        />
      </div>
      {!isAi && parent !== undefined && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-[var(--fg-subtle)]">
          parent {parent} ·{" "}
          <span
            style={{
              color:
                dParent === 0
                  ? "var(--fg-subtle)"
                  : (invert ? dParent > 0 : dParent < 0)
                  ? "var(--danger)"
                  : "var(--success)",
            }}
          >
            {dParent >= 0 ? "+" : ""}
            {dParent}
          </span>
        </p>
      )}
    </div>
  );
}

function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  const W = 56;
  const H = 18;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} className="opacity-90">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={pts}
      />
      {values.length > 0 && (
        <circle
          cx={W}
          cy={H - ((values[values.length - 1] - min) / range) * H}
          r={2}
          fill={color}
        />
      )}
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  accent = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  accent?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-lg border bg-[var(--bg-elev-1)]/80 px-3 py-2 text-[14px] text-[var(--fg)] outline-none transition-all duration-200 placeholder:text-[var(--fg-subtle)]",
          accent
            ? "border-[var(--accent)]/30 focus:border-[var(--accent)] focus:bg-[var(--accent-soft)]/30 focus:ring-2 focus:ring-[var(--accent-ring)]"
            : "border-[var(--border)] focus:border-[var(--border-bright)] focus:bg-[var(--bg-elev-2)]"
        )}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elev-1)]/70 p-1">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all duration-150",
              value === o.value
                ? "bg-[var(--accent)] text-white shadow-[0_4px_12px_-4px_rgba(255,77,87,0.6)]"
                : "text-[var(--fg-muted)] hover:bg-white/[0.05] hover:text-[var(--fg)]"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </label>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Diff vs parent
   ────────────────────────────────────────────────────────────────── */

function DiffPanel({ branch, parent }: { branch: Branch; parent: Branch | null }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
          diff · vs parent
        </span>
        <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
          {parent ? `${parent.label} → ${branch.label}` : "root · no parent"}
        </span>
      </div>
      <div className="space-y-3 p-5">
        {!parent ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)]/60 px-4 py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
              This is the root commit
            </p>
            <p className="mt-2 text-[13px] text-[var(--fg-muted)]">
              Fork it to create alternative timelines.
            </p>
          </div>
        ) : (
          <>
            <DiffRow label="Slogan" a={parent.slogan} b={branch.slogan} />
            <DiffRow label="Tagline" a={parent.tagline} b={branch.tagline} />
            <DiffRow label="Cast" a={parent.cast} b={branch.cast} />
            <DiffRow label="CTA" a={parent.cta} b={branch.cta} />
            <DiffRow
              label="Risky line"
              a={parent.riskyLine || "— none —"}
              b={branch.riskyLine || "— none —"}
            />
            <DiffRow
              label="Tone · lang"
              a={`${parent.tone} · ${parent.language}`}
              b={`${branch.tone} · ${branch.language}`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function DiffRow({ label, a, b }: { label: string; a: string; b: string }) {
  const ops = useMemo(() => diffText(a, b), [a, b]);
  const same = a === b;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-1)]/40 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] uppercase",
            same ? "text-[var(--success)]" : "text-[var(--accent-400)]"
          )}
        >
          {same ? "unchanged" : "modified"}
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[13px] leading-relaxed text-[var(--fg-muted)]">
        {ops.map((op, i) =>
          op.type === "eq" ? (
            <span key={i} className="text-[var(--fg)]">
              {op.text}
            </span>
          ) : op.type === "add" ? (
            <span
              key={i}
              className="rounded-sm px-0.5"
              style={{
                backgroundColor: "var(--success-soft)",
                color: "var(--success)",
              }}
            >
              {op.text}
            </span>
          ) : (
            <span
              key={i}
              className="rounded-sm px-0.5 line-through"
              style={{
                backgroundColor: "var(--danger-soft)",
                color: "var(--danger)",
                textDecorationColor: "var(--danger)",
              }}
            >
              {op.text}
            </span>
          )
        )}
      </p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Activity log
   ────────────────────────────────────────────────────────────────── */

const EVENT_COLOR: Record<BranchEventType, string> = {
  fork: "var(--accent)",
  score: "var(--warning)",
  edit: "var(--info)",
  prune: "var(--danger)",
  baseline: "var(--success)",
};

function ActivityLog({ log }: { log: BranchEvent[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            commit · log
          </span>
          <Badge variant="default">{log.length} events</Badge>
        </div>
        <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
          most recent first
        </span>
      </div>
      <ul className="max-h-[480px] space-y-0.5 overflow-auto p-2">
        {log.length === 0 ? (
          <li className="px-4 py-6 text-center text-[13px] text-[var(--fg-muted)]">
            No commits yet — fork, edit, or score a branch.
          </li>
        ) : (
          log.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: EVENT_COLOR[entry.type] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[var(--fg)]">
                  {entry.message}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  {timeAgo(entry.ts)}
                </p>
              </div>
              <span
                className="font-mono text-[10px] uppercase tracking-wider"
                style={{ color: EVENT_COLOR[entry.type] }}
              >
                {entry.type}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Utils
   ────────────────────────────────────────────────────────────────── */

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
