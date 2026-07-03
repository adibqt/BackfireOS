"use client";

import { forwardRef, useState } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import { AgentPortrait } from "@/components/agent-portrait";
import { useCountUp } from "@/hooks/use-count-up";
import { agentRole } from "@/lib/agent-display";
import { useLanguage } from "@/components/language-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const CARD_ROTATIONS = [-4, 2.5, -1.5, 3, -2.5, 1.5] as const;
export const CARD_MARGIN_TOPS = [-20, 16, -8, 20, -14, 6] as const;
export const FRAMED_CARD_SIZE = 320;

type FramedCardFrontProps = {
  verdict: AgentVerdict;
  hovered?: boolean;
  animatedSeverity: number;
};

export function FramedCardFront({
  verdict,
  hovered = false,
  animatedSeverity,
}: FramedCardFrontProps) {
  const { locale } = useLanguage();

  return (
    <div className="framed-card__frame">
      <div className="framed-card__mat">
        <div className="framed-card__photo">
          <AgentPortrait
            agentId={verdict.agentId}
            hovered={hovered}
            className="h-full w-full"
          />
        </div>
      </div>
      <div className="framed-card__nameplate">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[var(--text-base)] uppercase tracking-[0.08em] text-[var(--ink-secondary)]">
            {agentRole(verdict.agentId)}
          </p>
        </div>
        <div
          className="framed-card__severity-chip shrink-0"
          aria-label={`${t(locale, "severity")} ${animatedSeverity}`}
        >
          <span className="font-mono text-[var(--text-xl)] font-semibold tabular-nums leading-none text-[var(--signal)]">
            {animatedSeverity}
          </span>
        </div>
      </div>
    </div>
  );
}

type AgentDossierCardProps = {
  verdict: AgentVerdict;
  index: number;
  active?: boolean;
  dimmed?: boolean;
  revealVisible?: boolean;
  onOpen: (rect: DOMRect) => void;
};

export const AgentDossierCard = forwardRef<HTMLButtonElement, AgentDossierCardProps>(
  function AgentDossierCard(
    {
      verdict,
      index,
      active = false,
      dimmed = false,
      revealVisible = true,
      onOpen,
    },
    ref
  ) {
    const [hovered, setHovered] = useState(false);
    const animatedSeverity = useCountUp(Math.round(verdict.severity), revealVisible, 600);

    const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length] ?? 0;
    const marginTop = CARD_MARGIN_TOPS[index % CARD_MARGIN_TOPS.length] ?? 0;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onOpen(e.currentTarget.getBoundingClientRect());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(e.currentTarget.getBoundingClientRect());
      }
    };

    return (
      <div
        className={cn(
          "framed-card-reveal mx-auto w-[320px] max-w-full",
          revealVisible && "framed-card-reveal--visible"
        )}
        style={{
          marginTop,
          transitionDelay: revealVisible ? `${Math.min(index * 120, 600)}ms` : undefined,
          ["--card-rotate" as string]: `${rotation}deg`,
        }}
      >
        <button
          ref={ref}
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
          aria-expanded={active}
          aria-label={agentRole(verdict.agentId)}
          className={cn(
            "framed-card w-full cursor-pointer text-left outline-none",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--signal)]",
            hovered && !active && "framed-card--hover",
            dimmed && "framed-card--dimmed",
            active && "framed-card--hidden"
          )}
        >
          <FramedCardFront
            verdict={verdict}
            hovered={hovered}
            animatedSeverity={animatedSeverity}
          />
        </button>
      </div>
    );
  }
);
