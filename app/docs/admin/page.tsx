import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { ButtonLink } from "@/components/ui/button";
import { DocsAdminPanel } from "@/components/docs/admin-panel";
import { getDocsAdmin } from "@/lib/docs/server";
import { getDocsConfig } from "@/lib/docs/config-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Backfire OS — Docs Admin",
  robots: { index: false, follow: false },
};

export default async function DocsAdminPage() {
  const { isAdmin } = await getDocsAdmin();

  if (!isAdmin) {
    return (
      <PageShell footer={false}>
        <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/25 bg-[var(--danger-soft)] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--danger)]">
            403 · Admins only
          </span>
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-[var(--fg)]">
            Documentation admin
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--fg-muted)]">
            You need an admin account to manage /docs visibility and scheduling.
            Sign in with an authorized account, or set <code className="font-mono text-[13px]">DOCS_ADMIN_EMAILS</code>.
          </p>
          <div className="mt-7 flex gap-3">
            <ButtonLink href="/login" variant="primary" size="md">
              Sign in
            </ButtonLink>
            <ButtonLink href="/docs" variant="secondary" size="md">
              Back to docs
            </ButtonLink>
          </div>
        </div>
      </PageShell>
    );
  }

  const config = await getDocsConfig();

  return (
    <PageShell footer={false}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--accent)]">
            <span className="h-px w-6 bg-[var(--accent)]/60" />
            Docs control panel
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--fg)]">
            Visibility, scheduling & team
          </h1>
        </div>
        <Link
          href="/docs"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--fill-soft)] px-3.5 text-[13px] font-medium text-[var(--fg)] no-underline transition-colors hover:bg-[var(--fill-hover)]"
        >
          View /docs →
        </Link>
      </div>

      <DocsAdminPanel initialConfig={config} />
    </PageShell>
  );
}
