"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthButton } from "./auth-button";
import { useLanguage } from "./language-provider";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  key: "home" | "heatmap" | "branches" | "boardroom" | "postMortem";
  labelOverride?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", key: "home", labelOverride: "Simulate" },
  { href: "/heatmap", key: "heatmap" },
  { href: "/branches", key: "branches" },
  { href: "/boardroom", key: "boardroom" },
  { href: "/post-mortem", key: "postMortem" },
];

function Logo() {
  return (
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <div className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,#ff7a82,#c92c39)] shadow-[0_4px_20px_-4px_var(--accent-glow)]" />
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-white"
        aria-hidden
      >
        <path d="M13 2L4.5 13h6L11 22l8.5-11h-6L13 2z" />
      </svg>
      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--success)] ring-2 ring-[var(--bg)] pulse-dot" />
    </div>
  );
}

export function SiteHeader() {
  const { locale, setLocale } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-200",
        scrolled
          ? "border-b border-[var(--border)] bg-[var(--bg)]/75 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link href="/" className="group flex items-center gap-3 no-underline">
          <Logo />
          <div className="flex flex-col">
            <span className="font-display text-[15px] font-semibold leading-none tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-400)]">
              Backfire OS
            </span>
            <span className="mt-1 hidden text-[11px] leading-none text-[var(--fg-subtle)] sm:block">
              Adversarial brand sim
            </span>
          </div>
        </Link>

        <nav
          className="hidden items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-elev-1)]/60 p-1 backdrop-blur lg:flex"
          aria-label="Main"
        >
          {NAV_ITEMS.map(({ href, key, labelOverride }) => {
            const active =
              pathname === href || (href !== "/" && pathname?.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200",
                  active
                    ? "text-[var(--fg)]"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-full bg-white/[0.06]" />
                )}
                <span className="relative">
                  {labelOverride ?? t(locale, key as Exclude<typeof key, "home">)}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--bg-elev-1)]/60 p-0.5 backdrop-blur sm:flex"
            role="group"
            aria-label="Language"
          >
            {(["en", "bn"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLocale(lang)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors duration-200",
                  locale === lang
                    ? "bg-white/[0.08] text-[var(--fg)]"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg)]"
                )}
              >
                {lang}
              </button>
            ))}
          </div>

          <AuthButton />

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elev-1)]/60 text-[var(--fg-muted)] backdrop-blur transition-colors hover:bg-white/[0.06] hover:text-[var(--fg)] lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-[var(--border)] bg-[var(--bg-elev-1)]/90 px-5 py-4 backdrop-blur-xl lg:hidden fade-in"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, key, labelOverride }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-400)]"
                      : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
                  )}
                >
                  {labelOverride ?? t(locale, key as Exclude<typeof key, "home">)}
                </Link>
              );
            })}
            <Link
              href="/history"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/history"
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-400)]"
                  : "text-[var(--fg-muted)] hover:bg-white/[0.04] hover:text-[var(--fg)]"
              )}
            >
              History
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
