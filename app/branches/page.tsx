import { PageShell } from "@/components/page-shell";
import { CounterfactualBranches } from "@/components/counterfactual-branches";

export default function BranchesPage() {
  return (
    <PageShell wide footer={false}>
      <CounterfactualBranches />
    </PageShell>
  );
}
