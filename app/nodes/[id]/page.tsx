import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function NodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await redirectToStoredWorkspace(`nodes/${id}`);
}
