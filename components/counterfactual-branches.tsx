"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────
   Counterfactual Branching — "Git for campaigns"
   Pure-frontend demo. Tweak any element of a branch and watch the
   Resonance and Backfire scores propagate in real time across a
   visual tree of campaign variants.
   ────────────────────────────────────────────────────────────────── */

type Tone = "playful" | "formal" | "aggressive" | "warm";
type Lang = "en" | "bn" | "mixed";

type Branch = {
  id: string;
  parentId: string | null;
  label: string;
  author: string;
  slogan: string;
  cast: string;
  tagline: string;
  cta: string;
  riskyLine: string;
  tone: Tone;
  language: Lang;
  createdAt: number;
};

type Scores = {
  resonance: number;
  backfireRisk: number;
  backfireScore: number;
  memeability: number;
  polarization: number;
  drift: number;
};

const clamp = (lo: number, hi: number, v: number) =>
  Math.max(lo, Math.min(hi, v));

/* ──────────────────────────────────────────────────────────────────
   Scoring — deterministic, semantic, keystroke-responsive
   ────────────────────────────────────────────────────────────────── */

const KW = {
  risky: [
    "cheap", "poor", "rich", "beat", "destroy", "crush", "better than",
    "fake", "loser", "kill", "war",
  ],
  local: [
    "desh", "amader", "bangla", "gorbo", "shobai", "apnar", "apni",
    "ami", "taka", "boli", "bhai", "didi", "bondhu",
  ],
  memeable: [
    "vibe", "crazy", "big", "win", "level", "mood", "cash", "wifi",
    "drop", "energy", "rizz", "lit",
  ],
  polarizing: ["only", "pure", "true", "real", "we", "they", "us", "them"],
  family: ["family", "mother", "father", "parents", "baba", "ma", "amma"],
  premium: ["premium", "elite", "exclusive", "luxury", "platinum"],
  trust: ["trusted", "safe", "secure", "halal", "blessed", "reliable"],
};

function countHits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    let idx = 0;
    while ((idx = text.indexOf(w, idx)) !== -1) {
      n++;
      idx += w.length;
    }
  }
  return n;
}

function scoreBranch(b: Branch): Scores {
  const text = `${b.slogan} ${b.tagline} ${b.cta} ${b.riskyLine}`.toLowerCase();
  const cast = b.cast.toLowerCase();

  let resonance = 52;
  let backfireRisk = 32;
  let memeability = 38;
  let polarization = 24;
  let drift = 20;

  const toneMap: Record<Tone, [number, number, number, number, number]> = {
    playful:    [ 10,   6,  22,   2,  10],
    formal:     [ -2,  -8, -10,  -4,  -6],
    aggressive: [ -8,  24,  14,  20,  18],
    warm:       [ 14,  -8,   2,  -8,  -4],
  };
  const [r, bf, mm, pl, dr] = toneMap[b.tone];
  resonance += r;
  backfireRisk += bf;
  memeability += mm;
  polarization += pl;
  drift += dr;

  const langMap: Record<Lang, [number, number, number, number, number]> = {
    en:    [ -6,   2,  -2,   0,   6],
    bn:    [ 16,  -4,   2,   2,  -2],
    mixed: [ 10,   2,  10,   6,   4],
  };
  const [lr, lb, lm, lp, ld] = langMap[b.language];
  resonance += lr;
  backfireRisk += lb;
  memeability += lm;
  polarization += lp;
  drift += ld;

  const riskyHits = countHits(text, KW.risky);
  const localHits = countHits(text, KW.local);
  const memeHits = countHits(text, KW.memeable);
  const polHits = countHits(text, KW.polarizing);
  const familyHits = countHits(text, KW.family);
  const premiumHits = countHits(text, KW.premium);
  const trustHits = countHits(text, KW.trust);

  backfireRisk += riskyHits * 9;
  polarization += riskyHits * 6;
  drift += riskyHits * 4;

  resonance += localHits * 4;
  memeability += localHits * 2;

  memeability += memeHits * 6;
  drift += memeHits * 2;

  polarization += polHits * 6;
  backfireRisk += polHits * 2;

  resonance += familyHits * 8;
  backfireRisk -= familyHits * 3;

  resonance -= premiumHits * 5;
  polarization += premiumHits * 4;

  resonance += trustHits * 6;
  backfireRisk -= trustHits * 4;

  if (/celebrity|shakib|tahsan|nusrat|momtaz/.test(cast)) {
    memeability += 14;
    polarization += 10;
    resonance += 5;
  }
  if (/family|mother|father|grand/.test(cast)) {
    resonance += 12;
    backfireRisk -= 4;
  }
  if (/young|gen ?z|student|teen/.test(cast)) {
    memeability += 10;
    drift += 6;
    resonance += 5;
  }
  if (/elder|grandma|nani|dadu/.test(cast)) {
    resonance += 9;
    backfireRisk -= 4;
  }
  if (/influencer|tiktok|reel/.test(cast)) {
    memeability += 12;
    drift += 8;
    polarization += 4;
  }

  if (b.riskyLine.trim().length > 4) {
    backfireRisk += 16;
    polarization += 12;
    memeability += 8;
    drift += 6;
  }

  if (b.slogan.length > 90) drift += 8;
  if (b.slogan.trim().length < 6) backfireRisk += 5;

  resonance = clamp(0, 100, resonance);
  backfireRisk = clamp(0, 100, backfireRisk);
  memeability = clamp(0, 100, memeability);
  polarization = clamp(0, 100, polarization);
  drift = clamp(0, 100, drift);

  const backfireScore = clamp(
    0,
    100,
    Math.round(backfireRisk * 0.5 + polarization * 0.3 + drift * 0.2)
  );

  return {
    resonance: Math.round(resonance),
    backfireRisk: Math.round(backfireRisk),
    backfireScore,
    memeability: Math.round(memeability),
    polarization: Math.round(polarization),
    drift: Math.round(drift),
  };
}

