"use client";

import { PlaceholderFeature } from "@/components/placeholder-feature";
import { PageShell } from "@/components/page-shell";
import { useLanguage } from "@/components/language-provider";

export default function PostMortemPage() {
  const { locale } = useLanguage();
  return (
    <PageShell footer={false}>
      <PlaceholderFeature
        locale={locale}
        titleKey="postMortem"
        description="Auto-generates the apology post-mortem your brand would publish six months later — cross-referencing Essential Commodities Act 2025 and Digital Commerce Guidelines."
      />
    </PageShell>
  );
}
