import { PageShell } from "@/components/page-shell";
import { FormPageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell bare>
      <FormPageSkeleton />
    </PageShell>
  );
}
