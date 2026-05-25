import { PageShell } from "@/components/page-shell";
import { HomeApp } from "@/components/home-app";
import { LandingPage } from "@/components/landing-page";
import { isGeminiConfigured } from "@/lib/gemini";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";
import { getUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const liveAi = isGeminiConfigured();
  const authConfigured = isSupabaseAuthConfigured();
  const user = authConfigured ? await getUser() : null;

  // Auth enabled + logged out → marketing landing page
  if (authConfigured && !user) {
    return (
      <PageShell>
        <LandingPage />
      </PageShell>
    );
  }

  // Logged in (or auth disabled — open demo mode) → simulation experience
  return (
    <PageShell>
      <HomeApp liveAi={liveAi} />
    </PageShell>
  );
}
