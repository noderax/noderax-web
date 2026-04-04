"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";

import { PackageMarket } from "@/components/packages/package-market";
import { PackagesPage } from "@/components/packages/packages-page";
import { useNode } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import { profileAllowsSurface } from "@/lib/root-access";

export const NodePackagesScreen = ({
  nodeId,
  nodeName,
  standalone = false,
}: {
  nodeId: string;
  nodeName?: string;
  standalone?: boolean;
}) => {
  const { buildWorkspaceHref, isWorkspaceAdmin } = useWorkspaceContext();
  const nodeQuery = useNode(nodeId);
  const isAdmin = isWorkspaceAdmin;
  const resolvedNodeName = nodeName ?? nodeQuery.data?.name ?? "this node";
  const hasOperationalRoot = Boolean(
    nodeQuery.data &&
    (profileAllowsSurface(
      nodeQuery.data.rootAccessAppliedProfile,
      "operational",
    ) ||
      profileAllowsSurface(nodeQuery.data.rootAccessProfile, "operational")),
  );
  const canManagePackages = Boolean(isAdmin) && hasOperationalRoot;
  const manageDisabledReason = !isAdmin
    ? "You can browse installed packages and search the package market, but only administrators can install or remove packages."
    : !nodeQuery.data
      ? "Package management availability is loading."
      : "This node needs Operational root or All root enabled before package actions can run from the panel.";

  return (
    <div className="space-y-6">
      {standalone ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Node packages
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Package management
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Browse installed packages, search package metadata, and queue
              asynchronous package tasks for{" "}
              <span className="font-medium text-foreground">
                {resolvedNodeName}
              </span>
              .
            </p>
          </div>

          <Link
            href={buildWorkspaceHref(`nodes/${nodeId}`) ?? "/workspaces"}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Back to node detail
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      ) : null}

      {!canManagePackages ? (
        <div className="surface-subtle flex items-start gap-3 rounded-[18px] border px-4 py-3">
          <div className="tone-warning flex size-10 items-center justify-center rounded-2xl border">
            <ShieldAlert className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Package actions are restricted</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {manageDisabledReason}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8">
        <PackagesPage
          nodeId={nodeId}
          nodeLabel={resolvedNodeName}
          canManage={canManagePackages}
          manageDisabledReason={manageDisabledReason}
          headerAction={
            standalone ? null : (
              <Link
                href={
                  buildWorkspaceHref(`nodes/${nodeId}/packages`) ??
                  "/workspaces"
                }
                className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-primary hover:underline"
              >
                Open full page
                <ArrowUpRight className="size-4" />
              </Link>
            )
          }
        />
        <PackageMarket
          nodeId={nodeId}
          nodeLabel={resolvedNodeName}
          canManage={canManagePackages}
          manageDisabledReason={manageDisabledReason}
        />
      </div>
    </div>
  );
};
