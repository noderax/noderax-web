import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await redirectToStoredWorkspace(`tasks/${id}`);
}
