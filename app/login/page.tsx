"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/page-shell";
import { LogoBadge } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEMO_EMAIL = "adibrahman44@gmail.com";
const DEMO_PASSWORD = "a9011822";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"signin" | "demo" | null>(null);
  const [error, setError] = useState("");

  const signIn = async (
    credentials: { email: string; password: string },
    mode: "signin" | "demo",
  ) => {
    setLoading(mode);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword(credentials);
    if (authError) {
      setError(authError.message);
      setLoading(null);
      return;
    }
    router.push(redirect);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn({ email, password }, "signin");
  };

  const handleDemoLogin = async () => {
    await signIn({ email: DEMO_EMAIL, password: DEMO_PASSWORD }, "demo");
  };

  return (
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
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      <Button type="submit" size="lg" disabled={loading !== null} className="w-full">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled={loading !== null}
        className="w-full"
        onClick={handleDemoLogin}
      >
        {loading === "demo" ? "Opening demo…" : "Demo login"}
      </Button>
      <p className="pt-2 text-center text-sm text-[var(--fg-muted)]">
        No account?{" "}
        <Link
          href="/signup"
          className="font-medium text-[var(--accent-400)] hover:text-[var(--accent)]"
        >
          Create one →
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <PageShell footer={false}>
      <div className="relative mx-auto flex min-h-[72vh] max-w-md flex-col justify-center">
        {/* Aurora */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-12 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(255,77,87,0.18),transparent_70%)] blur-3xl"
        />

        <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[image:var(--veil-strong)] shadow-[var(--shadow-xl)] backdrop-blur-xl">
          <div className="px-8 pt-10 text-center">
            <div className="mx-auto inline-flex">
              <LogoBadge size="xl" glow />
            </div>
            <h1 className="mt-5 font-display text-[26px] font-semibold tracking-tight text-[var(--fg)]">
              Welcome back
            </h1>
            <p className="mt-1.5 text-[14px] text-[var(--fg-muted)]">
              Sign in to save and revisit your simulation runs.
            </p>
          </div>
          <div className="p-8">
            <Suspense
              fallback={
                <div className="space-y-3">
                  <div className="shimmer h-11 rounded-lg" />
                  <div className="shimmer h-11 rounded-lg" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-center text-[12px] text-[var(--fg-subtle)]">
          By signing in you agree to the prototype Terms.
        </p>
      </div>
    </PageShell>
  );
}
