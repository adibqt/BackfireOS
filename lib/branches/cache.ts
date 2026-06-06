import { createHash } from "node:crypto";
import type { BranchScoreResponse } from "./types";

/**
 * In-memory content-addressed cache for branch verdicts.
 *
 * The guide calls for "incremental evaluation": when a variant is branched,
 * only re-judge what actually changed and reuse the rest. The Gemini SDK used
 * here doesn't expose explicit KV/context caching, so the honest equivalent is
 * memoizing the whole verdict by a hash of the scored content. Consequences:
 *   - Forking a branch and NOT editing it is free — the fork hashes identically
 *     to its parent and serves the parent's cached panel verdict instantly.
 *   - Typing then reverting a slogan costs one model call, not two.
 *   - Two designers who independently arrive at the same copy share a verdict.
 *
 * Process-local and best-effort. It survives within a server instance but not
 * across cold starts, which is the right trade for a demo: correctness never
 * depends on it, it only removes redundant model calls.
 */

const MAX_ENTRIES = 500;
const TTL_MS = 60 * 60 * 1000; // 1 hour

interface Entry {
  value: Omit<BranchScoreResponse, "cached">;
  expiresAt: number;
}

// Map preserves insertion order, which we use for cheap LRU eviction.
const store = new Map<string, Entry>();

export function hashContent(contentKey: string): string {
  return createHash("sha256").update(contentKey).digest("hex").slice(0, 16);
}

export function getCached(
  hash: string
): Omit<BranchScoreResponse, "cached"> | null {
  const entry = store.get(hash);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(hash);
    return null;
  }
  // Touch for LRU recency.
  store.delete(hash);
  store.set(hash, entry);
  return entry.value;
}

export function setCached(
  hash: string,
  value: Omit<BranchScoreResponse, "cached">
): void {
  store.delete(hash);
  store.set(hash, { value, expiresAt: Date.now() + TTL_MS });
  // Evict oldest until within bounds.
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}
