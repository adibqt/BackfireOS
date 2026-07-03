import { PageShell } from "@/components/page-shell";
import { PageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell footer={false}>
      <PageSkeleton />
    </PageShell>
  );
}
