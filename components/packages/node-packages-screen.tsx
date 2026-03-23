"use client";

import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";

import { PackageMarket } from "@/components/packages/package-market";
import { PackagesPage } from "@/components/packages/packages-page";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useNode } from "@/lib/hooks/use-noderax-data";

export const NodePackagesScreen = ({
  nodeId,
  nodeName,
  standalone = false,
}: {
  nodeId: string;
  nodeName?: string;
  standalone?: boolean;
}) => {
  const authQuery = useAuthSession();
  const nodeQuery = useNode(nodeId);
  const isAdmin = authQuery.session?.user.role === "admin";
  const resolvedNodeName = nodeName ?? nodeQuery.data?.name ?? "this node";

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
              <span className="font-medium text-foreground">{resolvedNodeName}</span>.
            </p>
          </div>

          <Link
            href={`/nodes/${nodeId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Back to node detail
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      ) : null}

      {!isAdmin ? (
        <div className="surface-subtle flex items-start gap-3 rounded-[18px] border px-4 py-3">
          <div className="tone-warning flex size-10 items-center justify-center rounded-2xl border">
            <ShieldAlert className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Read-only package access</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              You can browse installed packages and search the package market, but
              only administrators can install or remove packages.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8">
        <PackagesPage
          nodeId={nodeId}
          nodeLabel={resolvedNodeName}
          canManage={Boolean(isAdmin)}
          headerAction={
            standalone ? null : (
              <Link
                href={`/nodes/${nodeId}/packages`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
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
          canManage={Boolean(isAdmin)}
        />
      </div>
    </div>
  );
};
