import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function NodesPage() {
  await redirectToStoredWorkspace("nodes");
}
