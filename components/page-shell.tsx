import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

export function PageShell({
  children,
  footer = true,
  bare = false,
}: {
  children: React.ReactNode;
  footer?: boolean;
  /** @deprecated layout is now full-bleed; this prop is a no-op */
  wide?: boolean;
  bare?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-x-clip",
        // Bare mode owns the full viewport so a child can scroll internally
        // (full-screen scroll-snap). A definite height lets `h-full` resolve.
        bare ? "h-dvh overflow-hidden" : "min-h-screen"
      )}
    >
      <SiteHeader />
      <main
        className={
          bare
            ? "min-h-0 min-w-0 flex-1 overflow-x-clip"
            : "w-full min-w-0 flex-1 overflow-x-clip px-5 py-10 md:px-8 md:py-16 lg:px-12"
        }
      >
        {children}
      </main>
      {footer && <SiteFooter />}
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-[var(--border)]">
      <div className="grid gap-10 px-5 py-12 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:px-8 lg:px-12">
        <div>
          <Logo size="sm" tile glow={false} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--fg-muted)]">
            Adversarial brand simulation engine for emerging markets. Built for
            MarTech Track 2 · BuildFest 2026.
          </p>
        </div>
        <FooterCol
          heading="Product"
          links={[
            { href: "/", label: "Run simulation" },
            { href: "/history", label: "History" },
            { href: "/heatmap", label: "Heat map" },
            { href: "/branches", label: "Branches" },
          ]}
        />
        <FooterCol
          heading="Modes"
          links={[
            { href: "/boardroom", label: "Boardroom" },
            { href: "/post-mortem", label: "Pre-mortem" },
            { href: "/docs", label: "Docs & deck" },
          ]}
        />
        <FooterCol
          heading="Account"
          links={[
            { href: "/login", label: "Sign in" },
            { href: "/signup", label: "Create account" },
          ]}
        />
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs text-[var(--fg-subtle)] md:px-8 lg:px-12">
          <p>© {new Date().getFullYear()} Backfire OS · All rights reserved.</p>
          <p className="font-mono">v0.1 · prototype build</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
        {heading}
      </p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow && (
        <p
          className={`mb-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)] ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          <span className="h-px w-7 bg-[var(--accent)]/60" />
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--fg)] md:text-5xl lg:text-6xl">
        {title}
      </h1>
      {description && (
        <p
          className={`mt-5 text-[17px] leading-relaxed text-[var(--fg-muted)] ${
            align === "center" ? "mx-auto max-w-2xl" : "max-w-2xl"
          }`}
        >
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
