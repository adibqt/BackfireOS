import { t, type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

const FEATURE_BLURBS: Record<
  "heatmap" | "branches" | "boardroom" | "postMortem",
  { label: string; bullets: string[] }
> = {
  heatmap: {
    label: "Cultural Stress Map",
    bullets: [
      "City-by-city severity heatmap",
      "Dhaka · Sylhet · Chittagong drill-down",
      "Trigger-phrase highlighting",
    ],
  },
  branches: {
    label: "Counterfactual Branching",
    bullets: [
      "Git-style campaign forks",
      "Real-time Backfire & Resonance deltas",
      "A/B + multivariate previews",
    ],
  },
  boardroom: {
    label: "Multi-Agent Debate",
    bullets: [
      "Activist · Brand Manager · Journalist personas",
      "Live transcript stream",
      "Synthesis & decision log",
    ],
  },
  postMortem: {
    label: "Regulatory Pre-Mortem",
    bullets: [
      "Auto-generated apology draft",
      "Essential Commodities Act 2025 lookup",
      "Crisis-comm playbook export",
    ],
  },
};

export function PlaceholderFeature({
  locale,
  titleKey,
  description,
}: {
  locale: Locale;
  titleKey: "heatmap" | "branches" | "boardroom" | "postMortem";
  description: string;
}) {
  const blurb = FEATURE_BLURBS[titleKey];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-surface)]">
        {/* Aurora glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--aurora-1),transparent_70%)]"
        />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />

        <div className="relative grid items-center gap-10 px-8 py-14 md:grid-cols-[1.2fr_1fr] md:px-12 md:py-20">
          <div>
            <Badge variant="accent" dot className="mb-5">
              {t(locale, "comingSoon")}
            </Badge>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
              {blurb.label}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl lg:text-5xl">
              {t(locale, titleKey)}
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
              {description}
            </p>
            <ul className="mt-6 space-y-2.5">
              {blurb.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-[14px] text-[var(--fg-muted)]"
                >
                  <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/" variant="primary" size="md">
                {t(locale, "newSimulation")}
              </ButtonLink>
              <ButtonLink href="/history" variant="secondary" size="md">
                View history
              </ButtonLink>
            </div>
          </div>

          {/* Skeleton preview */}
          <div className="relative">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-xl)]">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--accent)]/40" />
                <div className="h-2 w-2 rounded-full bg-[var(--warning)]/40" />
                <div className="h-2 w-2 rounded-full bg-[var(--success)]/40" />
                <div className="ml-auto h-2 w-16 rounded-full bg-[var(--bg-elevated)]" />
              </div>
              <div className="space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="shimmer h-10 rounded-lg"
                    style={{ animationDelay: `${i * 150}ms`, width: `${100 - i * 8}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="shimmer h-16 rounded-lg"
                    style={{ animationDelay: `${(i + 5) * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
