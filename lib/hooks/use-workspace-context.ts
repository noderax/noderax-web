"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import type { WorkspaceDto } from "@/lib/types";
import {
  buildWorkspacePath,
  isPlatformAdmin,
  isWorkspaceAdminRole,
  persistWorkspaceSlug,
  pickWorkspaceBySlug,
} from "@/lib/workspace";
import { useAppStore } from "@/store/useAppStore";

export const workspacesQueryKey = ["workspaces", "list"] as const;

const readWorkspaceSlugFromPathname = (pathname: string | null) => {
  if (!pathname?.startsWith("/w/")) {
    return null;
  }

  const [, , slug] = pathname.split("/");
  return slug || null;
};

export const useWorkspaceContext = () => {
  const pathname = usePathname();
  const session = useAppStore((state) => state.session);
  const storedWorkspaceSlug = useAppStore((state) => state.activeWorkspaceSlug);
  const setActiveWorkspaceSlug = useAppStore(
    (state) => state.setActiveWorkspaceSlug,
  );

  const query = useQuery({
    queryKey: workspacesQueryKey,
    queryFn: apiClient.getWorkspaces,
    enabled: Boolean(session),
    staleTime: 30_000,
  });

  const routeWorkspaceSlug = readWorkspaceSlugFromPathname(pathname);
  const effectiveWorkspaceSlug = routeWorkspaceSlug ?? storedWorkspaceSlug;

  const workspace = useMemo(
    () => pickWorkspaceBySlug(query.data, effectiveWorkspaceSlug),
    [effectiveWorkspaceSlug, query.data],
  );

  const fallbackWorkspace = useMemo<WorkspaceDto | null>(
    () => (workspace ? null : (query.data?.[0] ?? null)),
    [query.data, workspace],
  );

  useEffect(() => {
    const nextSlug = workspace?.slug ?? routeWorkspaceSlug ?? null;
    if (!nextSlug || storedWorkspaceSlug === nextSlug) {
      return;
    }

    setActiveWorkspaceSlug(nextSlug);
    persistWorkspaceSlug(nextSlug);
  }, [routeWorkspaceSlug, setActiveWorkspaceSlug, storedWorkspaceSlug, workspace?.slug]);

  useEffect(() => {
    if (workspace || !fallbackWorkspace) {
      return;
    }

    setActiveWorkspaceSlug(fallbackWorkspace.slug);
    persistWorkspaceSlug(fallbackWorkspace.slug);
  }, [fallbackWorkspace, setActiveWorkspaceSlug, workspace]);

  const resolvedWorkspace = workspace ?? fallbackWorkspace;
  const workspaceRole = resolvedWorkspace?.currentUserRole ?? null;
  const platformAdmin = isPlatformAdmin(session?.user.role);
  const workspaceBasePath = resolvedWorkspace
    ? buildWorkspacePath(resolvedWorkspace.slug, "")
    : null;

  return {
    ...query,
    workspace: resolvedWorkspace,
    workspaceId: resolvedWorkspace?.id ?? null,
    workspaceSlug: resolvedWorkspace?.slug ?? effectiveWorkspaceSlug ?? null,
    workspaceRole,
    isPlatformAdmin: platformAdmin,
    isWorkspaceAdmin: platformAdmin || isWorkspaceAdminRole(workspaceRole),
    workspaceBasePath,
    buildWorkspaceHref: (path = "dashboard") =>
      resolvedWorkspace ? buildWorkspacePath(resolvedWorkspace.slug, path) : null,
  };
};
