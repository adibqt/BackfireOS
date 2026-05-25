"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseAuthConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

export function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseAuthConfigured());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSupabaseAuthConfigured()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!isSupabaseAuthConfigured()) return null;

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
    <div className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elev-1)]/60 py-0.5 pl-0.5 pr-3 backdrop-blur transition-colors hover:bg-white/[0.06]"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff7a82,#c92c39)] text-[12px] font-semibold text-white">
          {initial}
        </span>
        <span className="max-w-[120px] truncate text-[13px] text-[var(--fg)]">
          {user.email}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--fg-muted)]" aria-hidden>
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
            className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elev-2)] shadow-xl backdrop-blur-xl fade-in"
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
