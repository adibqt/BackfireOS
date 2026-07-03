import { PageShell } from "@/components/page-shell";
import { ListPageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell footer={false}>
      <ListPageSkeleton />
    </PageShell>
  );
}
