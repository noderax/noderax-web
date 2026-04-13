"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Boxes, CirclePlay, ServerCog } from "lucide-react";

import { NodeTelemetryBoard } from "@/components/dashboard/node-telemetry-board";
import { RecentEventsFeed } from "@/components/dashboard/recent-events-feed";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { NodeActionMenu } from "@/components/nodes/node-action-menu";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  useControlPlaneUpdateSummary,
  useDashboardOverview,
  useQueueControlPlaneUpdateDownload,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";

export const DashboardView = () => {
  const router = useRouter();
  const { isPlatformAdmin } = useWorkspaceContext();
  const overviewQuery = useDashboardOverview();
  const controlPlaneSummaryQuery = useControlPlaneUpdateSummary(isPlatformAdmin);
  const queueControlPlaneDownload = useQueueControlPlaneUpdateDownload();
  const controlPlaneSummary = controlPlaneSummaryQuery.data;
  const controlPlaneOperation = controlPlaneSummary?.operation ?? null;
  const controlPlanePrepared = controlPlaneSummary?.preparedRelease ?? null;
  const showControlPlaneAlert = Boolean(
    isPlatformAdmin &&
      controlPlaneSummary?.supported &&
      (controlPlaneOperation ||
        controlPlanePrepared ||
        controlPlaneSummary?.updateAvailable),
  );
  const controlPlaneAlertTitle = controlPlaneOperation
    ? controlPlaneOperation.operation === "apply"
      ? "Control plane update is being applied"
      : "Control plane update download is in progress"
    : controlPlanePrepared
      ? "Control plane update is ready to apply"
      : "New control plane version available";
  const controlPlaneAlertDescription = controlPlaneOperation
    ? controlPlaneOperation.operation === "apply"
      ? "A newer control-plane build is replacing the active runtime. Open the Update Center to monitor the rollout."
      : "A newer control-plane build is being downloaded and staged. Open the Update Center to follow progress."
    : controlPlanePrepared
      ? "A newer control-plane build has already been staged on disk. Review it and confirm apply from the Update Center."
      : "A newer installer-managed control-plane build is available. Open the Update Center to download and stage it.";

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
          {showControlPlaneAlert ? (
            <SectionPanel
              eyebrow="Control Plane"
              title={controlPlaneAlertTitle}
              description={controlPlaneAlertDescription}
              variant="feature"
              action={
                controlPlaneOperation ? (
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {controlPlaneOperation.operation === "apply"
                      ? "Apply in progress"
                      : "Download in progress"}
                  </Badge>
                ) : null
              }
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full border border-tone-warning/30 bg-tone-warning/10 p-2 text-tone-warning">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {controlPlaneSummary?.currentRelease?.version ?? "Unknown"}{" "}
                      <span className="text-muted-foreground">to</span>{" "}
                      {controlPlaneSummary?.latestRelease?.version ?? "Unavailable"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Current:{" "}
                      {controlPlaneSummary?.currentRelease?.releaseId ??
                        "Unknown release"}
                      {" · "}Latest:{" "}
                      {controlPlanePrepared?.releaseId ??
                        controlPlaneSummary?.latestRelease?.releaseId ??
                        "Unavailable"}
                    </p>
                    {controlPlanePrepared ? (
                      <p className="text-xs text-muted-foreground">
                        Prepared release: {controlPlanePrepared.releaseId}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {controlPlaneSummary?.updateAvailable &&
                  !controlPlaneOperation &&
                  !controlPlanePrepared ? (
                    <Button
                      onClick={() => queueControlPlaneDownload.mutate()}
                      disabled={queueControlPlaneDownload.isPending}
                    >
                      {queueControlPlaneDownload.isPending
                        ? "Queueing download..."
                        : "Download latest update"}
                    </Button>
                  ) : null}
                  <Button
                    variant={controlPlanePrepared ? "default" : "outline"}
                    onClick={() =>
                      startTransition(() => {
                        router.push("/updates");
                      })
                    }
                  >
                    {controlPlanePrepared ? "Review and apply" : "Open Update Center"}
                  </Button>
                </div>
              </div>
            </SectionPanel>
          ) : null}

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
