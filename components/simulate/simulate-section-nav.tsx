"use client";

import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const SIMULATE_SECTIONS = [
  { id: "simulate-verdict", labelKey: "navSimulateVerdict" },
  { id: "simulate-radar", labelKey: "navSimulateRadar" },
  { id: "simulate-agents", labelKey: "navSimulateAgents" },
  { id: "simulate-network", labelKey: "navSimulateNetwork" },
  { id: "simulate-territory", labelKey: "navSimulateTerritory" },
  { id: "simulate-memes", labelKey: "navSimulateMemes" },
] as const;

export function SimulateSectionNav({ locale }: { locale: Locale }) {
  const [activeId, setActiveId] = useState<string>(SIMULATE_SECTIONS[0].id);

  useEffect(() => {
    const ratios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            ratios.set(entry.target.id, entry.intersectionRatio);
          } else {
            ratios.delete(entry.target.id);
          }
        }

        if (ratios.size === 0) return;

        let bestId: string = SIMULATE_SECTIONS[0].id;
        let bestRatio = -1;
        let bestTop = Infinity;

        for (const { id } of SIMULATE_SECTIONS) {
          const ratio = ratios.get(id);
          if (ratio === undefined) continue;
          const top = document.getElementById(id)?.getBoundingClientRect().top ?? Infinity;
          if (ratio > bestRatio || (ratio === bestRatio && top < bestTop)) {
            bestRatio = ratio;
            bestTop = top;
            bestId = id;
          }
        }

        setActiveId(bestId);
      },
      { rootMargin: "-18% 0px -55% 0px", threshold: [0, 0.15, 0.35, 0.55, 0.75] }
    );

    for (const { id } of SIMULATE_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerOffset = 76;
    const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav
      aria-label={t(locale, "simulatePageNav")}
      className="simulate-section-nav fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 border-r border-[var(--hairline)] bg-[var(--bg-base)] py-5 pl-3 pr-4 xl:block"
    >
      <ul className="flex flex-col gap-1">
        {SIMULATE_SECTIONS.map(({ id, labelKey }, index) => {
          const active = activeId === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => scrollTo(id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group flex items-center gap-2.5 py-2.5 pl-1 pr-2 text-left transition-colors duration-200",
                  active
                    ? "text-[var(--signal)]"
                    : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-6 shrink-0 items-center justify-center font-mono text-[13px] font-medium tabular-nums",
                    active ? "text-[var(--signal)]" : "text-[var(--ink-secondary)]"
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "h-8 w-0.5 shrink-0 rounded-full transition-all duration-200",
                    active ? "bg-[var(--signal)]" : "bg-transparent group-hover:bg-[var(--hairline)]"
                  )}
                />
                <span className="max-h-32 font-mono text-[13px] font-medium uppercase leading-[1.4] tracking-[0.08em] [writing-mode:vertical-rl] rotate-180">
                  {t(locale, labelKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
