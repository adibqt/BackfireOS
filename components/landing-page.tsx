import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ScoreRadar } from "@/components/score-radar";
import { LogoBadge } from "@/components/logo";
import type { RunScores } from "@/lib/agents/types";

const AGENTS = [
  { id: "regulatory_activist", name: "Cultural / Regulatory Activist", role: "Flags religion, labor, gender and compliance tripwires before legal does.", initials: "RA", weight: 1.4, tone: "from-fuchsia-500/30 to-indigo-500/10" },
  { id: "cynical_journalist", name: "Cynical Journalist", role: "Writes the most damaging plausible headline a desk editor would run.", initials: "CJ", weight: 1.3, tone: "from-emerald-500/25 to-teal-500/10" },
  { id: "meme_engineer", name: "Dhaka Meme Engineer", role: "Spots viral parody potential and awkward Banglish slogan misfires.", initials: "ME", weight: 1.2, tone: "from-rose-500/30 to-amber-500/10" },
  { id: "brand_purist", name: "Brand Purist", role: "Audits drift against your brand's canonical values and history.", initials: "BP", weight: 1.2, tone: "from-sky-500/30 to-cyan-500/10" },
  { id: "rival_brand", name: "Rival Brand Social Team", role: "Shows exactly how a competitor would hijack the slogan against you.", initials: "RB", weight: 1.1, tone: "from-orange-500/30 to-rose-500/10" },
  { id: "regional_outsider", name: "Regional Outsider", role: "Reads it from Dhaka, Sylhet, Chittagong and rural Bangladesh.", initials: "RO", weight: 1.0, tone: "from-violet-500/30 to-sky-500/10" },
] as const;

const MAX_WEIGHT = 1.4;

const SAMPLE_SCORES: RunScores = {
  backfireScore: 78,
  resonance: 42,
  backfireRisk: 88,
  memeability: 71,
  brandSafetyDrift: 35,
  polarizationCoefficient: 64,
};

const RADAR_LABELS = {
  backfireScore: "Backfire Score",
  resonance: "Resonance",
  backfireRisk: "Backfire Risk",
  memeability: "Memeability",
  brandSafetyDrift: "Brand-Safety Drift",
  polarization: "Polarization",
};

const STEPS = [
  { n: "01", title: "Submit your brief", desc: "Drop in a slogan, brand values, brief and an optional visual. Bangla or English." },
  { n: "02", title: "Six agents attack", desc: "A weighted panel of adversarial personas stress-tests it in parallel, grounded in Banglish RAG." },
  { n: "03", title: "Score, fork, ship", desc: "Six composite metrics, parody memes, a cultural heatmap and counterfactual branches." },
] as const;

