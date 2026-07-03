"use client";

import { useLanguage } from "@/components/language-provider";
import {
  ScoreRadar,
  buildRadarMetrics,
  radarPolar,
  DEFAULT_RADAR_R,
} from "@/components/score-radar";
import { useCountUp } from "@/hooks/use-count-up";
import { useRevealOnScroll, revealStaggerDelay } from "@/hooks/use-reveal-on-scroll";
import { t } from "@/lib/i18n";
import { axisDescriptionKey, axisInterpretationKey } from "@/lib/simulate-ui";
import type { RunScores } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

const RADAR_SIZE = 640;
const RADAR_R = DEFAULT_RADAR_R * (RADAR_SIZE / 400);
const CALLOUT_EXT = 88;

type RadarCenterpieceSectionProps = {
  scores: RunScores;
  labels: Record<string, string>;
};

type CalloutAnchor = "start" | "middle" | "end";

function calloutTransform(_anchor: CalloutAnchor): string {
  return "translate(-50%, -50%)";
}

export function RadarCenterpieceSection({
  scores,
  labels,
}: RadarCenterpieceSectionProps) {
  const { locale } = useLanguage();
  const { ref: sectionRef, visible: sectionVisible } = useRevealOnScroll<HTMLElement>();
  const metrics = buildRadarMetrics(scores, labels);
  const count = metrics.length;
  const CX = RADAR_SIZE / 2;
  const CY = RADAR_SIZE / 2;

  const headline = metrics.reduce((acc, m) => (m.value > acc.value ? m : acc), metrics[0]);
  const pullQuote = t(locale, "highestRiskAxisQuote")
    .replace("{dimension}", headline.label)
    .replace("{score}", String(Math.round(headline.display)));

  return (
    <section
      id="simulate-radar"
      ref={sectionRef}
      className="relative min-h-[100vh] scroll-mt-20 bg-[var(--bg-base)]"
      style={{ paddingBlock: "160px" }}
    >
      <div className="simulate-gutter">
        {/* Radar */}
        <div className="relative mx-auto w-full max-w-[640px] lg:mx-0">
          <RadarReveal index={0} visible={sectionVisible}>
            <div className="relative aspect-square w-full">
              <ScoreRadar
                scores={scores}
                labels={labels}
                size={RADAR_SIZE}
                showChrome={false}
              />

              {/* Connector lines */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                aria-hidden
              >
                {metrics.map((m, i) => {
                  const [vx, vy] = radarPolar(CX, CY, RADAR_R, i, count);
                  const [lx, ly] = radarPolar(CX, CY, RADAR_R + CALLOUT_EXT, i, count);
                  return (
                    <line
                      key={m.key}
                      x1={vx}
                      y1={vy}
                      x2={lx}
                      y2={ly}
                      stroke="var(--hairline)"
                      strokeWidth={1}
                    />
                  );
                })}
              </svg>

              {/* HTML callouts — avoids foreignObject clipping */}
              {metrics.map((m, i) => {
                const [lx, ly] = radarPolar(CX, CY, RADAR_R + CALLOUT_EXT, i, count);
                const interpretation = t(locale, axisInterpretationKey(m.display));
                const description = t(locale, axisDescriptionKey(m.key));

                return (
                  <div
                    key={m.key}
                    className="absolute z-10"
                    style={{
                      left: `${(lx / RADAR_SIZE) * 100}%`,
                      top: `${(ly / RADAR_SIZE) * 100}%`,
                      transform: calloutTransform("middle"),
                    }}
                  >
                    <RadarAxisCallout
                      name={m.label}
                      score={Math.round(m.display)}
                      interpretation={interpretation}
                      description={description}
                      active={sectionVisible}
                      index={i + 1}
                    />
                  </div>
                );
              })}
            </div>
          </RadarReveal>
        </div>

        {/* Mobile / tablet heading */}
        <div className="mt-16 lg:hidden">
          <RadarHeadingBlock
            locale={locale}
            pullQuote={pullQuote}
            visible={sectionVisible}
            revealStart={1}
          />
        </div>

        <details className="mt-16 max-w-2xl">
          <summary className="cursor-pointer font-mono text-[var(--text-sm)] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink-primary)]">
            {t(locale, "howToReadThis")}
          </summary>
          <p className="mt-4 text-[var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
            {t(locale, "radarHowToReadBody")}
          </p>
        </details>
      </div>

      {/* Desktop heading — pinned to right page margin */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-[min(440px,34vw)] flex-col justify-center text-right lg:flex"
        style={{ paddingRight: "clamp(24px, 6vw, 96px)" }}
      >
        <div className="pointer-events-auto">
          <RadarHeadingBlock
            locale={locale}
            pullQuote={pullQuote}
            visible={sectionVisible}
            revealStart={1}
          />
        </div>
      </div>
    </section>
  );
}

function RadarHeadingBlock({
  locale,
  pullQuote,
  visible,
  revealStart,
}: {
  locale: "en" | "bn";
  pullQuote: string;
  visible: boolean;
  revealStart: number;
}) {
  return (
    <>
      <RadarReveal index={revealStart} visible={visible}>
        <h2 className="font-display text-[clamp(1.875rem,3.25vw,3rem)] font-medium leading-[var(--leading-tight)] text-[var(--ink-primary)]">
          {t(locale, "riskDimensionRadar")}
        </h2>
        <p className="mt-5 font-display text-[clamp(1.75rem,3.5vw,3rem)] italic leading-[var(--leading-tight)] text-[var(--ink-secondary)]">
          {t(locale, "sixAxesOneSilhouette")}
        </p>
      </RadarReveal>

      <RadarReveal index={revealStart + 1} visible={visible} className="mt-12">
        <blockquote className="font-display text-[var(--text-xl)] italic leading-snug text-[var(--ink-primary)] lg:text-[var(--text-2xl)]">
          &ldquo;{pullQuote}&rdquo;
        </blockquote>
      </RadarReveal>
    </>
  );
}

function RadarAxisCallout({
  name,
  score,
  interpretation,
  description,
  active,
  index,
}: {
  name: string;
  score: number;
  interpretation: string;
  description: string;
  active: boolean;
  index: number;
}) {
  const animatedScore = useCountUp(score, active, 600);

  return (
    <div
      className={cn(
        "simulate-radar-callout group relative min-w-[150px] max-w-[200px] cursor-default rounded-sm px-2 py-1 text-center outline-none focus-within:ring-2 focus-within:ring-[var(--signal)] focus-within:ring-offset-2",
        "reveal-on-scroll",
        active && "reveal-on-scroll--visible"
      )}
      style={{ transitionDelay: active ? revealStaggerDelay(index) : undefined }}
      tabIndex={0}
      role="group"
      aria-label={`${name}: ${score}`}
    >
      <span className="block font-mono text-[var(--text-sm)] uppercase leading-tight tracking-[0.08em] text-[var(--ink-tertiary)]">
        {name}
      </span>
      <span className="mx-auto mt-1 block w-full text-center font-mono text-[var(--text-4xl)] font-semibold tabular-nums leading-none text-[var(--signal)]">
        {animatedScore}
      </span>
      <span className="mt-1 block font-display text-[var(--text-base)] italic leading-tight text-[var(--ink-secondary)]">
        {interpretation}
      </span>

      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-52 -translate-x-1/2 rounded-sm border border-[var(--hairline)] bg-[var(--bg-elevated)] p-3 text-left shadow-[var(--shadow-card)]",
          "opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
          {name}
        </p>
        <p className="mt-2 text-[var(--text-sm)] leading-[var(--leading-normal)] text-[var(--ink-primary)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function RadarReveal({
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
