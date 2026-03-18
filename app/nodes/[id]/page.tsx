import { NodeDetailView } from "@/components/nodes/node-detail-view";

export default async function NodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <NodeDetailView id={id} />;
}
