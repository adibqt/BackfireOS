"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";
import { cn } from "@/lib/utils";

type HeroCursorCrackProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  className?: string;
};

const CRACK_BRANCHES = [
  "M 0 0 L -18 -42 L -28 -68 L -22 -92",
  "M 0 0 L 12 -36 L 24 -58 L 18 -78",
  "M 0 0 L -6 -28 L -14 -52",
  "M 0 0 L 8 -22 L 16 -44 L 10 -60",
  "M 0 0 L -10 -18 L -4 -38",
];

export function HeroCursorCrack({ containerRef, className }: HeroCursorCrackProps) {
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(true);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const [renderPos, setRenderPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || reduced) return;

    const onEnter = () => setActive(true);
    const onLeave = () => setActive(false);
    const onMove = (event: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      target.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mousemove", onMove);

    let raf = 0;
    const loop = () => {
      pos.current = {
        x: pos.current.x + (target.current.x - pos.current.x) * 0.055,
        y: pos.current.y + (target.current.y - pos.current.y) * 0.055,
      };
      setRenderPos({ x: pos.current.x, y: pos.current.y });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [containerRef, reduced]);

  if (reduced) return null;

  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible transition-opacity duration-700",
        active ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <g
        transform={`translate(${renderPos.x} ${renderPos.y})`}
        style={{ transition: "opacity 0.4s ease" }}
      >
        {CRACK_BRANCHES.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="var(--hairline)"
            strokeWidth={i === 0 ? 1.25 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.22 + (i % 2) * 0.06}
          />
        ))}
        <circle cx={0} cy={0} r={1.5} fill="var(--ink-tertiary)" opacity={0.35} />
      </g>
    </svg>
  );
}
