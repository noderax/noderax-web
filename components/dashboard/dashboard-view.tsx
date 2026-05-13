"use client";

import { AlertTriangle, Boxes, CirclePlay, ServerCog } from "lucide-react";

import { NodeTelemetryBoard } from "@/components/dashboard/node-telemetry-board";
import { NodeMapPanel } from "@/components/dashboard/node-map-panel";
import { RecentEventsFeed } from "@/components/dashboard/recent-events-feed";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { NodeActionMenu } from "@/components/nodes/node-action-menu";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { StatStrip } from "@/components/ui/stat-strip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import { useDashboardOverview } from "@/lib/hooks/use-noderax-data";

export const DashboardView = () => {
  const overviewQuery = useDashboardOverview();

  return (
    <AppShell>
      {overviewQuery.isPending ? (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-[22px]" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
            <Skeleton className="h-[380px] rounded-[22px]" />
            <Skeleton className="h-[380px] rounded-[22px]" />
          </div>
          <Skeleton className="h-[320px] rounded-[22px]" />
        </div>
      ) : overviewQuery.isError ? (
        <EmptyState
          title="Dashboard data is unavailable"
          description="The current operational snapshot could not be loaded. Check the authenticated API connection and try again."
          icon={AlertTriangle}
          variant="plain"
          actionLabel="Retry"
          onAction={() => overviewQuery.refetch()}
        />
      ) : overviewQuery.data ? (
        <div className="space-y-6">
          <StatStrip
            items={[
              {
                label: "Node snapshot",
                value: overviewQuery.data.totals.totalNodes,
                description: "Nodes currently loaded into this dashboard snapshot window.",
                icon: Boxes,
                tone: "brand",
              },
              {
                label: "Online snapshot",
                value: overviewQuery.data.totals.onlineNodes,
                description: "Loaded snapshot nodes actively reporting recent state.",
                icon: ServerCog,
                tone: "success",
              },
              {
                label: "Task snapshot",
                value: overviewQuery.data.totals.runningTasks,
                description: "Running tasks currently present in the dashboard task window.",
                icon: CirclePlay,
                tone: "warning",
              },
              {
                label: "Failed snapshot",
                value: overviewQuery.data.totals.failedTasks,
                description: "Failed tasks currently visible in the dashboard snapshot.",
                icon: AlertTriangle,
                tone: "danger",
              },
            ]}
          />

          <NodeMapPanel nodes={overviewQuery.data.nodes} />

          <NodeTelemetryBoard nodes={overviewQuery.data.nodes} />

          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <RecentEventsFeed events={overviewQuery.data.recentEvents} />

            <SectionPanel
              eyebrow="Node Snapshot"
              title="Recent node activity"
              description="A concise view of the nodes contributing the most recent telemetry."
              contentClassName="p-0"
            >
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>CPU</TableHead>
                    <TableHead>Memory</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overviewQuery.data.nodes.slice(0, 6).map((node) => (
                    <TableRow key={node.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">{node.hostname}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <NodeStatusBadge status={node.status} />
                      </TableCell>
                      <TableCell>
                        {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
                      </TableCell>
                      <TableCell>
                        {node.latestMetric ? `${node.latestMetric.memory}%` : "N/A"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <TimeDisplay
                          value={node.lastSeenAt}
                          mode="relative"
                          emptyLabel="Never"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <NodeActionMenu
                          node={node}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionPanel>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};
