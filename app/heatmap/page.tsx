"use client";

import { PlaceholderFeature } from "@/components/placeholder-feature";
import { PageShell } from "@/components/page-shell";
import { useLanguage } from "@/components/language-provider";

export default function HeatmapPage() {
  const { locale } = useLanguage();
  return (
    <PageShell footer={false}>
      <PlaceholderFeature
        locale={locale}
        titleKey="heatmap"
        description="Visual heat map showing which geographic markets and demographics your creative misfires in — flagging specific Banglish copy and visuals that trigger negative responses."
      />
    </PageShell>
  );
}
