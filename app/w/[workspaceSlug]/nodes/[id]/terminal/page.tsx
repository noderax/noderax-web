import { NodeTerminalView } from "@/components/nodes/node-terminal-view";

export default async function WorkspaceNodeTerminalPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>;
}) {
  const { id } = await params;

  return <NodeTerminalView id={id} />;
}
