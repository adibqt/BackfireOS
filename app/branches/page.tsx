import { PageShell } from "@/components/page-shell";
import { CounterfactualBranches } from "@/components/counterfactual-branches";
import { BranchesAd } from "@/components/branches-ad";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseAuthConfigured } from "@/lib/supabase/client";

/**
 * Counterfactual Branching is a member surface. When auth is configured and the
 * visitor is logged out, show the advertisement / sign-in wall instead of the
 * live branch tree. With no auth backend (local / demo builds) the tree stays
 * open so the feature remains reachable.
 */
export default async function BranchesPage() {
  if (isSupabaseAuthConfigured()) {
    const user = await getUser();
    if (!user) return <BranchesAd />;
  }
  return (
    <PageShell wide footer={false}>
      <CounterfactualBranches />
    </PageShell>
  );
}
