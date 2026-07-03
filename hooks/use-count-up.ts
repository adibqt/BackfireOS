"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Expo-out easing matching --ease-out-expo feel */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animates a number from 0 to target when `active` becomes true.
 * Skips animation when prefers-reduced-motion is set.
 */
export function useCountUp(
  target: number,
  active: boolean,
  duration = 600
): number {
  const [value, setValue] = useState(active && prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutExpo(t);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return Math.round(value);
}
