"use client";

import { useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";
import { cn } from "@/lib/utils";

export function SectionDivider() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div ref={ref} className="flex justify-center py-6" aria-hidden>
      <svg width="1" height="80" viewBox="0 0 1 80">
        <line
          x1="0.5"
          y1="0"
          x2="0.5"
          y2="80"
          stroke="var(--hairline)"
          strokeWidth="1"
          className={cn("draw-line-vertical", visible && "draw-line-vertical--visible")}
        />
      </svg>
    </div>
  );
}
