import type { Branch } from "./types";

/**
 * The starter bKash-flavoured variant tree. Used in two places:
 *   - the persistence layer seeds a brand-new user's tree with it (with fresh
 *     UUIDs, see materializeSeed in the store), so the page is never empty;
 *   - the client falls back to it verbatim when persistence is unavailable
 *     (logged out, or no Supabase configured), preserving the public demo.
 *
 * The string ids ("main", "fork-celeb") are placeholders only meaningful within
 * this array — the store remaps them to real UUIDs while preserving parentage.
 */
export function seedBranches(): Branch[] {
  const now = Date.now();
  return [
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
      createdAt: now - 1000 * 60 * 60 * 12,
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
      createdAt: now - 1000 * 60 * 60 * 8,
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
      createdAt: now - 1000 * 60 * 60 * 6,
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
      createdAt: now - 1000 * 60 * 60 * 3,
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
      createdAt: now - 1000 * 60 * 60 * 1,
    },
  ];
}
