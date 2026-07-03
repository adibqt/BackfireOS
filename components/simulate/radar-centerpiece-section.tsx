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
import { axisInterpretationKey } from "@/lib/simulate-ui";
import type { RunScores } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

const RADAR_SIZE = 640;
const RADAR_R = DEFAULT_RADAR_R * (RADAR_SIZE / 400);
const CALLOUT_EXT = 72;

type RadarCenterpieceSectionProps = {
  scores: RunScores;
  labels: Record<string, string>;
};

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
        <RadarReveal index={0} visible={sectionVisible}>
          <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
            {t(locale, "riskDimensionRadar")}
          </p>
        </RadarReveal>

        <RadarReveal index={1} visible={sectionVisible}>
          <h2 className="mt-4 max-w-xl font-display text-[var(--text-3xl)] font-medium leading-[var(--leading-tight)] text-[var(--ink-primary)]">
            {t(locale, "sixAxesOneSilhouette")}
          </h2>
        </RadarReveal>

        <div className="relative mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_auto]">
          <div className="relative mx-auto w-full max-w-[640px] lg:mx-0 lg:-translate-x-4">
            <RadarReveal index={2} visible={sectionVisible}>
              <div className="relative">
                <ScoreRadar
                  scores={scores}
                  labels={labels}
                  size={RADAR_SIZE}
                  showChrome={false}
                />

                {/* Blueprint callouts overlay */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                  viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
                  aria-hidden
                >
                  {metrics.map((m, i) => {
                    const [vx, vy] = radarPolar(CX, CY, RADAR_R, i, count);
                    const [lx, ly] = radarPolar(CX, CY, RADAR_R + CALLOUT_EXT, i, count);
                    const dx = lx - CX;
                    const anchor: "start" | "middle" | "end" =
                      Math.abs(dx) < 8 ? "middle" : dx > 0 ? "start" : "end";
                    const interpretation = t(
                      locale,
                      axisInterpretationKey(m.display)
                    );

                    return (
                      <g key={m.key}>
                        <line
                          x1={vx}
                          y1={vy}
                          x2={lx}
                          y2={ly}
                          stroke="var(--hairline)"
                          strokeWidth={1}
                        />
                        <foreignObject
                          x={anchor === "end" ? lx - 120 : anchor === "start" ? lx : lx - 60}
                          y={ly - 28}
                          width={120}
                          height={72}
                        >
                          <RadarCalloutLabel
                            name={m.label}
                            score={Math.round(m.display)}
                            interpretation={interpretation}
                            active={sectionVisible}
                            index={i + 3}
                          />
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </RadarReveal>
          </div>

          <RadarReveal index={3} visible={sectionVisible} className="lg:max-w-[320px]">
            <blockquote className="font-display text-[var(--text-2xl)] italic leading-snug text-[var(--ink-primary)]">
              &ldquo;{pullQuote}&rdquo;
            </blockquote>
          </RadarReveal>
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
    </section>
  );
}

function RadarCalloutLabel({
  name,
  score,
  interpretation,
  active,
  index,
}: {
  name: string;
  score: number;
  interpretation: string;
  active: boolean;
  index: number;
}) {
  const animatedScore = useCountUp(score, active, 600);

  return (
    <div
      className={cn(
        "reveal-on-scroll flex flex-col gap-0.5",
        active && "reveal-on-scroll--visible"
      )}
      style={{ transitionDelay: active ? revealStaggerDelay(index) : undefined }}
    >
      <span className="font-mono text-[var(--text-xs)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
        {name}
      </span>
      <span className="font-mono text-[var(--text-xl)] font-medium tabular-nums text-[var(--ink-primary)]">
        {animatedScore}
      </span>
      <span className="font-display text-[var(--text-sm)] italic text-[var(--ink-secondary)]">
        {interpretation}
      </span>
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
