"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Network, SquareTerminal, Timer, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

import { DeleteNodeDialog } from "@/components/nodes/delete-node-dialog";
import { NodeOsIcon } from "@/components/nodes/node-os-icon";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { NodePackagesScreen } from "@/components/packages/node-packages-screen";
import { SeverityBadge } from "@/components/severity-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { StatStrip } from "@/components/ui/stat-strip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDisableNodeMaintenance,
  useEnableNodeMaintenance,
  useNode,
  useUpdateNodeTeam,
  useWorkspaceTeams,
} from "@/lib/hooks/use-noderax-data";
import { useNodeRealtimeSubscription } from "@/lib/hooks/use-realtime";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";

const readFirstNumber = (
  record: Record<string, unknown> | null,
  keys: string[],
) => {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

const formatBytes = (value: number | null) => {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return "N/A";
  }

  if (value === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const normalized = value / 1024 ** exponent;
  const precision = normalized >= 100 ? 0 : normalized >= 10 ? 1 : 2;

  return `${normalized.toFixed(precision)} ${units[exponent]}`;
};

const formatNetworkSummary = (stats: Record<string, unknown> | null) => {
  const rxBytes = readFirstNumber(stats, [
    "rxBytes",
    "receiveBytes",
    "receivedBytes",
    "rx",
  ]);
  const txBytes = readFirstNumber(stats, [
    "txBytes",
    "transmitBytes",
    "sentBytes",
    "tx",
  ]);

  return `RX ${formatBytes(rxBytes)} / TX ${formatBytes(txBytes)}`;
};

type NodeOperationDraft = {
  sourceKey: string | null;
  selectedTeamId: "none" | string;
  maintenanceReason: string;
};

export const NodeDetailView = ({ id }: { id: string }) => {
  const router = useRouter();
  const { buildWorkspaceHref, isWorkspaceAdmin, workspace } =
    useWorkspaceContext();
  const [operationDraft, setOperationDraft] = useState<NodeOperationDraft>({
    sourceKey: null,
    selectedTeamId: "none",
    maintenanceReason: "",
  });

  useNodeRealtimeSubscription(id);

  const nodeQuery = useNode(id);
  const teamsQuery = useWorkspaceTeams();
  const updateNodeTeam = useUpdateNodeTeam();
  const enableMaintenance = useEnableNodeMaintenance();
  const disableMaintenance = useDisableNodeMaintenance();
  const node = nodeQuery.data;
  const isAdmin = isWorkspaceAdmin;

  if (nodeQuery.isError || (!nodeQuery.isPending && !node)) {
    return (
      <AppShell>
        <EmptyState
          title="Node not found"
          description="The requested node detail could not be loaded. It may have been decommissioned or is unavailable upstream."
          icon={Network}
        />
      </AppShell>
    );
  }

  if (!node) {
    return (
      <AppShell>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-[22px] bg-muted"
            />
          ))}
        </div>
      </AppShell>
    );
  }

  const operationSourceKey = `${node.id}:${node.teamId ?? "none"}:${node.maintenanceMode ? "1" : "0"}:${node.maintenanceReason ?? ""}`;
  const selectedTeamId =
    operationDraft.sourceKey === operationSourceKey
      ? operationDraft.selectedTeamId
      : (node.teamId ?? "none");
  const maintenanceReason =
    operationDraft.sourceKey === operationSourceKey
      ? operationDraft.maintenanceReason
      : (node.maintenanceReason ?? "");
  const selectedTeam =
    selectedTeamId === "none"
      ? null
      : ((teamsQuery.data ?? []).find((team) => team.id === selectedTeamId) ??
        null);
  const updateOperationDraft = (
    nextPatch: Partial<Omit<NodeOperationDraft, "sourceKey">>,
  ) => {
    setOperationDraft({
      sourceKey: operationSourceKey,
      selectedTeamId: nextPatch.selectedTeamId ?? selectedTeamId,
      maintenanceReason: nextPatch.maintenanceReason ?? maintenanceReason,
    });
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="surface-subtle flex size-12 shrink-0 items-center justify-center rounded-2xl border">
            <NodeOsIcon os={node.os} className="size-6" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {node.name}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{node.hostname}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5">
                <NodeOsIcon os={node.os} className="size-4" />
                {node.os} / {node.arch}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            workspace?.isArchived ? (
              <Button variant="outline" disabled>
                <SquareTerminal className="size-4" />
                Terminal unavailable
              </Button>
            ) : (
              <ShimmerButton
                type="button"
                className="action-btn"
                onClick={() =>
                  router.push(
                    buildWorkspaceHref(`nodes/${node.id}/terminal`) ??
                      "/workspaces",
                  )
                }
              >
                <SquareTerminal className="size-4" />
                Open terminal
              </ShimmerButton>
            )
          ) : null}
          {isAdmin ? (
            <DeleteNodeDialog
              nodeId={node.id}
              nodeName={node.name}
              triggerLabel="Delete node"
              triggerVariant="critical"
              onDeleted={() =>
                router.replace(buildWorkspaceHref("nodes") ?? "/workspaces")
              }
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">
          {node.status}
        </Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1">
          Team: {node.teamName ?? "Unassigned"}
        </Badge>
        {node.agentVersion ? (
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Agent {node.agentVersion}
          </Badge>
        ) : null}
        {node.maintenanceMode ? (
          <Badge className="rounded-full px-3 py-1">Maintenance mode</Badge>
        ) : null}
      </div>

      {node.maintenanceMode ? (
        <div className="rounded-[20px] border border-tone-warning/30 bg-tone-warning/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="tone-warning flex size-10 items-center justify-center rounded-full border">
              <Wrench className="size-4.5" />
            </div>
            <div>
              <p className="font-medium">Node is in maintenance mode</p>
              <p className="mt-1 text-sm text-muted-foreground">
                New work is blocked for this node until maintenance is cleared.
                Running tasks continue normally.
              </p>
              {node.maintenanceReason ? (
                <p className="mt-2 text-sm">
                  Reason:{" "}
                  <span className="font-medium">{node.maintenanceReason}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <StatStrip
        className={cn(
          "xl:grid-cols-5",
          // On smaller screens, allow 2 columns to avoid being too cramped
          "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        )}
        items={[
          {
            label: "Latest CPU",
            value: node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A",
            description: "Most recent reported CPU usage.",
            tone: "brand",
          },
          {
            label: "Latest memory",
            value: node.latestMetric ? `${node.latestMetric.memory}%` : "N/A",
            description: "Most recent reported memory usage.",
            tone: "success",
          },
          {
            label: "Latest disk",
            value: node.latestMetric ? `${node.latestMetric.disk}%` : "N/A",
            description: "Most recent reported disk usage.",
            tone: "warning",
          },
          {
            label: "Latest temperature",
            value:
              node.latestMetric?.temperature !== null &&
              node.latestMetric?.temperature !== undefined
                ? `${node.latestMetric.temperature.toFixed(1)}°C`
                : "N/A",
            description: "Most recent reported CPU temperature.",
            tone: "brand",
          },
          {
            label: "Network summary",
            value: formatNetworkSummary(node.networkStats),
            description: "RX bytes / TX bytes from the latest metric sample.",
            tone: "neutral",
          },
        ]}
      />

      <SectionPanel
        eyebrow="Operations"
        title="Ownership and availability"
        description="Assign the node to a team and control whether it can receive new work."
        contentClassName="space-y-4"
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 rounded-[20px] border p-4">
            <div className="space-y-1">
              <p className="font-medium">Team ownership</p>
              <p className="text-sm text-muted-foreground">
                Team-targeted tasks and schedules resolve against nodes assigned
                to that team.
              </p>
            </div>
            <Select
              value={selectedTeamId}
              onValueChange={(value) =>
                updateOperationDraft({
                  selectedTeamId: value ?? "none",
                })
              }
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a team">
                  {selectedTeamId === "none" ? "No team" : selectedTeam?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No team</SelectItem>
                {(teamsQuery.data ?? []).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ShimmerButton
              type="button"
              className="action-btn"
              disabled={
                !isAdmin ||
                updateNodeTeam.isPending ||
                selectedTeamId === (node.teamId ?? "none")
              }
              onClick={() =>
                updateNodeTeam.mutate({
                  nodeId: node.id,
                  payload: {
                    teamId:
                      selectedTeamId === "none" ? undefined : selectedTeamId,
                  },
                })
              }
            >
              {updateNodeTeam.isPending ? "Saving..." : "Save team ownership"}
            </ShimmerButton>
          </div>

          <div className="space-y-3 rounded-[20px] border p-4">
            <div className="space-y-1">
              <p className="font-medium">Maintenance mode</p>
              <p className="text-sm text-muted-foreground">
                Maintenance blocks new tasks, team broadcasts, scheduled runs,
                and claim flow for this node.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-maintenance-reason">Reason</Label>
              <Input
                id="node-maintenance-reason"
                value={maintenanceReason}
                disabled={!isAdmin}
                onChange={(event) =>
                  updateOperationDraft({
                    maintenanceReason: event.target.value,
                  })
                }
                placeholder="Kernel upgrade, package maintenance, host reboot..."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {node.maintenanceMode ? (
                <ShimmerButton
                  type="button"
                  className="action-btn"
                  disabled={!isAdmin || disableMaintenance.isPending}
                  onClick={() => disableMaintenance.mutate(node.id)}
                >
                  {disableMaintenance.isPending
                    ? "Clearing..."
                    : "Clear maintenance"}
                </ShimmerButton>
              ) : (
                <ShimmerButton
                  type="button"
                  className="action-btn"
                  disabled={!isAdmin || enableMaintenance.isPending}
                  onClick={() =>
                    enableMaintenance.mutate({
                      nodeId: node.id,
                      payload: {
                        reason: maintenanceReason.trim() || undefined,
                      },
                    })
                  }
                >
                  {enableMaintenance.isPending
                    ? "Applying..."
                    : "Enter maintenance"}
                </ShimmerButton>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Agent version
            </p>
            <p className="mt-2 font-medium">{node.agentVersion ?? "Unknown"}</p>
          </div>
          <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Platform version
            </p>
            <p className="mt-2 font-medium">
              {node.platformVersion ?? "Unknown"}
            </p>
          </div>
          <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Kernel version
            </p>
            <p className="mt-2 font-medium">
              {node.kernelVersion ?? "Unknown"}
            </p>
          </div>
        </div>
      </SectionPanel>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList
          variant="line"
          className="w-full gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1 sm:w-fit"
        >
          <TabsTrigger
            value="metrics"
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Metrics
          </TabsTrigger>
          <TabsTrigger
            value="packages"
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Packages
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg px-3 py-1.5 text-xs">
            Running tasks
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Event history
          </TabsTrigger>
        </TabsList>
        <TabsContent value="metrics" className="mt-0">
          <MetricsChart
            data={node.metrics}
            title="Node telemetry"
            description="CPU, memory, and disk samples ingested for this node."
          />
        </TabsContent>
        <TabsContent value="packages" className="mt-0">
          <NodePackagesScreen nodeId={id} nodeName={node.name} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-0">
          <SectionPanel
            eyebrow="Execution"
            title="Running tasks"
            description="Active workloads currently scheduled on this node."
            contentClassName="space-y-3"
          >
            {node.runningTasks.length ? (
              node.runningTasks.map((task) => (
                <Link
                  key={task.id}
                  href={buildWorkspaceHref(`tasks/${task.id}`) ?? "/workspaces"}
                  className="surface-subtle surface-hover block rounded-[18px] border px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {task.command ?? task.type}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="No active tasks"
                description="This node is currently idle and ready to accept new task assignments."
                icon={Timer}
                className="min-h-48"
              />
            )}
          </SectionPanel>
        </TabsContent>
        <TabsContent value="events" className="mt-0">
          <SectionPanel
            eyebrow="History"
            title="Node event history"
            description="Alerts, recoveries, and task activity recorded for this node."
            contentClassName="space-y-3"
          >
            {node.recentEvents.length ? (
              node.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="surface-subtle rounded-[18px] border px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {event.sourceLabel}
                      </p>
                    </div>
                    <SeverityBadge severity={event.severity} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.message}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState
                title="No node events yet"
                description="This node has not produced any recorded events in the selected time window."
                icon={Network}
                className="min-h-48"
              />
            )}
          </SectionPanel>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