/* ──────────────────────────────────────────────────────────────────
   Seed tree — believable bKash-flavoured starter branches
   ────────────────────────────────────────────────────────────────── */

const SEED: Branch[] = [
  {
    id: "main",
    parentId: null,
    label: "v1.0 · main",
    author: "Brand Lead",
    slogan: "Ekdike cash, onkdike bKash",
    cast: "Working professional, mid-20s",
    tagline: "Move money. Move forward.",
    cta: "Download bKash",
    riskyLine: "",
    tone: "playful",
    language: "mixed",
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
  },
  {
    id: "fork-formal",
    parentId: "main",
    label: "v1.1 · formal-bn",
    author: "Strategy",
    slogan: "Apnar taka, apnar haath e",
    cast: "Family, multi-generational",
    tagline: "Bishshwasta. Shohoj. Apnar bKash.",
    cta: "Akhoni shuru korun",
    riskyLine: "",
    tone: "warm",
    language: "bn",
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
  },
  {
    id: "fork-celeb",
    parentId: "main",
    label: "v1.2 · celebrity",
    author: "Creative",
    slogan: "Shakib bhai er pocket-e bKash",
    cast: "Celebrity, Shakib Khan",
    tagline: "Big stars. Bigger transfers.",
    cta: "Join the movement",
    riskyLine: "",
    tone: "playful",
    language: "mixed",
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
  },
  {
    id: "fork-edge",
    parentId: "fork-celeb",
    label: "v1.3 · edge-push",
    author: "Performance",
    slogan: "Cash is poor, bKash is power",
    cast: "Young influencer, TikTok",
    tagline: "Real money moves real fast.",
    cta: "Switch now or stay broke",
    riskyLine: "Only losers carry cash in 2026",
    tone: "aggressive",
    language: "en",
    createdAt: Date.now() - 1000 * 60 * 60 * 3,
  },
  {
    id: "fork-warm",
    parentId: "main",
    label: "v1.4 · warm-family",
    author: "Brand Lead",
    slogan: "Ma er kaache taka pathate, ek tap",
    cast: "Mother and son, Sylhet",
    tagline: "Trusted by every family.",
    cta: "Send love. Send bKash.",
    riskyLine: "",
    tone: "warm",
    language: "bn",
    createdAt: Date.now() - 1000 * 60 * 60 * 1,
  },
];

/* ──────────────────────────────────────────────────────────────────
   Tree layout — left-to-right tidy tree (git log --graph feel)
   ────────────────────────────────────────────────────────────────── */

type Pos = { x: number; y: number };
const COL_W = 260;
const ROW_H = 116;
const OFFSET_X = 130;
const OFFSET_Y = 70;

