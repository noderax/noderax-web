import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function ScheduledTasksPage() {
  await redirectToStoredWorkspace("scheduled-tasks");
}
