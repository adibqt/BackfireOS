import { HeatmapPageClient } from "@/components/heatmap-page-client";
import { HeatmapAd } from "@/components/heatmap-ad";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";

/**
 * The Cultural Heat Map is a member surface. When auth is configured and the
 * visitor is logged out, show the advertisement / sign-in wall instead of the
 * live map. With no auth backend (local / demo builds) the map stays open so
 * the feature remains reachable.
 */
export default async function HeatmapPage() {
  if (isSupabaseAuthConfigured()) {
    const user = await getUser();
    if (!user) return <HeatmapAd />;
  }
  return <HeatmapPageClient />;
}
