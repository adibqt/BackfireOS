"use client";

import { PlaceholderFeature } from "@/components/placeholder-feature";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";

export default function PostMortemPage() {
  const { locale } = useLanguage();
  return (
    <>
      <SiteHeader />
      <PlaceholderFeature
        locale={locale}
        titleKey="postMortem"
        description="Auto-generates the apology post-mortem your brand would publish six months later — cross-referencing Essential Commodities Act 2025 and Digital Commerce Guidelines."
      />
    </>
  );
}
