"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavigationProgressContextValue {
  startNavigation: () => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

const MIN_DISPLAY_MS = 300;

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const startedAt = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNavigation = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    startedAt.current = Date.now();
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const elapsed = startedAt.current ? Date.now() - startedAt.current : MIN_DISPLAY_MS;
    const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
    timerRef.current = setTimeout(() => setActive(false), remaining);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, active]);

  return (
    <NavigationProgressContext.Provider value={{ startNavigation }}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[var(--z-sticky)] h-0.5 overflow-hidden transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      >
        <div
          className={cn(
            "nav-progress-bar h-full w-1/3 bg-[var(--accent)]",
            active && "nav-progress-active"
          )}
        />
      </div>
      {children}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const ctx = useContext(NavigationProgressContext);
  if (!ctx) throw new Error("useNavigationProgress must be used within NavigationProgressProvider");
  return ctx;
}

export function PendingLink({
  href,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Link>) {
  const { startNavigation } = useNavigationProgress();
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        startNavigation();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
