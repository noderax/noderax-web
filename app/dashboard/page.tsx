import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function DashboardPage() {
  await redirectToStoredWorkspace("dashboard");
}
