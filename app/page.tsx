import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function Home() {
  await redirectToStoredWorkspace("dashboard");
}
