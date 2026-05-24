import RunPageClient from "@/components/run-page-client";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RunPageClient id={id} />;
}
