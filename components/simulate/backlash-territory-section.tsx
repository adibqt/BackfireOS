"use client";

import Link from "next/link";
import type { AgentVerdict, CulturalStressMap } from "@/lib/agents/types";
import {
  CulturalHeatmap,
  CulturalHeatmapEmpty,
} from "@/components/cultural-heatmap";
import { PolarizationGraph, buildGraph } from "@/components/polarization-graph";
import { useRevealOnScroll, revealStaggerDelay } from "@/hooks/use-reveal-on-scroll";
import {
  citationPairNote,
  dashedLineLegend,
  lineLegendHeading,
  mapDetailsSummary,
  networkDetailsIntro,
  pileOnHeading,
  pileOnSub,
  polarizationSpreadNote,
  severityPairNote,
  similarSeverityLabel,
  sameTriggerLabel,
  solidLineLegend,
  spreadScoreHint,
  spreadScoreLabel,
} from "@/lib/backlash-copy";
import { MARKET_CATALOG } from "@/lib/markets/catalog";
import { highestRiskRegion, countFlaggedMarkets } from "@/lib/cultural-stress-map";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type BacklashTerritorySectionProps = {
  verdicts: AgentVerdict[];
  polarizationCoefficient: number;
  campaignSlogan: string;
  culturalStressMap?: CulturalStressMap | null;
  runId: string;
  locale: Locale;
};

