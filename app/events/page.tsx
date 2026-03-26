import { redirectToStoredWorkspace } from "@/lib/server-workspace";

export default async function EventsPage() {
  await redirectToStoredWorkspace("events");
}
