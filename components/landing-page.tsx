import { ButtonLink } from "@/components/ui/button";
import { LogoBadge } from "@/components/logo";

export function LandingPage() {
  return (
    <section className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <LogoBadge size="md" glow={false} className="mb-8" />

      <h1 className="max-w-3xl text-page-title text-[var(--fg)] md:text-[var(--text-3xl)] lg:text-[clamp(2.25rem,5vw,3.5rem)]">
        <span className="text-gradient">Penetration testing</span>
        <br />
        <span className="text-gradient-accent">for marketing campaigns.</span>
      </h1>

      <p className="mx-auto mt-5 max-w-lg text-[var(--text-lg)] text-[var(--fg-muted)]">
        Six Red-Team Agents stress-test your campaign before launch.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/signup" variant="primary" size="xl">
          Run Simulation
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary" size="xl">
          Sign in
        </ButtonLink>
      </div>
    </section>
  );
}
