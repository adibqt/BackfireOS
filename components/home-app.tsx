import Link from "next/link";
import { UploadForm } from "@/components/upload-form";
import { Badge, Kbd } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PendingButtonLink } from "@/components/ui/pending-link";

const AGENTS = [
  { id: "meme_engineer", name: "Dhaka Meme Engineer", initials: "ME", tone: "from-rose-500/30 to-amber-500/10" },
  { id: "regional_outsider", name: "Regional Outsider", initials: "RO", tone: "from-violet-500/30 to-sky-500/10" },
  { id: "cynical_journalist", name: "Cynical Journalist", initials: "CJ", tone: "from-emerald-500/25 to-teal-500/10" },
  { id: "rival_brand", name: "Rival Brand Social Team", initials: "RB", tone: "from-orange-500/30 to-rose-500/10" },
  { id: "regulatory_activist", name: "Cultural / Regulatory Activist", initials: "RA", tone: "from-fuchsia-500/30 to-indigo-500/10" },
  { id: "brand_purist", name: "Brand Purist", initials: "BP", tone: "from-sky-500/30 to-cyan-500/10" },
] as const;

const METRICS = [
  { label: "Backfire Score", v: 78 },
  { label: "Resonance", v: 42 },
  { label: "Backfire Risk", v: 88 },
  { label: "Memeability", v: 71 },
  { label: "Brand-Safety Drift", v: 35 },
  { label: "Polarization", v: 64 },
] as const;

