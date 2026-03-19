import { AppShell } from "@/components/layout/app-shell";
import { NodePackagesScreen } from "@/components/packages/node-packages-screen";

export default async function NodePackagesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell>
      <NodePackagesScreen nodeId={id} standalone />
    </AppShell>
  );
}
