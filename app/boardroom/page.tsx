"use client";

import { PlaceholderFeature } from "@/components/placeholder-feature";
import { SiteHeader } from "@/components/site-header";
import { useLanguage } from "@/components/language-provider";

export default function BoardroomPage() {
  const { locale } = useLanguage();
  return (
    <>
      <SiteHeader />
      <PlaceholderFeature
        locale={locale}
        titleKey="boardroom"
        description="Watch synthetic personas debate your campaign live — the Activist argues with the Brand Manager while the Cynical Journalist cross-examines the slogan's claims."
      />
    </>
  );
}
