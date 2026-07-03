"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import { AgentDossierCard } from "@/components/simulate/agent-dossier-card";
import {
  FramedCardOverlay,
  TOTAL_CLOSE_MS,
} from "@/components/simulate/framed-card-overlay";
import { useLanguage } from "@/components/language-provider";
import { useRevealOnScroll, revealStaggerDelay } from "@/hooks/use-reveal-on-scroll";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AgentsDossierSectionProps = {
  verdicts: AgentVerdict[];
  mockCount: number;
  labels: {
    severity: string;
    reasoning: string;
    sampleAttack: string;
  };
};

function DossierReveal({
  index,
  visible,
  children,
  className,
}: {
  index: number;
  visible: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
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

export function AgentsDossierSection({
  verdicts,
  mockCount,
  labels,
}: AgentsDossierSectionProps) {
  const { locale } = useLanguage();
  const { ref: sectionRef, visible: sectionVisible } = useRevealOnScroll<HTMLElement>();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [sourceRect, setSourceRect] = useState<DOMRect | null>(null);
  const pendingRef = useRef<{ id: string; rect: DOMRect } | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeVerdict = verdicts.find((v) => v.agentId === (activeId ?? closingId));
  const activeIndex = activeVerdict
    ? verdicts.findIndex((v) => v.agentId === activeVerdict.agentId)
    : -1;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const beginClose = useCallback(
    (id: string) => {
      clearCloseTimer();
      setClosingId(id);
      setActiveId(null);
      closeTimerRef.current = setTimeout(() => {
        setClosingId(null);
        const pending = pendingRef.current;
        if (pending) {
          setSourceRect(pending.rect);
          setActiveId(pending.id);
          pendingRef.current = null;
        } else {
          setSourceRect(null);
        }
        closeTimerRef.current = null;
      }, TOTAL_CLOSE_MS);
    },
    [clearCloseTimer]
  );

  const closeCard = useCallback(() => {
    const id = activeId ?? closingId;
    if (!id) return;
    pendingRef.current = null;
    beginClose(id);
  }, [activeId, closingId, beginClose]);

  const openCard = useCallback(
    (verdict: AgentVerdict, rect: DOMRect) => {
      if (activeId === verdict.agentId) {
        closeCard();
        return;
      }

      if (activeId || closingId) {
        pendingRef.current = { id: verdict.agentId, rect };
        if (activeId) beginClose(activeId);
        return;
      }

      setSourceRect(rect);
      setActiveId(verdict.agentId);
    },
    [activeId, closingId, beginClose, closeCard]
  );

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCard();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeId, closeCard]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const overlayOpen = !!(activeId || closingId) && sourceRect && activeVerdict && activeIndex >= 0;

  return (
    <>
      <section
        id="simulate-agents"
        ref={sectionRef}
        className="scroll-mt-20 bg-[var(--bg-elevated)]"
        style={{ paddingBlock: "clamp(120px, 16vh, 180px)" }}
      >
        <div className="simulate-gutter">
          <div className="text-center">
            <DossierReveal index={0} visible={sectionVisible}>
              <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                {t(locale, "redTeamAgentsEyebrow")}
              </p>
            </DossierReveal>

            <DossierReveal index={1} visible={sectionVisible}>
              <h2 className="mt-4 font-display text-[var(--text-3xl)] font-medium leading-[var(--leading-tight)] text-[var(--ink-primary)]">
                {t(locale, "sixAdversariesOneCampaign")}
              </h2>
            </DossierReveal>

            <DossierReveal index={2} visible={sectionVisible}>
              <p className="mt-4 text-[var(--text-md)] italic text-[var(--ink-secondary)]">
                {t(locale, "tapDossierSubheading")}
              </p>
            </DossierReveal>
          </div>

          {mockCount > 0 && (
            <details className="mx-auto mt-8 max-w-xl">
              <summary className="cursor-pointer font-mono text-[var(--text-sm)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]">
                {t(locale, "demoDataDetails")}
              </summary>
              <p className="mt-3 text-[var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
                {t(locale, "demoDataBody")
                  .replace("{mockCount}", String(mockCount))
                  .replace("{total}", String(verdicts.length))}
              </p>
            </details>
          )}

          <div className="framed-card-grid mt-16 grid grid-cols-1 gap-y-14 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3 lg:gap-x-[56px] lg:gap-y-[56px]">
            {verdicts.map((verdict, i) => (
              <AgentDossierCard
                key={verdict.agentId}
                verdict={verdict}
                index={i}
                revealVisible={sectionVisible}
                active={activeId === verdict.agentId}
                dimmed={(activeId !== null || closingId !== null) && activeId !== verdict.agentId && closingId !== verdict.agentId}
                onOpen={(rect) => openCard(verdict, rect)}
              />
            ))}
          </div>
        </div>
      </section>

      {overlayOpen && (
        <div
          className="fixed inset-0 z-[var(--z-modal-backdrop)]"
          role="presentation"
        >
          <button
            type="button"
            aria-label={t(locale, "closePanel")}
            className={cn(
              "absolute inset-0 bg-[rgba(0,0,0,0.45)] transition-opacity duration-[600ms]",
              activeId || closingId ? "opacity-100" : "opacity-0"
            )}
            onClick={closeCard}
          />
          <FramedCardOverlay
            verdict={activeVerdict}
            index={activeIndex}
            sourceRect={sourceRect}
            closing={!!closingId}
            onClose={closeCard}
            labels={labels}
          />
        </div>
      )}
    </>
  );
}
