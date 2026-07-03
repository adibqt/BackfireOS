"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AuthButton } from "./auth-button";
import { signOutUser, useAuthUser } from "./use-auth-user";
import { useLanguage } from "./language-provider";
import { LogoBadge } from "./logo";
import { useNavigationProgress } from "@/components/navigation-progress";
import { useTheme } from "@/lib/theme-provider";
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

// Pages that carry runId as a query param
const RUN_AWARE_PATHS = new Set(["/heatmap", "/branches", "/boardroom", "/post-mortem"]);

function HeaderLogo() {
  return (
    <div className="group inline-flex items-center gap-2.5">
      <div className="relative shrink-0">
        <LogoBadge size="sm" glow={false} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--success)] ring-2 ring-[var(--bg)] pulse-dot" />
      </div>
      <div className="hidden flex-col leading-none sm:flex">
        <span className="font-display text-[15px] font-semibold tracking-tight text-[var(--fg)] transition-colors group-hover:text-[var(--accent-400)]">
          Backfire
          <span className="ml-1 align-[0.08em] font-mono text-[0.7em] font-medium tracking-[0.18em] text-[var(--fg-muted)]">
            OS
          </span>
        </span>
        <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
          Adversarial brand sim
        </span>
      </div>
    </div>
  );
}

type Pill = { left: number; top: number; width: number; height: number };

function measurePill(nav: HTMLElement, target: HTMLElement): Pill {
  const navRect = nav.getBoundingClientRect();
  const elRect = target.getBoundingClientRect();
  return {
    left: elRect.left - navRect.left,
    top: elRect.top - navRect.top,
    width: elRect.width,
    height: elRect.height,
  };
}

function SiteHeaderInner() {
  const { locale, setLocale } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { startNavigation } = useNavigationProgress();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, configured: authConfigured } = useAuthUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pill, setPill] = useState<Pill | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [pillReady, setPillReady] = useState(false);

  const syncPillToActive = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeEl = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeEl) {
      setPill(null);
      return;
    }
    setPill(measurePill(nav, activeEl));
  }, []);

  const movePillToLink = useCallback((href: string) => {
    const nav = navRef.current;
    const el = linkRefs.current.get(href);
    if (!nav || !el) return;
    setPill(measurePill(nav, el));
  }, []);

  // Run ID from path (/runs/[id]) or from query string on any run-aware page
  const runIdFromPath = pathname?.match(/^\/runs\/([^/]+)/)?.[1] ?? null;
  const runIdFromQuery = RUN_AWARE_PATHS.has(pathname ?? "")
    ? (searchParams.get("runId") ?? null)
    : null;
  const activeRunId = runIdFromPath ?? runIdFromQuery;

  function resolveHref(href: string): string {
    if (!activeRunId) return href;
    if (href === "/") {
      // On /runs/[id] stay on the run; from any run-aware page go back to the run
      return runIdFromPath ? (pathname ?? href) : `/runs/${activeRunId}`;
    }
    if (RUN_AWARE_PATHS.has(href)) return `${href}?runId=${activeRunId}`;
    return href;
  }

  function isActive(href: string): boolean {
    // "Simulate" is only highlighted when directly on a /runs/[id] page
    if (runIdFromPath && href === "/") return true;
    return pathname === href || (href !== "/" && pathname?.startsWith(href));
  }

  // Sync pill when route or locale changes (after navigation completes)
  useLayoutEffect(() => {
    setPendingHref(null);
    syncPillToActive();
    if (!pillReady) {
      requestAnimationFrame(() => setPillReady(true));
    }
  }, [pathname, searchParams, locale, syncPillToActive, pillReady]);

  // Re-measure on resize / font load so the pill stays aligned
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(() => syncPillToActive());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [syncPillToActive]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 overflow-x-clip transition-[background-color,border-color] duration-200",
        scrolled
          ? "border-b border-[var(--border)] bg-[var(--bg)]/95"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="flex w-full min-w-0 items-center justify-between gap-4 px-5 py-3.5 md:px-8">
        <Link
          href="/"
          className="group no-underline"
          onClick={() => startNavigation()}
        >
          <HeaderLogo />
        </Link>

        <nav
          ref={navRef}
          className="relative hidden items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] p-1 lg:flex"
          aria-label="Main"
        >
          {/* Sliding active pill */}
          {pill && (
            <span
              aria-hidden
              className={cn(
                "nav-active-pill pointer-events-none absolute rounded-full bg-[var(--bg-elevated)] shadow-[inset_0_0_0_1px_var(--border)]",
                pillReady && "nav-active-pill--ready"
              )}
              style={{
                width: pill.width,
                height: pill.height,
                transform: `translate(${pill.left}px, ${pill.top}px)`,
              }}
            />
          )}

          {NAV_ITEMS.map(({ href, key, labelOverride }) => {
            const active = pendingHref ? pendingHref === href : isActive(href);
            return (
              <Link
                key={href}
                ref={(el) => {
                  if (el) linkRefs.current.set(href, el);
                  else linkRefs.current.delete(href);
                }}
                href={resolveHref(href)}
                onClick={() => {
                  movePillToLink(href);
                  setPendingHref(href);
                  startNavigation();
                }}
                data-active={String(active)}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200",
                  active
                    ? "text-[var(--fg)]"
                    : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                )}
              >
                <span className="relative">
                  {labelOverride ?? t(locale, key as Exclude<typeof key, "home">)}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun size={16} strokeWidth={2} aria-hidden />
            ) : (
              <Moon size={16} strokeWidth={2} aria-hidden />
            )}
          </button>

          <div
            className="hidden items-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] p-0.5 sm:flex"
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
                    ? "bg-[var(--bg-elevated)] text-[var(--fg)]"
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
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)] lg:hidden"
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
          className="border-t border-[var(--border)] bg-[var(--bg-surface)] px-5 py-4 lg:hidden fade-in"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, key, labelOverride }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={resolveHref(href)}
                  onClick={() => {
                    startNavigation();
                    setMobileOpen(false);
                  }}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-400)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
                  )}
                >
                  {labelOverride ?? t(locale, key as Exclude<typeof key, "home">)}
                </Link>
              );
            })}
            <Link
              href="/history"
              onClick={() => {
                startNavigation();
                setMobileOpen(false);
              }}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === "/history"
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-400)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg)]"
              )}
            >
              History
            </Link>

            {authConfigured && (
              <>
                <div className="my-2 border-t border-[var(--border)]" />
                {user ? (
                  <>
                    <p className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--fg-subtle)]">
                      Signed in as
                    </p>
                    <p className="truncate px-3 pb-1 text-[13px] text-[var(--fg-muted)]">
                      {user.email}
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        setMobileOpen(false);
                        await signOutUser();
                        router.push("/login");
                        router.refresh();
                      }}
                      className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => {
                      startNavigation();
                      setMobileOpen(false);
                    }}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--fg)] transition-colors hover:bg-[var(--bg-elevated)]"
                  >
                    Sign in
                  </Link>
                )}
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteHeader() {
  return (
    <Suspense fallback={null}>
      <SiteHeaderInner />
    </Suspense>
  );
}
