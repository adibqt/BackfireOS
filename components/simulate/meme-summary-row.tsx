"use client";

import { useRevealOnScroll, revealStaggerDelay } from "@/hooks/use-reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type MemeSummaryRowProps = {
  count: number;
  score: number;
  onOpen: () => void;
};

export function MemeSummaryRow({ count, score, onOpen }: MemeSummaryRowProps) {
  const { locale } = useLanguage();
  const { ref, visible } = useRevealOnScroll<HTMLElement>();

  const summary = t(locale, "memeRowSummary")
    .replace("{count}", String(count))
    .replace("{score}", String(Math.round(score)));

  return (
    <section
      id="simulate-memes"
      ref={ref}
      className={cn(
        "simulate-memes-strip scroll-mt-20 bg-[var(--bg-base)]",
        "reveal-on-scroll",
        visible && "reveal-on-scroll--visible"
      )}
      style={{
        paddingBlock: "48px",
        transitionDelay: visible ? revealStaggerDelay(0) : undefined,
      }}
    >
      <div className="simulate-gutter flex flex-wrap items-center justify-between gap-6">
        <p className="font-mono text-[var(--text-sm)] text-[var(--ink-secondary)]">
          {count > 0
            ? summary
            : `MEMEABILITY ${Math.round(score)}/100 — no parody mutations.`}
        </p>
        {count > 0 && (
          <button
            type="button"
            onClick={onOpen}
            className="font-mono text-[var(--text-sm)] text-[var(--ink-primary)] underline decoration-[var(--ink-tertiary)] underline-offset-4 transition-colors hover:text-[var(--signal)] hover:decoration-[var(--signal)]"
          >
            {t(locale, "viewMemesLink")}
          </button>
        )}
      </div>
    </section>
  );
}
