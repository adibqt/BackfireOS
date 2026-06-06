import type { Branch, BranchScores, Lang, Tone } from "./types";

/**
 * Deterministic, semantic, keystroke-responsive scoring for a campaign variant.
 *
 * This is the *estimate* layer of Counterfactual Branching: it runs instantly in
 * the browser on every keystroke so the tree feels alive, and it doubles as the
 * server's fallback when no model key is configured. The authoritative judgment
 * comes from the AI red-team panel (see /api/branch-score) — this approximates
 * it cheaply so a real model call is only ever spent on content worth judging.
 *
 * Lifted unchanged from the original in-component scorer; the weights are tuned
 * against the bKash-flavoured seed tree.
 */

const clamp = (lo: number, hi: number, v: number) =>
  Math.max(lo, Math.min(hi, v));

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

export function scoreBranch(b: Pick<Branch,
  "slogan" | "tagline" | "cta" | "riskyLine" | "cast" | "tone" | "language">
): BranchScores {
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