function layoutTree(branches: Branch[]): {
  positions: Record<string, Pos>;
  width: number;
  height: number;
} {
  const byParent: Record<string, Branch[]> = {};
  for (const b of branches) {
    const p = b.parentId ?? "__root__";
    (byParent[p] ??= []).push(b);
  }
  for (const k of Object.keys(byParent)) {
    byParent[k].sort((a, b) => a.createdAt - b.createdAt);
  }

  const positions: Record<string, Pos> = {};
  let row = 0;
  let maxDepth = 0;

  const visit = (id: string, depth: number): number => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = byParent[id] ?? [];
    if (kids.length === 0) {
      const y = row++;
      positions[id] = { x: depth, y };
      return y;
    }
    const ys = kids.map((c) => visit(c.id, depth + 1));
    const y = (Math.min(...ys) + Math.max(...ys)) / 2;
    positions[id] = { x: depth, y };
    return y;
  };

  const roots = branches.filter((b) => b.parentId === null);
  for (const r of roots) visit(r.id, 0);

  const px: Record<string, Pos> = {};
  for (const id of Object.keys(positions)) {
    px[id] = {
      x: OFFSET_X + positions[id].x * COL_W,
      y: OFFSET_Y + positions[id].y * ROW_H,
    };
  }
  const width = OFFSET_X * 2 + maxDepth * COL_W + 120;
  const height = OFFSET_Y * 2 + row * ROW_H;
  return { positions: px, width, height };
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
  const [log, setLog] = useState<
    { id: string; ts: number; text: string; tone: "fork" | "edit" | "delta" }[]
  >([
    {
      id: "i-0",
      ts: Date.now() - 1000 * 60 * 50,
      text: "v1.3 · edge-push forked from v1.2 · celebrity — backfire surged +34",
      tone: "fork",
    },
    {
      id: "i-1",
      ts: Date.now() - 1000 * 60 * 20,
      text: "v1.4 · warm-family forked from v1.0 · main — resonance +22",
      tone: "fork",
    },
  ]);

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

  function patchSelected(patch: Partial<Branch>) {
    setBranches((bs) => bs.map((b) => (b.id === selected.id ? { ...b, ...patch } : b)));
  }

  function forkSelected() {
    const id = `fork-${Math.random().toString(36).slice(2, 8)}`;
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
    setSelectedId(id);
    setLog((l) => [
      {
        id: `l-${id}`,
        ts: Date.now(),
        text: `${label} forked from ${selected.label}`,
        tone: "fork",
      },
      ...l,
    ]);
  }

  function resetToBaseline() {
    if (!baseline) return;
    setBranches((bs) => bs); // no-op; baselines are read-only refs
    setLog((l) => [
      {
        id: `r-${Date.now()}`,
        ts: Date.now(),
        text: `${selected.label} baseline checkpoint refreshed`,
        tone: "edit",
      },
      ...l,
    ]);
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
    setLog((l) => [
      {
        id: `d-${Date.now()}`,
        ts: Date.now(),
        text: `${selected.label} pruned (${drop.size} node${drop.size > 1 ? "s" : ""})`,
        tone: "edit",
      },
      ...l,
    ]);
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
      />

      {/* Main split: tree + inspector */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <TreeCanvas
          branches={branches}
          positions={positions}
          width={width}
          height={height}
          selectedId={selected.id}
          allScores={allScores}
          onSelect={setSelectedId}
        />

        <Inspector
          branch={selected}
          parent={parent}
          scores={selScores}
          parentScores={parentScores}
          baseline={baseline}
          history={history[selected.id] ?? []}
          onPatch={patchSelected}
          onFork={forkSelected}
          onReset={resetToBaseline}
          onDelete={deleteSelected}
        />
      </div>

      {/* Footer row */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
}: {
  branches: Branch[];
  selected: Branch;
  scores: Scores;
  parentScores: Scores | null;
  baseline: Scores | undefined;
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
          <Badge variant="accent" dot className="mb-4">
            Live demo · counterfactual engine
          </Badge>
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
  onSelect,
}: {
  branches: Branch[];
  positions: Record<string, Pos>;
  width: number;
  height: number;
  selectedId: string;
  allScores: Record<string, Scores>;
  onSelect: (id: string) => void;
}) {
  const NODE_W = 212;
  const NODE_H = 92;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_30%_0%,rgba(255,77,87,0.12),transparent_70%)]"
      />
      <div className="bg-dot absolute inset-0 opacity-40" aria-hidden />

      <div className="relative flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            branch · tree
          </span>
          <Badge variant="accent" dot>
            live
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--fg-subtle)]">
          <Legend swatch="var(--success)" label="low risk" />
          <Legend swatch="var(--warning)" label="medium" />
          <Legend swatch="var(--danger)" label="high" />
        </div>
      </div>

      <div
        className="relative max-h-[640px] overflow-auto"
        style={{ minHeight: 380 }}
      >
        <svg
          viewBox={`0 0 ${width} ${Math.max(height, 360)}`}
          width={width}
          height={Math.max(height, 360)}
          className="block"
          role="img"
          aria-label="Counterfactual branch tree"
        >
          <defs>
            <linearGradient id="edge" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
              <stop offset="100%" stopColor="rgba(255,77,87,0.55)" />
            </linearGradient>
            <linearGradient id="edge-active" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,77,87,0.4)" />
              <stop offset="100%" stopColor="rgba(255,122,130,0.95)" />
            </linearGradient>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges first */}
          {branches.map((b) => {
            if (!b.parentId) return null;
            const a = positions[b.parentId];
            const c = positions[b.id];
            if (!a || !c) return null;
            const px1 = a.x + NODE_W / 2;
            const py1 = a.y;
            const px2 = c.x - NODE_W / 2;
            const py2 = c.y;
            const midx = (px1 + px2) / 2;
            const d = `M ${px1} ${py1} C ${midx} ${py1}, ${midx} ${py2}, ${px2} ${py2}`;
            const onPath =
              b.id === selectedId || b.parentId === selectedId;
            return (
              <g key={`e-${b.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={onPath ? "url(#edge-active)" : "url(#edge)"}
                  strokeWidth={onPath ? 2.5 : 1.5}
                  strokeLinecap="round"
                  opacity={onPath ? 1 : 0.75}
                />
                {onPath && (
                  <circle r={3} fill="var(--accent)">
                    <animateMotion
                      dur="2.4s"
                      repeatCount="indefinite"
                      path={d}
                    />
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
            return (
              <g
                key={b.id}
                transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(b.id)}
              >
                {isSel && (
                  <rect
                    x={-4}
                    y={-4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={14}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={1.5}
                    opacity={0.6}
                    filter="url(#nodeGlow)"
                  >
                    <animate
                      attributeName="opacity"
                      values="0.35;0.85;0.35"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </rect>
                )}
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill="var(--bg-elev-2)"
                  stroke={isSel ? "var(--accent)" : "rgba(255,255,255,0.12)"}
                  strokeWidth={isSel ? 1.5 : 1}
                />
                {/* tone bar */}
                <rect
                  x={0}
                  y={0}
                  width={4}
                  height={NODE_H}
                  rx={2}
                  fill={tone.color}
                />
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
              </g>
            );
          })}
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
  onPatch: (p: Partial<Branch>) => void;
  onFork: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
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
        <div className="grid grid-cols-3 gap-2">
          <ScoreCell
            label="Backfire"
            value={scores.backfireScore}
            base={baseline?.backfireScore}
            parent={parentScores?.backfireScore}
            invert
            spark={history}
          />
          <ScoreCell
            label="Resonance"
            value={scores.resonance}
            base={baseline?.resonance}
            parent={parentScores?.resonance}
          />
          <ScoreCell
            label="Polarization"
            value={scores.polarization}
            base={baseline?.polarization}
            parent={parentScores?.polarization}
            invert
          />
          <ScoreCell
            label="Memeability"
            value={scores.memeability}
            base={baseline?.memeability}
            parent={parentScores?.memeability}
          />
          <ScoreCell
            label="Brand drift"
            value={scores.drift}
            base={baseline?.drift}
            parent={parentScores?.drift}
            invert
          />
          <ScoreCell
            label="Backfire risk"
            value={scores.backfireRisk}
            base={baseline?.backfireRisk}
            parent={parentScores?.backfireRisk}
            invert
          />
        </div>

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

function ScoreCell({
  label,
  value,
  base,
  parent,
  invert = false,
  spark,
}: {
  label: string;
  value: number;
  base: number | undefined;
  parent: number | undefined;
  invert?: boolean;
  spark?: number[];
}) {
  const tone = invert ? riskTone(value) : resonanceTone(value);
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
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {label}
      </p>
      <div className="mt-1 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span
            className="font-display text-2xl font-semibold tabular-nums tracking-tight"
            style={{ color: tone.color }}
          >
            <AnimatedNumber value={value} />
          </span>
          {base !== undefined && (
            <span
              className="font-mono text-[10px]"
              style={{ color: deltaColor }}
            >
              {dBase > 0 ? "▲" : dBase < 0 ? "▼" : "—"}
              {Math.abs(dBase)}
            </span>
          )}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline values={spark} color={tone.color} />
        )}
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${value}%`,
            backgroundColor: tone.color,
            boxShadow: `0 0 8px ${tone.color}`,
          }}
        />
      </div>
      {parent !== undefined && (
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

function ActivityLog({
  log,
}: {
  log: { id: string; ts: number; text: string; tone: "fork" | "edit" | "delta" }[];
}) {
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
      <ul className="max-h-[260px] space-y-0.5 overflow-auto p-2">
        {log.length === 0 ? (
          <li className="px-4 py-6 text-center text-[13px] text-[var(--fg-muted)]">
            No commits yet — try forking a branch.
          </li>
        ) : (
          log.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    entry.tone === "fork"
                      ? "var(--accent)"
                      : entry.tone === "delta"
                      ? "var(--warning)"
                      : "var(--info)",
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[var(--fg)]">
                  {entry.text}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  {timeAgo(entry.ts)}
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                {entry.tone}
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