const MODES = [
  { href: "/heatmap", title: "Cultural Heat Map", desc: "City-by-city severity overlay across Bangladesh.", status: "live", icon: <><circle cx="12" cy="10" r="3" /><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.95 8 11.7z" /></> },
  { href: "/branches", title: "Counterfactual Branching", desc: "Git for campaigns — fork, tweak, watch scores shift.", status: "live", icon: <><circle cx="6" cy="3" r="2.5" /><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M6 5.5v10" /><path d="M18 9c0 3-4 4-12 4" /></> },
  { href: "/boardroom", title: "Boardroom Mode", desc: "Watch synthetic personas debate your campaign live.", status: "live", icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
  { href: "/post-mortem", title: "Regulatory Pre-Mortem", desc: "Auto-drafts the apology your brand would publish later.", status: "preview", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" /></> },
] as const;

const STEPS = [
  { n: "01", title: "Submit your brief", desc: "Drop in a slogan, brand values, brief, optional visual. Bangla or English." },
  { n: "02", title: "Six agents attack", desc: "A weighted panel of adversarial personas stress-tests it in parallel, grounded in Banglish RAG." },
  { n: "03", title: "Score, fork, ship", desc: "Get six composite metrics, parody memes, a cultural heatmap and counterfactual branches." },
] as const;

export function HomeApp({ liveAi }: { liveAi: boolean }) {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pt-2 pb-20 md:pt-8 md:pb-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_440px] lg:gap-14 xl:grid-cols-[1.15fr_480px]">
          <div className="relative">
            <div className="bg-grid absolute -inset-x-6 -top-12 -bottom-12 -z-10 opacity-50" aria-hidden />

            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-surface)] py-1 pl-1 pr-3 text-[12px]">
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
                v0.1
              </span>
              <span className="text-[var(--fg-muted)]">MarTech Track 2 · BuildFest 2026</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--fg-subtle)]" aria-hidden>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            <h1 className="mt-7 font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-[var(--fg)] md:text-[60px] lg:text-[68px]">
              <span className="text-gradient">Penetration testing</span>
              <br />
              <span className="text-gradient-accent">for marketing campaigns.</span>
            </h1>

            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[18px]">
              Upload a draft and watch six adversarial AI personas stress-test it
              against Bangladesh&apos;s cultural, linguistic, and regulatory
              landscape — before the internet does.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Badge variant={liveAi ? "live" : "demo"} dot>
                {liveAi ? "Live AI · Gemini" : "Demo Mode"}
              </Badge>
              <Badge variant="outline">🇧🇩 Bangla + English</Badge>
              <Badge variant="outline">Banglish RAG</Badge>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="#simulate" variant="primary" size="lg">
                Run a simulation
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </ButtonLink>
              <PendingButtonLink href="/history" variant="secondary" size="lg">
                View past runs
              </PendingButtonLink>
            </div>

            <div className="mt-10 flex items-center gap-2.5 text-[12px] text-[var(--fg-subtle)]">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              <span className="ml-1">to jump anywhere · or scroll for the full tour</span>
            </div>
          </div>

          <div id="simulate" className="lg:sticky lg:top-24 lg:self-start">
            <UploadForm liveAi={liveAi} />
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="relative -mx-5 mb-24 border-y border-[var(--border)] bg-[var(--bg-surface)] px-5 py-6 md:mb-32">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <p className="shrink-0 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--fg-subtle)]">The red team</p>
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

      {/* ── How it works ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> How it works
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Three steps from brief to backfire-proof.
          </h2>
        </div>
        <div className="relative grid gap-4 md:grid-cols-3">
          <div aria-hidden className="absolute left-6 right-6 top-[44px] hidden h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent md:block" />
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 lift fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="relative z-10 mb-5 flex h-[58px] w-[58px] items-center justify-center rounded-2xl border border-[var(--border-strong)] bg-[var(--bg)] font-mono text-[14px] font-semibold text-[var(--accent)]">
                {s.n}
                <span className="absolute inset-0 -z-10 rounded-2xl bg-[var(--accent-soft)] blur-xl" />
              </div>
              <h3 className="font-display text-[18px] font-semibold tracking-tight text-[var(--fg)]">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Metrics preview ── */}
      <section className="mb-28 md:mb-36">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
              <span className="h-px w-7 bg-[var(--accent)]/60" /> Six metrics
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
              One dashboard.<br />Every angle of failure.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Backfire Score, Resonance, Backfire Risk, Memeability, Brand-Safety Drift, and Polarization — composite scores that translate adversarial output into board-room numbers.
            </p>
            <div className="mt-7">
              <ButtonLink href="#simulate" variant="outline" size="md">Try it now</ButtonLink>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,var(--aurora-1),transparent_70%)] blur-2xl" />
            <div className="overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-xl)]">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">/runs/preview · 14:32:08</p>
                <Badge variant="accent" dot>live</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {METRICS.map((m, i) => {
                  const tone = m.v >= 70 ? "text-[var(--danger)]" : m.v >= 40 ? "text-[var(--warning)]" : "text-[var(--success)]";
                  const bar = m.v >= 70 ? "bg-[var(--danger)]" : m.v >= 40 ? "bg-[var(--warning)]" : "bg-[var(--success)]";
                  return (
                    <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/60 p-3.5 fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                      <p className="text-[11px] text-[var(--fg-subtle)]">{m.label}</p>
                      <p className={`mt-1 font-display text-2xl font-semibold ${tone}`}>{m.v}</p>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--bg-elev-3)]">
                        <div className={`h-full rounded-full ${bar}`} style={{ width: `${m.v}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modes grid ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> Modes
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">Beyond the verdict.</h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">Four interactive surfaces — heatmap, branches and the boardroom debate are live; pre-mortem is in preview.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {MODES.map((m, i) => (
            <Link key={m.href} href={m.href} className="card-glow group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 fade-up no-underline" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20 transition-transform duration-300 group-hover:scale-110">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{m.icon}</svg>
                  </div>
                  <div>
                    <h3 className="font-display text-[17px] font-semibold tracking-tight text-[var(--fg)]">{m.title}</h3>
                    <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-[var(--fg-muted)]">{m.desc}</p>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1.5 shrink-0 text-[var(--fg-subtle)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <div className="mt-5">
                {m.status === "live" ? (
                  <Badge variant="accent" dot>Live</Badge>
                ) : (
                  <Badge variant="outline">In preview</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="mb-12 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-5xl">
            Ship the brief.<br /><span className="text-gradient-accent">Not the apology.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Catch the headline, the meme, the rival hijack, and the regulatory slip — before they catch you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="#simulate" variant="primary" size="xl">
              Run a simulation
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </ButtonLink>
            <PendingButtonLink href="/history" variant="secondary" size="xl">View history</PendingButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
