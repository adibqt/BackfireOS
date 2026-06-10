import { PreMortemGenerator } from "@/components/premortem-generator";
import { PreMortemAd } from "@/components/premortem-ad";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";

/**
 * The Pre-Mortem Generator is a member surface. When auth is configured and the
 * visitor is logged out, show the advertisement / sign-in wall instead of the
 * live generator. With no auth backend (local / demo builds) it stays open so
 * the feature remains reachable.
 */
export default async function PostMortemPage() {
  if (isSupabaseAuthConfigured()) {
    const user = await getUser();
    if (!user) return <PreMortemAd />;
  }
  return <PreMortemGenerator />;
}
