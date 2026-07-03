"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { HeroCursorCrack } from "@/components/hero-cursor-crack";
import { HeroScoreGauge } from "@/components/hero-score-gauge";
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

const Hero3DLayer = dynamic(
  () => import("@/components/hero-3d-layer").then((m) => m.Hero3DLayer),
  { ssr: false, loading: () => null }
);

type HeroVerdictSectionProps = {
  slogan: string;
  createdAt: string;
  score: number;
  agentQuote: string;
  campaignId?: string;
};

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
        <Hero3DLayer scrollProgress={scrollProgress} containerRef={sectionRef} />
        <HeroCursorCrack containerRef={sectionRef} />

        <div className="simulate-gutter relative z-[2] flex min-h-[85vh] items-center py-12">
          <div className="grid w-full grid-cols-1 items-end gap-12 min-[900px]:grid-cols-[42fr_58fr]">
            <div className="max-[899px]:order-2">
              <HeroReveal index={0} visible={sectionVisible}>
                <p className="font-mono text-[var(--text-sm)] uppercase tracking-[0.1em] text-[var(--ink-tertiary)]">
                  {formatEyebrowString(locale, createdAt, t)}
                </p>
              </HeroReveal>

              <HeroReveal index={1} visible={sectionVisible}>
                <h1 className="mt-6 font-display text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[var(--leading-tight)] text-[var(--ink-primary)]">
                  {slogan}
                </h1>
              </HeroReveal>

              <HeroReveal index={2} visible={sectionVisible}>
                <p className="mt-5 font-body text-[var(--text-md)] italic text-[var(--ink-secondary)]">
                  {t(locale, "diagnosisLine")}
                </p>
              </HeroReveal>

              <HeroReveal index={3} visible={sectionVisible}>
                <div className="mt-12 flex justify-start" aria-hidden>
                  <div className="h-10 w-px bg-[var(--hairline)]" />
                </div>
              </HeroReveal>

              <HeroReveal index={4} visible={sectionVisible}>
                <nav
                  className="mt-8 flex flex-wrap items-center gap-6 font-mono text-[var(--text-base)] uppercase"
                  aria-label="Simulation actions"
                >
                  {ctas.map((cta, i) => (
                    <span key={cta.href} className="inline-flex items-center gap-6">
                      {i > 0 && (
                        <span
                          className="h-3 w-px shrink-0 bg-[var(--hairline)]"
                          aria-hidden
                        />
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

            <div
              className="relative flex w-full flex-col items-center max-[899px]:order-1"
              style={{
                opacity: heroScoreOpacity,
                willChange: "opacity, transform",
              }}
            >
              <div className="relative flex aspect-square w-[min(100%,28rem)] max-w-[480px] items-center justify-center sm:w-[min(100%,32rem)]">
                <HeroScoreGauge score={score} size={480} />
                <p
                  className="hero-score-breathe relative text-center font-display font-light leading-[0.85] tracking-[-0.04em] text-[var(--ink-primary)] text-[clamp(12rem,22vw,20rem)]"
                  aria-label={`${t(locale, "backfireScore")}: ${score}`}
                >
                  {animatedScore}
                </p>
              </div>

              <p className="mt-4 text-center font-mono text-[var(--text-xs)] uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                {t(locale, "backfireScoreOf100")}
              </p>
              <p
                className={cn(
                  "mt-3 text-center font-mono text-[var(--text-lg)] font-medium uppercase tracking-wide",
                  isHighRisk ? "text-[var(--signal)]" : "text-[var(--ink-primary)]"
                )}
              >
                {verdictLabel}
              </p>
              {agentQuote && (
                <p className="mt-4 max-w-[420px] text-center font-display text-[var(--text-sm)] italic leading-[var(--leading-relaxed)] text-[var(--ink-secondary)]">
                  &ldquo;{truncateQuote(agentQuote, 140)}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div
        className="pointer-events-none fixed z-50 font-display"
        style={{
          top: 16,
          right: 24,
          opacity: badgeOpacity,
          transform: `scale(${0.85 + badgeOpacity * 0.15})`,
          willChange: "transform, opacity",
        }}
        aria-hidden={badgeOpacity < 0.5}
      >
        <span className="text-[var(--text-lg)] font-light tabular-nums tracking-[-0.04em] text-[var(--ink-primary)]">
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
