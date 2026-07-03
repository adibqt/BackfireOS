"use client";

import { useEffect, useState } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import {
  CARD_ROTATIONS,
  FRAMED_CARD_SIZE,
  FramedCardFront,
} from "@/components/simulate/agent-dossier-card";
import { useCountUp } from "@/hooks/use-count-up";
import { useLanguage } from "@/components/language-provider";
import { agentRole, severityBarColor } from "@/lib/agent-display";
import { prefersReducedMotion } from "@/hooks/use-scroll-progress";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPEN_MS = 1500;
const CLOSE_MS = 1000;

type FramedCardOverlayProps = {
  verdict: AgentVerdict;
  index: number;
  sourceRect: DOMRect;
  closing?: boolean;
  onClose: () => void;
  labels: {
    severity: string;
    reasoning: string;
    sampleAttack: string;
  };
};

function AgentCaseFileBack({
  verdict,
  labels,
  onClose,
  animatedSeverity,
}: {
  verdict: AgentVerdict;
  labels: FramedCardOverlayProps["labels"];
  onClose: () => void;
  animatedSeverity: number;
}) {
  const { locale } = useLanguage();
  const fillColor = severityBarColor(verdict.severity);

  return (
    <div className="framed-card__case-file">
      <button
        type="button"
        onClick={onClose}
        className="framed-card__case-close font-mono text-[var(--text-xl)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]"
        aria-label={t(locale, "closePanel")}
      >
        ×
      </button>

      <header className="shrink-0 border-b border-[var(--hairline)] pb-6">
        <h2
          id="framed-case-title"
          className="pr-10 font-display text-[var(--text-2xl)] font-medium text-[var(--ink-primary)]"
        >
          {verdict.agentName}
        </h2>
        <p className="mt-1 font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-secondary)]">
          {agentRole(verdict.agentId)}
        </p>
        {verdict.source === "mock" && (
          <span className="mt-2 inline-block font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--ink-tertiary)]">
            Demo
          </span>
        )}
      </header>

      <div className="framed-card__case-sections">
        <section>
          <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
            {labels.severity}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-sm bg-[var(--hairline)]">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${verdict.severity}%`,
                  backgroundColor: fillColor,
                }}
              />
            </div>
            <span className="font-mono text-[var(--text-sm)] tabular-nums text-[var(--ink-primary)]">
              {animatedSeverity}
            </span>
          </div>
        </section>

        <section>
          <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
            {labels.reasoning}
          </p>
          <p className="mt-3 font-display text-[var(--text-base)] leading-[1.7] text-[var(--ink-primary)]">
            {verdict.reasoning}
          </p>
        </section>

        <section>
          <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
            {labels.sampleAttack}
          </p>
          <blockquote className="mt-3 bg-[var(--bg-inset)] p-5 font-mono text-[var(--text-base)] leading-[1.6] text-[var(--ink-primary)]">
            {verdict.sampleAttack}
          </blockquote>
        </section>

        <section>
          <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
            {t(locale, "citations")}
          </p>
          {verdict.citationIds.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {verdict.citationIds.map((id) => (
                <span
                  key={id}
                  className="rounded-sm border border-[var(--hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 font-mono text-[var(--text-sm)] text-[var(--ink-primary)]"
                >
                  {id}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 font-mono text-[var(--text-sm)] text-[var(--ink-tertiary)]">—</p>
          )}
        </section>
      </div>
    </div>
  );
}

function computeOverlayVars(sourceRect: DOMRect, index: number) {
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const panelWidth = Math.min(640, vw * 0.92);
  const panelHeight = Math.min(vh * 0.85, 880);
  const squareSize = Math.min(640, Math.max(FRAMED_CARD_SIZE * 1.75, vh * 0.48));
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length] ?? 0;

  const dx0 = sourceCenterX - vw / 2;
  const dy0 = sourceCenterY - vh / 2;
  const fromSx = sourceRect.width / panelWidth;
  const fromSy = sourceRect.height / panelHeight;
  const midSx = squareSize / panelWidth;
  const midSy = squareSize / panelHeight;

  return {
    "--dx-0": `${dx0}px`,
    "--dy-0": `${dy0}px`,
    "--from-sx": String(fromSx),
    "--from-sy": String(fromSy),
    "--mid-sx": String(midSx),
    "--mid-sy": String(midSy),
    "--panel-width": `${panelWidth}px`,
    "--panel-height": `${panelHeight}px`,
    "--rest-rotate": `${rotation}deg`,
  } as React.CSSProperties;
}

export function FramedCardOverlay({
  verdict,
  index,
  sourceRect,
  closing = false,
  onClose,
  labels,
}: FramedCardOverlayProps) {
  const [reduced, setReduced] = useState(false);
  const animatedSeverity = useCountUp(Math.round(verdict.severity), true, 600);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  const overlayStyle = computeOverlayVars(sourceRect, index);

  if (reduced) {
    return (
      <div
        className={cn(
          "framed-overlay-card framed-overlay-card--reduced",
          closing ? "framed-overlay-card--reduced-out" : "framed-overlay-card--reduced-in"
        )}
        style={overlayStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="framed-case-title"
      >
        <AgentCaseFileBack
          verdict={verdict}
          labels={labels}
          onClose={onClose}
          animatedSeverity={animatedSeverity}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "framed-overlay-card",
        closing ? "framed-overlay-card--exit" : "framed-overlay-card--enter"
      )}
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="framed-case-title"
    >
      <div className="framed-overlay-card__scene">
        <div className="framed-overlay-card__flipper">
          <div className="framed-overlay-card__face framed-overlay-card__face--front">
            <div className="framed-overlay-card__front-wrap">
              <FramedCardFront
                verdict={verdict}
                hovered={false}
                animatedSeverity={animatedSeverity}
              />
            </div>
          </div>
          <div className="framed-overlay-card__face framed-overlay-card__face--back">
            <AgentCaseFileBack
              verdict={verdict}
              labels={labels}
              onClose={onClose}
              animatedSeverity={animatedSeverity}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export { OPEN_MS, CLOSE_MS };
export const TOTAL_CLOSE_MS = CLOSE_MS;
