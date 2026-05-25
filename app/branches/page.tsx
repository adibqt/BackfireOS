"use client";

import { PlaceholderFeature } from "@/components/placeholder-feature";
import { PageShell } from "@/components/page-shell";
import { useLanguage } from "@/components/language-provider";

export default function BranchesPage() {
  const { locale } = useLanguage();
  return (
    <PageShell footer={false}>
      <PlaceholderFeature
        locale={locale}
        titleKey="branches"
        description="Git for campaigns — tweak a slogan, swap casting, drop a risky line, and watch Resonance and Backfire Risk scores update in real time across a visual branch tree."
      />
    </PageShell>
  );
}
