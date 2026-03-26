import type { UserRole, WorkspaceDto, WorkspaceMembershipRole } from "@/lib/types";

export const WORKSPACE_COOKIE = "noderax_workspace";

const normalizeWorkspaceChildPath = (path: string) =>
  path.replace(/^\/+/, "").replace(/\/+$/, "");

export const buildWorkspacePath = (workspaceSlug: string, path = "dashboard") => {
  const normalizedPath = normalizeWorkspaceChildPath(path);
  return `/w/${workspaceSlug}${normalizedPath ? `/${normalizedPath}` : ""}`;
};

export const isPlatformAdmin = (role?: UserRole | null) => role === "platform_admin";

export const isWorkspaceAdminRole = (role?: WorkspaceMembershipRole | null) =>
  role === "owner" || role === "admin";

export const pickWorkspaceBySlug = (
  workspaces: WorkspaceDto[] | undefined,
  slug?: string | null,
) => workspaces?.find((workspace) => workspace.slug === slug) ?? null;

export const pickDefaultWorkspace = (
  workspaces: WorkspaceDto[] | undefined,
) => workspaces?.find((workspace) => workspace.isDefault) ?? null;

export const persistWorkspaceSlug = (slug: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${WORKSPACE_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
};
