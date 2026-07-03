"use client";

import { useEffect, useId, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

type HeroFieldProps = {
  scoreNormalized: number;
  className?: string;
};

export function HeroField({ scoreNormalized, className }: HeroFieldProps) {
  const uid = useId().replace(/:/g, "");
  const filterId = `hero-field-${uid}`;
  const [reduced, setReduced] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const start = performance.now();
    const baseCycle = 30000 * (1 + scoreNormalized * 0.35);
    const loop = (now: number) => {
      setTick(((now - start) % baseCycle) / baseCycle);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, scoreNormalized]);

  const baseFreq = 0.004 + scoreNormalized * 0.001;
  const freq = reduced ? baseFreq : baseFreq + Math.sin(tick * Math.PI * 2) * 0.0015;
  const displacement = 4 + scoreNormalized * 6;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}
      aria-hidden
    >
      <svg
        className="h-full w-full scale-100 sm:scale-100"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
      >
        <defs>
          <radialGradient id={`${filterId}-bg`} cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#161412" />
            <stop offset="100%" stopColor="#0F0E0C" />
          </radialGradient>
          <filter id={filterId} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={freq}
              numOctaves={3}
              seed={2}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacement}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <rect width="1200" height="800" fill={`url(#${filterId}-bg)`} />
        <rect
          width="1200"
          height="800"
          fill="#161412"
          fillOpacity={0.35}
          filter={reduced ? undefined : `url(#${filterId})`}
        />
      </svg>
    </div>
  );
}