const MODES = [
  { href: "/heatmap", title: "Cultural Heat Map", desc: "City-by-city severity overlay across Bangladesh.", status: "live", icon: <><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.95 8 11.7z" /></> },
  { href: "/branches", title: "Counterfactual Branching", desc: "Git for campaigns. Fork, tweak, watch the scores shift.", status: "live", icon: <><circle cx="6" cy="3" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M6 5.5v10" /><path d="M18 9c0 3-4 4-12 4" /></> },
  { href: "/boardroom", title: "Boardroom Mode", desc: "Watch synthetic personas debate your campaign live.", status: "preview", icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { href: "/post-mortem", title: "Regulatory Pre-Mortem", desc: "Auto-drafts the apology your brand would publish later.", status: "preview", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></> },
] as const;

const CAPABILITIES = [
  { title: "Brand-consistency audit", desc: "The Brand Purist remembers prior campaigns and flags when a new one contradicts your stated values." },
  { title: "Multimodal vision", desc: "Upload the visual. Gemini parses it and every persona reasons over the image, not just the copy." },
  { title: "Banglish RAG", desc: "Each verdict retrieves from ~20K code-mixed sentiment samples, with citations back to the source rows." },
  { title: "Persistent history", desc: "Every run, verdict and meme is saved per-account with row-level security. Revisit and compare any time." },
  { title: "Streaming verdicts", desc: "Verdicts land over Server-Sent Events as each agent finishes. No waiting for the full panel." },
  { title: "Works key-free", desc: "Demo mode runs the whole flow with mock verdicts and placeholder memes. No API key, no signup." },
] as const;

export function LandingPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-x-clip pb-20 pt-6 text-center md:pb-24 md:pt-14">
        {/* Aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[640px] w-[min(100vw,1100px)] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_55%_at_50%_0%,rgba(255,77,87,0.28),transparent_70%)] blur-3xl"
        />
        {/* Faded grid */}
        <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[640px] opacity-60" aria-hidden />

        <div className="mx-auto max-w-3xl">
          <div className="mx-auto inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev-1)]/60 py-1 pl-1 pr-3 text-[12px] backdrop-blur fade-up">
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
              Preview
            </span>
            <span className="text-[var(--fg-muted)]">
              MarTech Track 2 · BuildFest 2026
            </span>
          </div>

          <h1
            className="mt-8 font-display font-semibold leading-[1.02] tracking-tight text-[var(--fg)] fade-up"
            style={{ animationDelay: "60ms", fontSize: "clamp(2.25rem, 8vw, 4.75rem)", textWrap: "balance" }}
          >
            <span className="text-gradient">Penetration testing</span>
            <br />
            <span className="text-gradient-accent">for marketing campaigns.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[19px] fade-up" style={{ animationDelay: "120ms" }}>
            Six adversarial AI personas stress-test your campaign against
            Bangladesh&apos;s cultural, linguistic, and regulatory reality,
            before the internet does.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 fade-up" style={{ animationDelay: "180ms" }}>
            <ButtonLink href="/signup" variant="primary" size="xl">
              Get started, it&apos;s free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="xl">
              Sign in
            </ButtonLink>
          </div>
        </div>

        {/* Real product preview: the actual ScoreRadar from a sample run */}
        <div className="relative mx-auto mt-16 max-w-5xl overflow-hidden px-4 text-left fade-up" style={{ animationDelay: "260ms" }}>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -bottom-8 -top-4 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,77,87,0.18),transparent_70%)] blur-3xl"
          />
          <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.005))] shadow-[0_40px_120px_-32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {/* App chrome: frames a real component, not a fake one */}
            <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-elev-1)]/60 px-4 py-3">
              <LogoBadge size="xs" tile glow={false} />
              <div className="flex h-6 min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 font-mono text-[11px] text-[var(--fg-subtle)]">
                <span className="truncate">backfire.os/runs/sample</span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[var(--success)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] pulse-dot" />
                  live
                </span>
              </div>
            </div>
            <div className="p-5 md:p-7">
              <ScoreRadar scores={SAMPLE_SCORES} labels={RADAR_LABELS} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="relative -mx-5 mb-24 max-w-[100vw] border-y border-[var(--border)] bg-[var(--bg-elev-1)]/40 px-5 py-6 backdrop-blur md:mb-32">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">
            The red team
          </p>
          <div className="marquee-mask relative min-w-0 flex-1 overflow-hidden">
            <div className="marquee flex w-max items-center">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center gap-x-7 pr-7">
                  {AGENTS.map((a) => (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br ${a.tone} font-mono text-[11px] font-semibold text-white/95 ring-1 ring-white/10`}>
                        {a.initials}
                      </span>
                      <span className="whitespace-nowrap text-[13px] text-[var(--fg-muted)]">{a.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Agents detail · stat-led dossier grid ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> The agents
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Six personas. Six angles of attack.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Each agent runs in parallel, retrieves from a Banglish sentiment
            corpus, and returns a severity-scored verdict. Heavier weights carry
            more real-world blast radius into the Backfire Score.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {AGENTS.map((a, i) => (
            <div
              key={a.id}
              className="card-glow group flex flex-col rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-start gap-3.5">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.tone} font-mono text-[14px] font-semibold text-white ring-1 ring-white/10`}>
                  {a.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[16px] font-semibold tracking-tight text-[var(--fg)]">
                    {a.name}
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    {a.id}
                  </p>
                </div>
              </div>
              <p className="mt-4 flex-1 text-[14px] leading-relaxed text-[var(--fg-muted)]">
                {a.role}
              </p>
              {/* Severity weight as a real meter */}
              <div className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  Severity weight
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bg-elev-3)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700"
                    style={{ width: `${(a.weight / MAX_WEIGHT) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[13px] font-semibold tabular-nums text-[var(--accent)]">
                  ×{a.weight.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            From brief to backfire-proof in 30 seconds.
          </h2>
        </div>
        <div className="relative grid gap-4 md:grid-cols-3">
          <div
            aria-hidden
            className="absolute left-6 right-6 top-[44px] hidden h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent md:block"
          />
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl lift fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative z-10 mb-5 flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] font-mono text-[14px] font-semibold text-[var(--accent)]">
                {s.n}
                <span className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent-soft)] blur-xl" />
              </div>
              <h3 className="font-display text-[18px] font-semibold tracking-tight text-[var(--fg)]">
                {s.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Modes grid ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Beyond the verdict.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Four interactive surfaces. Heatmaps and branches are live; boardroom
            and pre-mortem are in preview.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODES.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              className="card-glow group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl fade-up no-underline"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20 transition-transform duration-300 group-hover:scale-110">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{m.icon}</svg>
                  </div>
                  <div>
                    <h3 className="font-display text-[17px] font-semibold tracking-tight text-[var(--fg)]">
                      {m.title}
                    </h3>
                    <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-[var(--fg-muted)]">
                      {m.desc}
                    </p>
                    <div className="mt-4">
                      {m.status === "live" ? (
                        <Badge variant="accent" dot>Live</Badge>
                      ) : (
                        <Badge variant="outline">In preview</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mt-1.5 shrink-0 text-[var(--fg-subtle)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                  aria-hidden
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Capabilities · editorial list ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            More than a score.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            A full pre-launch workbench. Grounded retrieval, multimodal input,
            and a memory of everything your brand has ever shipped.
          </p>
        </div>
        <div className="grid gap-x-12 gap-y-0 sm:grid-cols-2">
          {CAPABILITIES.map((c, i) => (
            <div
              key={c.title}
              className="flex gap-5 border-t border-[var(--border)] py-7 fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="font-mono text-[13px] font-medium tabular-nums text-[var(--accent)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-[16px] font-semibold tracking-tight text-[var(--fg)]">
                  {c.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">
                  {c.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Localization callout ── */}
      <section className="mb-28 md:mb-36">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(135deg,#1a0d12,#0a0708)] p-8 md:p-14">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,77,87,0.25),transparent_60%)] blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,122,130,0.15),transparent_60%)] blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1.3fr_1fr]">
            <div>
              <Badge variant="accent" dot>
                Localization-first
              </Badge>
              <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
                Trained on Banglish. <br />
                <span className="text-gradient-accent">Built for the diaspora.</span>
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
                Every agent retrieves from a ~20K-sample Banglish sentiment corpus
                before responding, citing the rows that shaped its verdict. Toggle
                Bangla and English across the entire UI. Memes generate in the local register.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/80 p-4 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  Banglish sample
                </p>
                <p className="mt-2 font-display text-[15px] text-[var(--fg)]">
                  Ekdike cash, onkdike bKash
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/80 p-4 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  বাংলা
                </p>
                <p className="mt-2 font-display text-[15px] text-[var(--fg)]">
                  একদিকে ক্যাশ, অন্যদিকে বিকাশ
                </p>
              </div>
              <div className="col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev-1)]/80 p-4 backdrop-blur">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                  RAG corpus
                </p>
                <p className="mt-2 text-[14px] text-[var(--fg-muted)]">
                  <span className="font-display text-[18px] font-semibold text-[var(--fg)]">
                    ~20,000
                  </span>{" "}
                  Banglish sentiment samples · pgvector semantic retrieval · cited verdicts
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.005))] px-8 py-16 text-center backdrop-blur-xl md:px-12 md:py-20">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_0%,rgba(255,77,87,0.18),transparent_70%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-5xl">
              Ship the brief.<br />
              <span className="text-gradient-accent">Not the apology.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Create a free account and run your first adversarial simulation in
              under a minute.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/signup" variant="primary" size="xl">
                Create your account
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="xl">
                I already have one
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
