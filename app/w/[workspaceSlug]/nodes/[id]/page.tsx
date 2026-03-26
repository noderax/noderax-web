import { NodeDetailView } from "@/components/nodes/node-detail-view";

export default async function WorkspaceNodeDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>;
}) {
  const { id } = await params;

  return <NodeDetailView id={id} />;
}
