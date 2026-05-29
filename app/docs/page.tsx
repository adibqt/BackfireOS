import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { DocsExperience } from "@/components/docs/docs-experience";
import { NotAvailable } from "@/components/docs/not-available";
import { getDocsAccess } from "@/lib/docs/server";
import { getLiveStats } from "@/lib/docs/live";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const access = await getDocsAccess();
  // Only index when the page is genuinely public (not preview / not gated).
  const indexable = access.allowed && !access.preview;
  return {
    title: "Backfire OS — Documentation & Pitch Deck",
    description:
      "Live YC-style pitch deck and technical whitepaper for Backfire OS, the adversarial brand-simulation engine.",
    robots: indexable ? undefined : { index: false, follow: false },
  };
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const access = await getDocsAccess(token ?? null);

  if (!access.allowed) {
    return (
      <PageShell footer={false}>
        <NotAvailable
          reason={access.reason}
          startsAt={access.config.startsAt}
          endsAt={access.config.endsAt}
        />
      </PageShell>
    );
  }

  const stats = await getLiveStats();

  return (
    <DocsExperience
      config={access.config}
      initialStats={stats}
      isAdmin={access.isAdmin}
      preview={access.preview}
    />
  );
}
