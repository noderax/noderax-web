import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function TasksPage() {
  await redirectToStoredWorkspace("tasks");
}
