"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/page-shell";
import { LogoBadge } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setMessage("Check your email to confirm your account, or sign in if confirmation is disabled.");
    setLoading(false);
    setTimeout(() => router.push("/login"), 2000);
  };

  return (
    <PageShell footer={false}>
      <div className="relative mx-auto flex min-h-[72vh] max-w-md flex-col justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-12 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,var(--aurora-1),transparent_70%)] blur-3xl"
        />

        <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]">
          <div className="px-8 pt-10 text-center">
            <div className="mx-auto inline-flex">
              <LogoBadge size="xl" glow />
            </div>
            <h1 className="mt-5 font-display text-[26px] font-semibold tracking-tight text-[var(--fg)]">
              Create your account
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--fg-muted)]">
              Save runs, revisit memes, fork campaigns later.
            </p>
          </div>
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@brand.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}
              {message && (
                <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success-soft)] px-3.5 py-2.5 text-sm text-[var(--success)]">
                  {message}
                </div>
              )}
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? "Creating account…" : "Create account"}
              </Button>
              <p className="pt-2 text-center text-sm text-[var(--fg-muted)]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[var(--accent-400)] hover:text-[var(--accent)]"
                >
                  Sign in →
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
