"use client";

import { useDeferredValue, useState } from "react";
import { Boxes, Cpu, ShieldCheck, WifiOff } from "lucide-react";

import { CreateNodeDialog } from "@/components/nodes/create-node-dialog";
import { AppShell } from "@/components/layout/app-shell";
import { NodesTable } from "@/components/nodes/nodes-table";
import { StatStrip } from "@/components/ui/stat-strip";
import { useNodes } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { NodeSummary } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const PAGE_SIZE = 25;
const EMPTY_NODES: NodeSummary[] = [];

export const NodesPageView = () => {
  const { isWorkspaceAdmin, workspace } = useWorkspaceContext();
  const searchQuery = useAppStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const [pageState, setPageState] = useState({
    index: 0,
    scope: "all:",
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");
  const pageScope = `${statusFilter}:${deferredSearchQuery}`;
  const page = pageState.scope === pageScope ? pageState.index : 0;
  const nodesQuery = useNodes({
    status: statusFilter === "all" ? undefined : statusFilter,
    search: deferredSearchQuery || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const nodes = nodesQuery.data ?? EMPTY_NODES;
  const isAdmin = isWorkspaceAdmin && !workspace?.isArchived;

  const onlineNodes = nodes.filter((node) => node.status === "online");
  const offlineNodes = nodes.filter((node) => node.status === "offline");
  const measurableNodes = nodes.filter((node) => node.latestMetric);
  const averageLoad =
    measurableNodes.length > 0
      ? Math.round(
          measurableNodes.reduce(
            (total, node) => total + (node.latestMetric?.cpu ?? 0),
            0,
          ) / measurableNodes.length,
        )
      : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <StatStrip
          items={[
            {
              label: "Visible nodes",
              value: nodes.length,
              description: "Nodes currently loaded in this inventory page.",
              icon: Boxes,
              tone: "brand",
            },
            {
              label: "Online",
              value: onlineNodes.length,
              description: "Visible nodes with healthy status and recent activity.",
              icon: ShieldCheck,
              tone: "success",
            },
            {
              label: "Offline",
              value: offlineNodes.length,
              description: "Visible nodes that need follow-up or heartbeat recovery.",
              icon: WifiOff,
              tone: "danger",
            },
            {
              label: "Avg CPU load",
              value: `${averageLoad}%`,
              description: "Average CPU across visible nodes with telemetry in this page.",
              icon: Cpu,
              tone: "warning",
            },
          ]}
        />
        <NodesTable
          nodes={nodes}
          isLoading={nodesQuery.isPending}
          isError={nodesQuery.isError}
          onRetry={() => nodesQuery.refetch()}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
          }}
          page={page}
          onPreviousPage={() =>
            setPageState({
              index: Math.max(0, page - 1),
              scope: pageScope,
            })
          }
          onNextPage={() =>
            setPageState({
              index: page + 1,
              scope: pageScope,
            })
          }
          hasNextPage={nodes.length === PAGE_SIZE}
          isAdmin={isAdmin}
          createAction={isAdmin ? <CreateNodeDialog /> : null}
        />
      </div>
    </AppShell>
  );
};
