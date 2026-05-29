import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

const AGENTS = [
  { id: "meme_engineer", name: "Dhaka Meme Engineer", role: "Spots viral parody potential & awkward Banglish slogans", initials: "ME", weight: 1.2, tone: "from-rose-500/30 to-amber-500/10" },
  { id: "regional_outsider", name: "Regional Outsider", role: "Compares Dhaka · Sylhet · Chittagong · rural", initials: "RO", weight: 1.0, tone: "from-violet-500/30 to-sky-500/10" },
  { id: "cynical_journalist", name: "Cynical Journalist", role: "Writes the most damaging plausible headline", initials: "CJ", weight: 1.3, tone: "from-emerald-500/25 to-teal-500/10" },
  { id: "rival_brand", name: "Rival Brand Social Team", role: "Shows how a competitor would hijack the slogan", initials: "RB", weight: 1.1, tone: "from-orange-500/30 to-rose-500/10" },
  { id: "regulatory_activist", name: "Cultural / Regulatory Activist", role: "Flags religion, labor, gender & compliance tripwires", initials: "RA", weight: 1.4, tone: "from-fuchsia-500/30 to-indigo-500/10" },
  { id: "brand_purist", name: "Brand Purist", role: "Audits drift against your brand's canonical values & history", initials: "BP", weight: 1.2, tone: "from-sky-500/30 to-cyan-500/10" },
] as const;

const METRICS = [
  { label: "Backfire Score", v: 78 },
  { label: "Resonance", v: 42 },
  { label: "Backfire Risk", v: 88 },
  { label: "Memeability", v: 71 },
  { label: "Brand-Safety Drift", v: 35 },
  { label: "Polarization", v: 64 },
] as const;

const STEPS = [
  { n: "01", title: "Submit your brief", desc: "Drop in a slogan, brand values, brief, optional visual. Bangla or English." },
  { n: "02", title: "Six agents attack", desc: "A weighted panel of adversarial personas stress-tests it in parallel, grounded in Banglish RAG." },
  { n: "03", title: "Score, fork, ship", desc: "Six composite metrics, parody memes, a cultural heatmap and counterfactual branches." },
] as const;

const MODES = [
  { href: "/heatmap", title: "Cultural Heat Map", desc: "City-by-city severity overlay across Bangladesh.", status: "live" },
  { href: "/branches", title: "Counterfactual Branching", desc: "Git for campaigns — fork, tweak, watch scores shift.", status: "live" },
  { href: "/boardroom", title: "Boardroom Mode", desc: "Watch synthetic personas debate your campaign live.", status: "preview" },
  { href: "/post-mortem", title: "Regulatory Pre-Mortem", desc: "Auto-drafts the apology your brand would publish later.", status: "preview" },
] as const;

const CAPABILITIES = [
  { title: "Brand-consistency audit", desc: "The Brand Purist remembers your prior campaigns and flags when a new one contradicts your stated values." },
  { title: "Multimodal vision", desc: "Upload the visual — Gemini parses it and every persona reasons over the image, not just the copy." },
  { title: "Banglish RAG", desc: "Each verdict retrieves from ~20K code-mixed sentiment samples, with citations back to the source rows." },
  { title: "Persistent history", desc: "Every run, verdict and meme is saved per-account with row-level security. Revisit and compare any time." },
  { title: "Streaming verdicts", desc: "Verdicts land over Server-Sent Events as each agent finishes — no waiting for the full panel." },
  { title: "Works key-free", desc: "Demo mode runs the whole flow with mock verdicts and placeholder memes — no API key, no signup." },
] as const;

