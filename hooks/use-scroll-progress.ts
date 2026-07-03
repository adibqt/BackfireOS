"use client";

import { useEffect, useState, type RefObject } from "react";

type ScrollProgressOptions = {
  /** Scroll distance (px) over which progress goes 0 → 1. Default: element height. */
  range?: number;
  /** When true, progress clamps at 1 once past range. Default: true. */
  clamp?: boolean;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Returns scroll progress (0–1) for a target element relative to viewport top.
 * Progress 0 when element top is at viewport top; reaches 1 after scrolling `range` px
 * (defaults to element height).
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
  options: ScrollProgressOptions = {}
): number {
  const { range: rangeOverride, clamp = true } = options;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const range = rangeOverride ?? Math.max(rect.height, 1);
      const raw = -rect.top / range;
      const next = clamp ? Math.min(1, Math.max(0, raw)) : raw;
      setProgress(next);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref, rangeOverride, clamp]);

  return progress;
}

/** Binary threshold for reduced-motion sticky badge (show when hero scrolled past). */
export function useScrollPastThreshold<T extends HTMLElement = HTMLDivElement>(
  ref: RefObject<T | null>,
  threshold = 0.85
): boolean {
  const progress = useScrollProgress(ref);
  if (prefersReducedMotion()) {
    return progress >= threshold;
  }
  return progress >= threshold;
}

export { prefersReducedMotion };
