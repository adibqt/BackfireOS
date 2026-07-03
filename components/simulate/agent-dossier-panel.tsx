"use client";

import { useEffect, useRef } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import { useFocusTrap } from "@/components/ui/reveal-on-scroll";
import { useLanguage } from "@/components/language-provider";
import { agentRole, severityBarColor } from "@/lib/agent-display";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AgentDossierPanelProps = {
  verdict: AgentVerdict | null;
  open: boolean;
  onClose: () => void;
  labels: {
    severity: string;
    reasoning: string;
    sampleAttack: string;
  };
};

export function AgentDossierPanel({
  verdict,
  open,
  onClose,
  labels,
}: AgentDossierPanelProps) {
  const { locale } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!verdict && !open) return null;

  const fillColor = verdict ? severityBarColor(verdict.severity) : "var(--hairline)";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[var(--z-modal-backdrop)]",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
      role="presentation"
    >
      <button
        type="button"
        aria-label={t(locale, "closePanel")}
        className={cn(
          "absolute inset-0 bg-[rgba(15,14,12,0.5)] transition-opacity duration-[var(--dur-mid)]",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-panel-title"
        className={cn(
          "fixed top-0 right-0 z-[var(--z-modal)] flex h-[100vh] w-full max-w-[480px] flex-col border-l border-[var(--hairline)] bg-[var(--bg-base)] transition-transform duration-[var(--dur-mid)]",
          open ? "translate-x-0" : "translate-x-full"
        )}
        style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {verdict && (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] px-6 py-5">
              <div>
                <h2
                  id="dossier-panel-title"
                  className="font-display text-[var(--text-2xl)] font-medium text-[var(--ink-primary)]"
                >
                  {verdict.agentName}
                </h2>
                <p className="mt-1 font-mono text-[var(--text-xs)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {agentRole(verdict.agentId)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="font-mono text-[var(--text-xl)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]"
                aria-label={t(locale, "closePanel")}
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="mb-8">
                <p className="mb-2 font-mono text-[var(--text-xs)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {labels.severity}
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden bg-[var(--hairline)]">
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${verdict.severity}%`,
                        backgroundColor: fillColor,
                      }}
                    />
                  </div>
                  <span className="font-mono text-[var(--text-sm)] tabular-nums text-[var(--ink-primary)]">
                    {Math.round(verdict.severity)}
                  </span>
                </div>
              </div>

              <div className="mb-8">
                <p className="mb-3 font-mono text-[var(--text-xs)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {labels.reasoning}
                </p>
                <p className="text-[var(--text-md)] leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
                  {verdict.reasoning}
                </p>
              </div>

              <div>
                <p className="mb-3 font-mono text-[var(--text-xs)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {labels.sampleAttack}
                </p>
                <blockquote className="bg-[var(--bg-inset)] p-6 font-mono text-[var(--text-sm)] leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
                  {verdict.sampleAttack}
                </blockquote>
              </div>

              {verdict.citationIds.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {verdict.citationIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-sm border border-[var(--hairline)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[var(--text-xs)] text-[var(--ink-tertiary)]"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
