"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { revealStaggerDelay, useRevealOnScroll } from "@/hooks/use-reveal-on-scroll";

type RevealOnScrollProps = {
  index?: number;
  children: React.ReactNode;
  className?: string;
};

export function RevealOnScroll({ index = 0, children, className }: RevealOnScrollProps) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "reveal-on-scroll",
        visible && "reveal-on-scroll--visible",
        className
      )}
      style={{ transitionDelay: visible ? revealStaggerDelay(index) : undefined }}
    >
      {children}
    </div>
  );
}

export function RevealOnScrollItem({
  index = 0,
  children,
  className,
}: RevealOnScrollProps) {
  return (
    <RevealOnScroll index={index} className={className}>
      {children}
    </RevealOnScroll>
  );
}

/** Hook wrapper for applying reveal classes directly on elements */
export function useRevealClass(index = 0) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return {
    ref,
    className: cn("reveal-on-scroll", visible && "reveal-on-scroll--visible"),
    style: visible ? { transitionDelay: revealStaggerDelay(index) } : undefined,
  };
}

/** Focus trap for modals */
export function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return;
      if (e.key !== "Tab" || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus.current?.focus();
    };
  }, [active, containerRef]);
}