export function LandingPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative pb-24 pt-6 text-center md:pb-32 md:pt-16">
        {/* Aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[640px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(ellipse_50%_55%_at_50%_0%,rgba(255,77,87,0.28),transparent_70%)] blur-3xl"
        />
        {/* Faded grid */}
        <div className="bg-grid absolute inset-x-0 top-0 -z-10 h-[640px] opacity-60" aria-hidden />

        <div className="mx-auto max-w-3xl">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg-elev-1)]/60 py-1 pl-1 pr-3 text-[12px] backdrop-blur fade-up">
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]">
              New
            </span>
            <span className="text-[var(--fg-muted)]">
              Now in private preview · MarTech Track 2
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--fg-subtle)]" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>

          <h1 className="mt-8 font-display text-[44px] font-semibold leading-[1.02] tracking-tight text-[var(--fg)] md:text-[64px] lg:text-[76px] fade-up" style={{ animationDelay: "60ms" }}>
            <span className="text-gradient">Penetration testing</span>
            <br />
            <span className="text-gradient-accent">for marketing campaigns.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--fg-muted)] md:text-[19px] fade-up" style={{ animationDelay: "120ms" }}>
            Six adversarial AI personas stress-test your campaign against
            Bangladesh&apos;s cultural, linguistic, and regulatory landscape
            — before the internet does.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 fade-up" style={{ animationDelay: "180ms" }}>
            <ButtonLink href="/signup" variant="primary" size="xl">
              Get started — it&apos;s free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="xl">
              Sign in
            </ButtonLink>
          </div>

          <p className="mt-6 text-[12px] text-[var(--fg-subtle)] fade-up" style={{ animationDelay: "240ms" }}>
            No credit card required · Bangla &amp; English · Banglish RAG
          </p>
        </div>

        {/* Mock product preview */}
        <div className="relative mx-auto mt-16 max-w-5xl px-4 fade-up" style={{ animationDelay: "300ms" }}>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-8 -bottom-8 -top-4 -z-10 rounded-[40px] bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(255,77,87,0.18),transparent_70%)] blur-3xl"
          />
          <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.005))] shadow-[0_40px_120px_-32px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elev-1)]/60 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <div className="ml-3 flex h-6 w-full max-w-md items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 text-[11px] text-[var(--fg-subtle)]">
                backfire.os/runs/0xa4f2 · Live
              </div>
            </div>
            {/* Mock metrics grid */}
            <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
              {METRICS.map((m) => {
                const tone = m.v >= 70 ? "text-[var(--danger)]" : m.v >= 40 ? "text-[var(--warning)]" : "text-[var(--success)]";
                const bar = m.v >= 70 ? "bg-[var(--danger)]" : m.v >= 40 ? "bg-[var(--warning)]" : "bg-[var(--success)]";
                return (
                  <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)]/60 p-4 text-left">
                    <p className="text-[11px] text-[var(--fg-subtle)]">{m.label}</p>
                    <p className={`mt-1 font-display text-3xl font-semibold ${tone}`}>{m.v}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--bg-elev-3)]">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${m.v}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="relative -mx-5 mb-24 border-y border-[var(--border)] bg-[var(--bg-elev-1)]/40 px-5 py-6 backdrop-blur md:mb-32">
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

      {/* ── Agents detail ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12 text-center">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> The agents
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Six personas. Six angles of attack.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Each agent runs in parallel, retrieves from a Banglish sentiment
            corpus, and returns a severity-scored verdict with a sample attack.
            Verdicts are weighted by real-world blast radius before aggregating.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((a, i) => (
            <div
              key={a.id}
              className="card-glow group rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${a.tone} font-mono text-[14px] font-semibold text-white ring-1 ring-white/10`}>
                  {a.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[15px] font-semibold text-[var(--fg)]">
                    {a.name}
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                    {a.id}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg-elev-2)]/60 px-2 py-1 font-mono text-[10px] text-[var(--fg-subtle)]" title="Severity weight in the Backfire Score">
                  ×{a.weight.toFixed(1)}
                </span>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-[var(--fg-muted)]">
                {a.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12 text-center">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> Workflow
          </p>
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
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> Modes
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            Beyond the verdict.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            Four interactive surfaces — heatmaps, branches, boardroom debates,
            and regulatory pre-mortems.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODES.map((m, i) => (
            <Link
              key={m.href}
              href={m.href}
              className="card-glow group flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl fade-up no-underline"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div>
                <h3 className="font-display text-[17px] font-semibold tracking-tight text-[var(--fg)]">
                  {m.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--fg-muted)]">
                  {m.desc}
                </p>
                <div className="mt-3">
                  {m.status === "live" ? (
                    <Badge variant="accent" dot>Live</Badge>
                  ) : (
                    <Badge variant="outline">In preview</Badge>
                  )}
                </div>
              </div>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0 text-[var(--fg-subtle)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--accent)]"
                aria-hidden
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section className="mb-28 md:mb-36">
        <div className="mb-12">
          <p className="mb-3 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-7 bg-[var(--accent)]/60" /> The platform
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
            More than a score.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
            A full pre-launch workbench — grounded retrieval, multimodal input,
            and a memory of everything your brand has ever shipped.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <div
              key={c.title}
              className="card-glow rounded-2xl border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.005))] p-6 backdrop-blur-xl fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-[var(--fg)]">
                {c.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">
                {c.desc}
              </p>
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
                Bangla ⇄ English across the entire UI. Memes generate in the local register.
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
