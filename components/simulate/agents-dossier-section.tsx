"use client";

import { useState } from "react";
import type { AgentVerdict } from "@/lib/agents/types";
import { AgentDossierCard } from "@/components/simulate/agent-dossier-card";
import { AgentDossierPanel } from "@/components/simulate/agent-dossier-panel";
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelVerdict, setPanelVerdict] = useState<AgentVerdict | null>(null);

  const openPanel = (verdict: AgentVerdict) => {
    setPanelVerdict(verdict);
    setSelectedId(verdict.agentId);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedId(null);
    window.setTimeout(() => setPanelVerdict(null), 650);
  };

  return (
    <>
      <section
        id="simulate-agents"
        ref={sectionRef}
        className="scroll-mt-20 bg-[var(--bg-elevated)]"
        style={{ paddingBlock: "clamp(120px, 16vh, 180px)" }}
      >
        <div className="simulate-gutter">
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

          {mockCount > 0 && (
            <details className="mt-8 max-w-xl">
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

          <div
            className={cn(
              "mt-16 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3",
              "lg:[&>*:nth-child(3n+2)]:mt-20"
            )}
          >
            {verdicts.map((verdict, i) => (
              <DossierReveal key={verdict.agentId} index={i + 3} visible={sectionVisible}>
                <AgentDossierCard
                  verdict={verdict}
                  revealActive={sectionVisible}
                  active={selectedId === verdict.agentId}
                  onOpen={() => openPanel(verdict)}
                />
              </DossierReveal>
            ))}
          </div>
        </div>
      </section>

      <AgentDossierPanel
        verdict={panelVerdict}
        open={panelOpen}
        onClose={closePanel}
        labels={labels}
      />
    </>
  );
}
