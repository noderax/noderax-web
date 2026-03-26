import { TaskDetailView } from "@/components/tasks/task-detail-view";

export default async function WorkspaceTaskDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; id: string }>;
}) {
  const { id } = await params;

  return <TaskDetailView id={id} />;
}
