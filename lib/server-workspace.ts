import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { buildWorkspacePath, WORKSPACE_COOKIE } from "@/lib/workspace";

export const getStoredWorkspaceSlug = async () =>
  (await cookies()).get(WORKSPACE_COOKIE)?.value ?? null;

export const redirectToStoredWorkspace = async (path = "dashboard") => {
  const workspaceSlug = await getStoredWorkspaceSlug();

  redirect(workspaceSlug ? buildWorkspacePath(workspaceSlug, path) : "/workspaces");
};
