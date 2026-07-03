import { PageShell } from "@/components/page-shell";
import { HeatmapPageSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageShell footer={false}>
      <HeatmapPageSkeleton />
    </PageShell>
  );
}
