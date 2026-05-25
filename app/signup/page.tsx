"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SiteHeader } from "@/components/site-header";

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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
    <>
      <SiteHeader />
      <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-16">
        <div className="w-full rounded-2xl border border-white/10 bg-zinc-900/70 p-8 shadow-2xl">
          <h1 className="mb-2 text-2xl font-bold text-white">Create account</h1>
          <p className="mb-6 text-sm text-zinc-400">
            Your simulations and generated memes will be saved to your account.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-red-500"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-emerald-400">{message}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
            <p className="text-center text-sm text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="text-red-300 hover:text-red-200">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
