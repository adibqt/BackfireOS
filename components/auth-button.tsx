"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOutUser, useAuthUser } from "@/components/use-auth-user";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const router = useRouter();
  const { user, loading, configured } = useAuthUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOutUser();
    router.push("/login");
    router.refresh();
  };

  if (!configured) return null;

  if (loading) {
    return <span className="h-9 w-20 shimmer rounded-lg" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(
          "hidden h-9 items-center rounded-lg border border-[var(--border-strong)] bg-white/[0.03] px-3.5 text-[13px] font-medium text-[var(--fg)] backdrop-blur",
          "transition-colors hover:bg-white/[0.06] hover:border-[var(--border-bright)] sm:inline-flex"
        )}
      >
        Sign in
      </Link>
    );
  }

  const initial = (user.email?.[0] ?? "u").toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev-1)]/60 py-0.5 pl-0.5 pr-1.5 backdrop-blur transition-colors hover:bg-white/[0.06] sm:pr-3"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "Close account menu" : "Open account menu"}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a82,#c92c39)] text-[12px] font-semibold text-white">
          {initial}
        </span>
        <span className="hidden max-w-[120px] truncate text-[13px] text-[var(--fg)] sm:inline">
          {user.email}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="hidden text-[var(--fg-muted)] sm:block" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="fade-in fixed right-5 top-[3.75rem] z-50 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)] shadow-xl backdrop-blur-xl sm:absolute sm:right-0 sm:top-[calc(100%+8px)] sm:z-20"
          >
            <div className="border-b border-[var(--border)] px-3.5 py-3">
              <p className="text-[11px] uppercase tracking-wider text-[var(--fg-subtle)]">
                Signed in
              </p>
              <p className="mt-0.5 truncate text-[13px] text-[var(--fg)]">{user.email}</p>
            </div>
            <Link
              href="/history"
              onClick={() => setMenuOpen(false)}
              className="block px-3.5 py-2.5 text-[13px] text-[var(--fg-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--fg)]"
            >
              Simulation history
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="block w-full border-t border-[var(--border)] px-3.5 py-2.5 text-left text-[13px] text-[var(--danger)] transition-colors hover:bg-[var(--danger-soft)]"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