function SectionReveal({
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

export function BacklashTerritorySection({
  verdicts,
  polarizationCoefficient,
  campaignSlogan,
  culturalStressMap,
  runId,
  locale,
}: BacklashTerritorySectionProps) {
  const { ref: sectionRef, visible: sectionVisible } = useRevealOnScroll<HTMLElement>();

  const { nodes, edges } =
    verdicts.length > 0 ? buildGraph(verdicts, campaignSlogan) : { nodes: [], edges: [] };
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const crossEdges = edges
    .filter((e) => e.kind !== "spoke")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const coampColor =
    polarizationCoefficient >= 25
      ? "var(--signal)"
      : polarizationCoefficient >= 12
        ? "var(--warning)"
        : "var(--success)";

  const flaggedCount = culturalStressMap
    ? countFlaggedMarkets(culturalStressMap)
    : 0;

  return (
    <section
      id="simulate-backlash"
      ref={sectionRef}
      className="scroll-mt-20 bg-[var(--bg-base)]"
      style={{ paddingBlock: "clamp(120px, 14vh, 160px)" }}
    >
      <div className="simulate-gutter">
        <SectionReveal index={0} visible={sectionVisible}>
          <p className="simulate-eyebrow font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
            {t(locale, "backlashTerritoryEyebrow")}
          </p>
        </SectionReveal>

        <SectionReveal index={1} visible={sectionVisible}>
          <h2 className="mt-4 font-display text-[var(--text-3xl)] font-medium leading-[var(--leading-tight)] text-[var(--ink-primary)]">
            {t(locale, "whereItLandsHeading")}
          </h2>
        </SectionReveal>

        <div className="mt-16 flex flex-col gap-12">
          <article
            id="simulate-network"
            className="simulate-panel--warm scroll-mt-20 rounded-[2px] border border-[var(--hairline)] bg-[var(--bg-inset)] p-6 sm:p-8 lg:p-10"
          >
            <div className="border-l-2 border-[var(--signal)] pl-4 sm:pl-5">
              <SectionReveal index={2} visible={sectionVisible}>
                <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {t(locale, "coAmplificationEyebrow")}
                </p>
                <h3 className="mt-3 font-display text-[var(--text-xl)] font-medium text-[var(--ink-primary)] sm:text-[var(--text-2xl)]">
                  {t(locale, "backlashPropagationHeading")}
                </h3>
                <p className="mt-3 max-w-xl font-display text-[var(--text-base)] italic text-[var(--ink-secondary)] sm:mt-4 sm:text-[var(--text-md)]">
                  {t(locale, "backlashPullQuote")}
                </p>
              </SectionReveal>
            </div>

            <SectionReveal index={3} visible={sectionVisible} className="mt-8 flex justify-center sm:mt-10">
              <div className="w-full max-w-[min(100%,340px)]">
                <PolarizationGraph
                  verdicts={verdicts}
                  polarizationCoefficient={polarizationCoefficient}
                  campaignSlogan={campaignSlogan}
                  embedded
                />
              </div>
            </SectionReveal>

            <details className="mt-8 max-w-xl sm:mt-10">
              <summary className="cursor-pointer font-mono text-[var(--text-sm)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]">
                {t(locale, "detailsCollapsible")}
              </summary>
              <div className="mt-4 space-y-6 text-[var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
                <p>{networkDetailsIntro(locale)}</p>
                <div>
                  <p className="font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--ink-tertiary)]">
                    {spreadScoreLabel(locale)}
                  </p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span
                      className="font-display text-[var(--text-3xl)] font-medium"
                      style={{ color: coampColor }}
                    >
                      {polarizationCoefficient}
                    </span>
                    <span className="text-[var(--text-sm)]">
                      {t(locale, "spreadScore")}{" "}
                      <span className="text-[var(--ink-tertiary)]">
                        {spreadScoreHint(locale)}
                      </span>
                    </span>
                  </div>
                  <p className="mt-2 text-[var(--text-sm)]">
                    {polarizationSpreadNote(locale, polarizationCoefficient)}
                  </p>
                </div>
                {crossEdges.length > 0 && (
                  <div>
                    <p className="font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--ink-tertiary)]">
                      {pileOnHeading(locale)}
                    </p>
                    <p className="mt-1 text-[var(--text-sm)]">{pileOnSub(locale)}</p>
                    <ul className="mt-4 space-y-3">
                      {crossEdges.map((e) => {
                        const src = byId.get(e.src);
                        const tgt = byId.get(e.tgt);
                        if (!src || !tgt) return null;
                        const isCitation = e.kind === "citation";
                        return (
                          <li
                            key={`${e.src}-${e.tgt}`}
                            className="border-t border-[var(--hairline)] pt-3"
                          >
                            <p className="text-[var(--ink-primary)]">
                              {src.fullName} &amp; {tgt.fullName}
                            </p>
                            <p className="mt-1 font-mono text-[var(--text-xs)] text-[var(--ink-tertiary)]">
                              {isCitation
                                ? sameTriggerLabel(locale)
                                : similarSeverityLabel(locale)}
                            </p>
                            <p className="mt-1 text-[var(--text-sm)]">
                              {isCitation
                                ? citationPairNote(locale)
                                : severityPairNote(locale)}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="font-mono text-[var(--text-xs)] uppercase tracking-wider text-[var(--ink-tertiary)]">
                    {lineLegendHeading(locale)}
                  </p>
                  <ul className="mt-3 space-y-2 text-[var(--text-sm)]">
                    <li>{solidLineLegend(locale)}</li>
                    <li>{dashedLineLegend(locale)}</li>
                  </ul>
                </div>
              </div>
            </details>
          </article>

          <article
            id="simulate-territory"
            className="simulate-panel--cool scroll-mt-20 rounded-[2px] border border-[var(--hairline)] bg-[var(--bg-elevated)] p-6 sm:p-8 lg:p-10"
          >
            <div className="border-l-2 border-[var(--data-cool)] pl-4 sm:pl-5">
              <SectionReveal index={4} visible={sectionVisible}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                      {t(locale, "culturalStressEyebrow")}
                    </p>
                    <h3 className="mt-3 font-display text-[var(--text-xl)] font-medium text-[var(--ink-primary)] sm:text-[var(--text-2xl)]">
                      {t(locale, "marketsMisfireHeading")}
                    </h3>
                  </div>
                  {culturalStressMap && (
                    <Link
                      href={`/heatmap?runId=${runId}`}
                      className="font-mono text-[var(--text-sm)] text-[var(--ink-primary)] underline decoration-[var(--ink-tertiary)] underline-offset-4 transition-colors hover:text-[var(--signal)] hover:decoration-[var(--signal)]"
                    >
                      {t(locale, "openFullStressMap")} →
                    </Link>
                  )}
                </div>
              </SectionReveal>
            </div>

            <SectionReveal index={5} visible={sectionVisible} className="mt-8 sm:mt-10">
              <div className="simulate-heatmap-embed max-h-[min(72vh,640px)] overflow-x-auto overflow-y-auto overscroll-contain">
                {culturalStressMap ? (
                  <CulturalHeatmap
                    stressMap={culturalStressMap}
                    locale={locale}
                    compact
                    defaultRegion={highestRiskRegion(culturalStressMap)}
                  />
                ) : (
                  <CulturalHeatmapEmpty locale={locale} />
                )}
              </div>
            </SectionReveal>

            <details className="mt-8 max-w-md sm:mt-10">
              <summary className="cursor-pointer font-mono text-[var(--text-sm)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]">
                {t(locale, "howToReadThis")}
              </summary>
              <p className="mt-4 text-[var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
                {t(locale, "stressMapDescription")}
              </p>
              {culturalStressMap && (
                <p className="mt-3 font-mono text-[var(--text-sm)] text-[var(--ink-tertiary)]">
                  {mapDetailsSummary(locale, MARKET_CATALOG.length, flaggedCount)}
                </p>
              )}
            </details>
          </article>
        </div>
      </div>
    </section>
  );
}
