"use client";

import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { LogoBadge } from "@/components/logo";
import type { AccessReason } from "@/lib/docs/types";

function formatWindow(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function useCountdown(target: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const diff = Date.parse(target) - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return [d && `${d}d`, `${h}h`, `${m}m`, `${s}s`].filter(Boolean).join(" ");
}

const MESSAGE: Record<AccessReason, { title: string; body: string }> = {
  off: {
    title: "Documentation is offline",
    body: "The /docs showcase has been turned off by an administrator.",
  },
  "before-window": {
    title: "Opening soon",
    body: "This documentation is scheduled to go live during its publishing window.",
  },
  "after-window": {
    title: "Showcase window closed",
    body: "The /docs publishing window has ended. Check back when it reopens.",
  },
  "no-window": {
    title: "Not currently available",
    body: "No publishing window is configured for the documentation.",
  },
  // The remaining reasons are "allowed" states and won't reach this screen.
  admin: { title: "", body: "" },
  "preview-token": { title: "", body: "" },
  "visible-on": { title: "", body: "" },
  "visible-scheduled": { title: "", body: "" },
};

export function NotAvailable({
  reason,
  startsAt,
  endsAt,
}: {
  reason: AccessReason;
  startsAt: string | null;
  endsAt: string | null;
}) {
  const msg = MESSAGE[reason] ?? MESSAGE["no-window"];
  const countdownTarget = reason === "before-window" ? startsAt : null;
  const countdown = useCountdown(countdownTarget);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <div className="relative">
        <LogoBadge size="lg" />
      </div>
      <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-[var(--warning)]/25 bg-[var(--warning-soft)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--warning)]">
        403 · Not available
      </span>
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-[var(--fg)] md:text-4xl">
        {msg.title}
      </h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[var(--fg-muted)]">
        {msg.body}
      </p>

      {(startsAt || endsAt) && (
        <div className="mt-6 w-full rounded-2xl border border-[var(--border)] bg-white/[0.015] p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--fg-subtle)]">
            Publishing window
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[12px] text-[var(--fg-subtle)]">Opens</p>
              <p className="text-[14px] text-[var(--fg)]">{startsAt ? formatWindow(startsAt) : "—"}</p>
            </div>
            <div>
              <p className="text-[12px] text-[var(--fg-subtle)]">Closes</p>
              <p className="text-[14px] text-[var(--fg)]">{endsAt ? formatWindow(endsAt) : "—"}</p>
            </div>
          </div>
          {countdown && (
            <p className="mt-4 font-display text-lg font-semibold tracking-tight text-gradient-accent tabular-nums">
              Opens in {countdown}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" variant="primary" size="md">
          Back to app
        </ButtonLink>
        <ButtonLink href="/login" variant="secondary" size="md">
          Admin sign in
        </ButtonLink>
      </div>
    </div>
  );
}
