"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

type HeroScoreGaugeProps = {
  score: number;
  size?: number;
  className?: string;
};

export function HeroScoreGauge({ score, size = 440, className }: HeroScoreGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.55;
  const innerR = size * 0.4;
  const circumference = 2 * Math.PI * outerR;
  const progressLen = (score / 100) * circumference;
  const tickCount = 20;
  const scoreAngleDeg = (score / 100) * 360;
  const activeTickIndex = Math.round(scoreAngleDeg / 18) % tickCount;

  const [offset, setOffset] = useState(circumference);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reduced) {
      setOffset(circumference - progressLen);
      return;
    }

    setOffset(circumference);
    let raf = 0;
    const start = performance.now();
    const duration = 1200;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -10 * t);
      setOffset(circumference - progressLen * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [circumference, progressLen, reduced, score]);

  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const angle = ((i * 18 - 90) * Math.PI) / 180;
    const isActive = i === activeTickIndex;
    const len = isActive ? 8 : 4;
    return {
      x1: cx + (outerR - len) * Math.cos(angle),
      y1: cy + (outerR - len) * Math.sin(angle),
      x2: cx + outerR * Math.cos(angle),
      y2: cy + outerR * Math.sin(angle),
      isActive,
    };
  });

  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        className
      )}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke="var(--hairline)"
        strokeWidth={1}
      />

      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke="var(--hairline)"
        strokeWidth={1}
        strokeDasharray="2 4"
      />

      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke="var(--signal)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={`${progressLen} ${circumference - progressLen}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />

      {ticks.map((tick, i) => (
        <line
          key={i}
          x1={tick.x1}
          y1={tick.y1}
          x2={tick.x2}
          y2={tick.y2}
          stroke={tick.isActive ? "var(--signal)" : "var(--hairline)"}
          strokeWidth={1}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}
