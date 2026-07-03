"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HeroField } from "@/components/hero-field";
import { useLanguage } from "@/components/language-provider";
import { useCountUp } from "@/hooks/use-count-up";
import { useRevealOnScroll, revealStaggerDelay } from "@/hooks/use-reveal-on-scroll";
import { prefersReducedMotion, useScrollProgress } from "@/hooks/use-scroll-progress";
import { t } from "@/lib/i18n";
import {
  formatEyebrowString,
  scoreVerdictKey,
  truncateQuote,
} from "@/lib/simulate-ui";
import { cn } from "@/lib/utils";

type HeroVerdictSectionProps = {
  slogan: string;
  createdAt: string;
  score: number;
  agentQuote: string;
  campaignId?: string;
};

function ScoreArc({ score, size = 200 }: { score: number; size?: number }) {
  const radius = size * 0.6;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = (225 * Math.PI) / 180;
  const endAngle = (135 * Math.PI) / 180;
  const totalSweep = Math.PI + Math.PI / 2;
  const targetSweep = totalSweep * (score / 100);
  const [drawProgress, setDrawProgress] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDrawProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -10 * t);
      setDrawProgress(eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const arcPoint = (angle: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  });

  const start = arcPoint(startAngle);
  const end = arcPoint(endAngle);
  const activeSweep = targetSweep * drawProgress;
  const activeEndPt = arcPoint(startAngle + activeSweep);

  const fullPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 1 1 ${end.x} ${end.y}`;
  const activePath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${activeSweep > Math.PI ? 1 : 0} 1 ${activeEndPt.x} ${activeEndPt.y}`;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      <path
        d={fullPath}
        fill="none"
        stroke="var(--hairline)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d={activePath}
        fill="none"
        stroke="var(--signal)"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeroVerdictSection({
  slogan,
  createdAt,
  score,
  agentQuote,
  campaignId,
}: HeroVerdictSectionProps) {
  const { locale } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const { ref: visibleRef, visible: sectionVisible } = useRevealOnScroll<HTMLElement>();
  const scrollProgress = useScrollProgress(sectionRef);
  const animatedScore = useCountUp(score, sectionVisible, 900);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  const verdictKey = scoreVerdictKey(score);
  const verdictLabel = t(locale, verdictKey);
  const isHighRisk = score >= 70;

  const badgeOpacity = reducedMotion
    ? scrollProgress >= 0.85
      ? 1
      : 0
    : Math.min(1, Math.max(0, (scrollProgress - 0.55) / 0.35));

  const heroScoreOpacity = reducedMotion
    ? scrollProgress >= 0.85
      ? 0
      : 1
    : 1 - badgeOpacity;

  const setSectionRef = useCallback(
    (el: HTMLElement | null) => {
      sectionRef.current = el;
      visibleRef.current = el;
    },
    [visibleRef]
  );

  const ctas = [
    { href: "/", label: t(locale, "newSimulation") },
    { href: "/history", label: t(locale, "history") },
    ...(campaignId
      ? [{ href: `/branches?campaign=${campaignId}`, label: t(locale, "branchThisCampaign") }]
      : []),
  ];

  return (
    <>
      <section
        id="simulate-verdict"
        ref={setSectionRef}
        className="relative min-h-[85vh] scroll-mt-20 overflow-hidden bg-[var(--bg-base)]"
      >
        <HeroField scoreNormalized={score / 100} />
        <div className="simulate-gutter relative z-[1] flex min-h-[85vh] items-center py-12">
          <div className="grid w-full grid-cols-1 items-end gap-12 min-[900px]:grid-cols-[55fr_45fr]">
            {/* Left content */}
            <div className="max-[899px]:order-2">
              <HeroReveal index={0} visible={sectionVisible}>
                <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {formatEyebrowString(locale, createdAt, t)}
                </p>
              </HeroReveal>

              <HeroReveal index={1} visible={sectionVisible}>
                <h1 className="mt-6 font-display text-[clamp(2rem,5vw,var(--text-4xl))] font-medium leading-[var(--leading-tight)] text-[var(--ink-primary)]">
                  {slogan}
                </h1>
              </HeroReveal>

              <HeroReveal index={2} visible={sectionVisible}>
                <p className="mt-5 font-body text-[var(--text-md)] italic text-[var(--ink-secondary)]">
                  {t(locale, "diagnosisLine")}
                </p>
              </HeroReveal>

              <HeroReveal index={3} visible={sectionVisible}>
                <div
                  className="mt-12 h-px w-[120px] bg-[var(--hairline)]"
                  aria-hidden
                />
              </HeroReveal>

              <HeroReveal index={4} visible={sectionVisible}>
                <nav
                  className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[var(--text-sm)] uppercase"
                  aria-label="Simulation actions"
                >
                  {ctas.map((cta, i) => (
                    <span key={cta.href} className="inline-flex items-center gap-3">
                      {i > 0 && (
                        <span className="text-[var(--ink-tertiary)]" aria-hidden>
                          ·
                        </span>
                      )}
                      <Link
                        href={cta.href}
                        className="text-[var(--ink-tertiary)] underline decoration-[var(--ink-tertiary)] underline-offset-4 transition-colors hover:text-[var(--ink-primary)] hover:decoration-[var(--ink-primary)]"
                      >
                        {cta.label}
                      </Link>
                    </span>
                  ))}
                </nav>
              </HeroReveal>
            </div>

            {/* Score column — top on mobile, right on desktop */}
            <div
              className="relative flex flex-col items-center max-[899px]:order-1 min-[900px]:items-end min-[900px]:text-right"
              style={{
                opacity: heroScoreOpacity,
                willChange: "opacity, transform",
              }}
            >
              <div className="relative">
                <ScoreArc score={score} size={280} />
                <p
                  className="relative font-display font-normal leading-[0.9] text-[var(--ink-primary)] max-[899px]:text-[clamp(5rem,18vw,8rem)] min-[900px]:text-[var(--text-6xl)]"
                  aria-label={`${t(locale, "backfireScore")}: ${score}`}
                >
                  {animatedScore}
                </p>
              </div>
              <p className="mt-4 font-mono text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {t(locale, "backfireScoreOf100")}
              </p>
              <p
                className={cn(
                  "mt-3 font-mono text-[var(--text-lg)] font-medium uppercase tracking-wide",
                  isHighRisk ? "text-[var(--signal)]" : "text-[var(--ink-primary)]"
                )}
              >
                {verdictLabel}
              </p>
              {agentQuote && (
                <p className="mt-4 max-w-sm font-display text-[var(--text-sm)] italic leading-relaxed text-[var(--ink-secondary)] min-[900px]:ml-auto">
                  &ldquo;{truncateQuote(agentQuote)}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sticky score badge */}
      <div
        className="pointer-events-none fixed z-[var(--z-sticky)] font-mono"
        style={{
          top: 16,
          right: 24,
          opacity: badgeOpacity,
          transform: `scale(${0.85 + badgeOpacity * 0.15})`,
          willChange: "transform, opacity",
        }}
        aria-hidden={badgeOpacity < 0.5}
      >
        <span className="text-[var(--text-lg)] tabular-nums text-[var(--ink-primary)]">
          {t(locale, "backfireBadge").replace("{score}", String(score))}
        </span>
      </div>
    </>
  );
}

function HeroReveal({
  index,
  visible,
  children,
}: {
  index: number;
  visible: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("reveal-on-scroll", visible && "reveal-on-scroll--visible")}
      style={{ transitionDelay: visible ? revealStaggerDelay(index) : undefined }}
    >
      {children}
    </div>
  );
}
