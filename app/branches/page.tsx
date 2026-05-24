"use client";

import { PlaceholderFeature } from "@/components/placeholder-feature";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";

export default function BranchesPage() {
  const { locale } = useLanguage();
  return (
    <>
      <SiteHeader />
      <PlaceholderFeature
        locale={locale}
        titleKey="branches"
        description="Git for campaigns — tweak a slogan, swap casting, drop a risky line, and watch Resonance and Backfire Risk scores update in real time across a visual branch tree."
      />
    </>
  );
}
