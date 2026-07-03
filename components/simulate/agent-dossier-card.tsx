"use client";

import { useState } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import { AgentPortrait } from "@/components/agent-portrait";
import { useCountUp } from "@/hooks/use-count-up";
import { agentRole, severityBarColor } from "@/lib/agent-display";
import { cn } from "@/lib/utils";

type AgentDossierCardProps = {
  verdict: AgentVerdict;
  active?: boolean;
  revealActive?: boolean;
  onOpen: () => void;
};

export function AgentDossierCard({
  verdict,
  active = false,
  revealActive = true,
  onOpen,
}: AgentDossierCardProps) {
  const [hovered, setHovered] = useState(false);
  const animatedSeverity = useCountUp(Math.round(verdict.severity), revealActive, 600);
  const fillColor = severityBarColor(verdict.severity);
  const fillHeight = `${Math.min(100, Math.max(0, verdict.severity))}%`;

  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative w-full cursor-pointer text-left transition-[transform,box-shadow] duration-[400ms]",
        "hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
        active && "ring-1 ring-[var(--hairline)]"
      )}
      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
      aria-expanded={active}
    >
      <div className="relative flex gap-2">
        <div className="min-w-0 flex-1">
          <AgentPortrait agentId={verdict.agentId} hovered={hovered} />
          <div className="mt-5 pr-2">
            <h3 className="font-display text-[var(--text-xl)] font-medium text-[var(--ink-primary)]">
              {verdict.agentName}
            </h3>
            <p className="mt-1 font-mono text-[var(--text-xs)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
              {agentRole(verdict.agentId)}
            </p>
            {verdict.source === "mock" && (
              <span className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--ink-tertiary)]">
                Demo
              </span>
            )}
          </div>
        </div>

        <div className="relative flex w-4 shrink-0 flex-col items-center">
          <div
            className="relative h-[240px] w-1 bg-[var(--hairline)]"
            style={{ width: 4 }}
            aria-hidden
          >
            <div
              className="absolute bottom-0 left-0 w-full transition-[height] duration-[600ms]"
              style={{
                height: fillHeight,
                backgroundColor: fillColor,
                transitionTimingFunction: "var(--ease-out-expo)",
              }}
            />
          </div>
          <span className="mt-2 font-mono text-[var(--text-sm)] tabular-nums text-[var(--ink-primary)]">
            {animatedSeverity}
          </span>
        </div>
      </div>
    </button>
  );
}
