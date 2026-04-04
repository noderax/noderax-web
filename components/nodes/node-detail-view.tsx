"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  Network,
  Shield,
  SquareTerminal,
  Timer,
  Wrench,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useDisableNodeMaintenance,
  useEnableNodeMaintenance,
  useNode,
  useUpdateNodeRootAccess,
  useUpdateNodeTeam,
  useWorkspaceTeams,
} from "@/lib/hooks/use-noderax-data";
import { useNodeRealtimeSubscription } from "@/lib/hooks/use-realtime";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import {
  formatRootAccessProfile,
  formatRootAccessSyncStatus,
  profileToSurfaceSelection,
  ROOT_ACCESS_PROFILE_CAPABILITIES,
  surfaceSelectionToProfile,
  type RootAccessSurface,
  type RootAccessSurfaceSelection,
} from "@/lib/root-access";
import type { RootAccessProfile } from "@/lib/types";
import { TimeDisplay } from "@/components/ui/time-display";

const ReactSpeedometer = dynamic(
  () => import("react-d3-speedometer").then((module) => module.default),
  {
    ssr: false,
  },
);

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

const rootAccessSyncTone = (status: string) => {
  switch (status) {
    case "applied":
      return "default";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
};

const readRootAccessStatusDescription = (profile: RootAccessProfile) => {
  const capabilities = ROOT_ACCESS_PROFILE_CAPABILITIES[profile] ?? [];
  return capabilities[0] ?? "No capabilities available for this profile.";
};

const ROOT_ACCESS_SURFACE_OPTIONS: Array<{
  key: RootAccessSurface;
  label: string;
  description: string;
}> = [
  {
    key: "operational",
    label: "Operational root",
    description:
      "Allows package install/remove/purge and operational node actions such as apt-get update, restart agent, and reboot.",
  },
  {
    key: "task",
    label: "Task root",
    description:
      "Allows shell.exec tasks and shell-based scheduled tasks to run as root.",
  },
  {
    key: "terminal",
    label: "Terminal root",
    description: "Allows interactive terminal sessions to start as root.",
  },
];

const clampMetric = (value: number | null, max: number) => {
  if (value === null || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), max);
};

type GaugeMetricKey = "cpu" | "memory" | "disk" | "temperature";

const gaugeCardAccentClasses: Record<GaugeMetricKey, string> = {
  cpu: "border-[#2b8cff]/35 bg-gradient-to-br from-[#2b8cff]/16 to-transparent",
  memory:
    "border-[#2ea97a]/35 bg-gradient-to-br from-[#2ea97a]/16 to-transparent",
  disk: "border-[#f2a71b]/35 bg-gradient-to-br from-[#f2a71b]/16 to-transparent",
  temperature:
    "border-[#d94824]/35 bg-gradient-to-br from-[#d94824]/16 to-transparent",
};

const MetricGauge = ({
  value,
  max,
  decimals = 0,
  suffix = "%",
  startColor,
  endColor,
  ariaLabel,
}: {
  value: number | null;
  max: number;
  decimals?: number;
  suffix?: string;
  startColor: string;
  endColor: string;
  ariaLabel: string;
}) => {
  const hasValue = value !== null && Number.isFinite(value);
  const gaugeValue = clampMetric(value, max);

  return (
    <div className="mx-auto flex w-full items-center justify-center bg-transparent">
      <ReactSpeedometer
        minValue={0}
        maxValue={max}
        value={gaugeValue}
        segments={7}
        ringWidth={18}
        needleHeightRatio={0.64}
        needleTransitionDuration={280}
        startColor={startColor}
        endColor={endColor}
        needleColor="#f8fafc"
        textColor="var(--foreground)"
        valueTextFontSize="11px"
        labelFontSize="9px"
        width={170}
        height={96}
        currentValueText={
          hasValue ? `${gaugeValue.toFixed(decimals)}${suffix}` : "N/A"
        }
        svgAriaLabel={ariaLabel}
      />
    </div>
  );
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
  const [rootAccessDialogOpen, setRootAccessDialogOpen] = useState(false);
  const [
    pendingRootAccessSurfaceSelection,
    setPendingRootAccessSurfaceSelection,
  ] = useState<RootAccessSurfaceSelection>({
    operational: false,
    task: false,
    terminal: false,
  });

  useNodeRealtimeSubscription(id);

  const nodeQuery = useNode(id);
  const teamsQuery = useWorkspaceTeams();
  const updateNodeTeam = useUpdateNodeTeam();
  const updateNodeRootAccess = useUpdateNodeRootAccess();
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
  const pendingRootAccessProfile = surfaceSelectionToProfile(
    pendingRootAccessSurfaceSelection,
  );
  const rootAccessCapabilities =
    ROOT_ACCESS_PROFILE_CAPABILITIES[pendingRootAccessProfile] ?? [];
  const telemetryCards: Array<{
    key: GaugeMetricKey;
    label: string;
    value: string;
    description: string;
    gauge: {
      value: number | null;
      max: number;
      decimals?: number;
      suffix?: string;
      startColor: string;
      endColor: string;
      ariaLabel: string;
    };
  }> = [
    {
      key: "cpu",
      label: "Latest CPU",
      value: node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A",
      description: "Most recent reported CPU usage.",
      gauge: {
        value: node.latestMetric?.cpu ?? null,
        max: 100,
        startColor: "#2b8cff",
        endColor: "#0f4fbf",
        ariaLabel: "Latest CPU usage gauge",
      },
    },
    {
      key: "memory",
      label: "Latest memory",
      value: node.latestMetric ? `${node.latestMetric.memory}%` : "N/A",
      description: "Most recent reported memory usage.",
      gauge: {
        value: node.latestMetric?.memory ?? null,
        max: 100,
        startColor: "#2ea97a",
        endColor: "#0f7a53",
        ariaLabel: "Latest memory usage gauge",
      },
    },
    {
      key: "disk",
      label: "Latest disk",
      value: node.latestMetric ? `${node.latestMetric.disk}%` : "N/A",
      description: "Most recent reported disk usage.",
      gauge: {
        value: node.latestMetric?.disk ?? null,
        max: 100,
        startColor: "#f2a71b",
        endColor: "#c86b11",
        ariaLabel: "Latest disk usage gauge",
      },
    },
    {
      key: "temperature",
      label: "Latest temperature",
      value:
        node.latestMetric?.temperature !== null &&
        node.latestMetric?.temperature !== undefined
          ? `${node.latestMetric.temperature.toFixed(1)}°C`
          : "N/A",
      description: "Most recent reported CPU temperature.",
      gauge: {
        value: node.latestMetric?.temperature ?? null,
        max: 120,
        decimals: 1,
        suffix: "°C",
        startColor: "#f59b29",
        endColor: "#d94824",
        ariaLabel: "Latest CPU temperature gauge",
      },
    },
  ];

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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {telemetryCards.map((metric) => (
          <div
            key={metric.key}
            className={cn(
              "relative overflow-hidden rounded-2xl border px-4 py-3",
              gaugeCardAccentClasses[metric.key],
            )}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
            <div className="mt-2">
              <MetricGauge {...metric.gauge} />
            </div>
            <p className="mt-1 text-center text-xs leading-5 text-muted-foreground">
              {metric.description}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-subtle flex flex-col gap-2 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Network summary
        </p>
        <p className="text-sm font-medium text-foreground">
          {formatNetworkSummary(node.networkStats)}
        </p>
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList
          variant="line"
          className="w-full gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1 sm:w-fit"
        >
          <TabsTrigger
            value="operations"
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Operations
          </TabsTrigger>
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
        <TabsContent value="operations" className="mt-0">
          <SectionPanel
            eyebrow="Operations"
            title="Ownership and availability"
            description="Assign the node to a team and control whether it can receive new work."
            contentClassName="space-y-4"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="space-y-3 rounded-[20px] border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Team ownership</p>
                    <p className="text-sm text-muted-foreground">
                      Team-targeted tasks and schedules resolve against nodes
                      assigned to that team.
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
                        {selectedTeamId === "none"
                          ? "No team"
                          : selectedTeam?.name}
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
                  <Button
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
                            selectedTeamId === "none"
                              ? undefined
                              : selectedTeamId,
                        },
                      })
                    }
                  >
                    {updateNodeTeam.isPending
                      ? "Saving..."
                      : "Save team ownership"}
                  </Button>
                </div>

                <div className="space-y-3 rounded-[20px] border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Maintenance mode</p>
                    <p className="text-sm text-muted-foreground">
                      Maintenance blocks new tasks, team broadcasts, scheduled
                      runs, and claim flow for this node.
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
                      <Button
                        type="button"
                        className="action-btn"
                        disabled={!isAdmin || disableMaintenance.isPending}
                        onClick={() => disableMaintenance.mutate(node.id)}
                      >
                        {disableMaintenance.isPending
                          ? "Clearing..."
                          : "Clear maintenance"}
                      </Button>
                    ) : (
                      <Button
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
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-[20px] border p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="surface-subtle flex size-10 items-center justify-center rounded-2xl border">
                        <Shield className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium">Root access profile</p>
                        <p className="text-sm text-muted-foreground">
                          Choose which privileged panel surfaces this node
                          should allow without interactive sudo prompts.
                        </p>
                      </div>
                    </div>
                  </div>

                  <ShimmerButton
                    type="button"
                    className="action-btn border-tone-danger/30 text-tone-danger shadow-none"
                    background="color-mix(in oklch, var(--destructive) 12%, var(--card))"
                    shimmerColor="var(--destructive)"
                    disabled={!isAdmin || updateNodeRootAccess.isPending}
                    onClick={() => {
                      setPendingRootAccessSurfaceSelection(
                        profileToSurfaceSelection(node.rootAccessProfile),
                      );
                      setRootAccessDialogOpen(true);
                    }}
                  >
                    {updateNodeRootAccess.isPending
                      ? "Saving..."
                      : "Manage root access"}
                  </ShimmerButton>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    Desired: {formatRootAccessProfile(node.rootAccessProfile)}
                  </Badge>
                  <Badge variant="outline">
                    Applied:{" "}
                    {formatRootAccessProfile(node.rootAccessAppliedProfile)}
                  </Badge>
                  <Badge
                    variant={rootAccessSyncTone(node.rootAccessSyncStatus)}
                  >
                    {formatRootAccessSyncStatus(node.rootAccessSyncStatus)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Desired capabilities
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {readRootAccessStatusDescription(node.rootAccessProfile)}
                    </p>
                  </div>
                  <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Last change
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      <TimeDisplay
                        value={node.rootAccessUpdatedAt ?? null}
                        mode="relative"
                        emptyLabel="Not changed yet"
                      />
                    </p>
                  </div>
                  <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Last applied
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      <TimeDisplay
                        value={node.rootAccessLastAppliedAt ?? null}
                        mode="relative"
                        emptyLabel="Waiting for first sync"
                      />
                    </p>
                  </div>
                </div>

                {node.rootAccessLastError ? (
                  <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-tone-danger/30 bg-tone-danger/8 px-4 py-3 text-sm">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-danger" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        Last sync error
                      </p>
                      <p className="text-muted-foreground">
                        {node.rootAccessLastError}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[18px] border bg-muted/15 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Agent version
                </p>
                <p className="mt-2 font-medium">
                  {node.agentVersion ?? "Unknown"}
                </p>
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
        </TabsContent>
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

      <Dialog
        open={rootAccessDialogOpen}
        onOpenChange={(open) => {
          setRootAccessDialogOpen(open);
          if (open) {
            setPendingRootAccessSurfaceSelection(
              profileToSurfaceSelection(node.rootAccessProfile),
            );
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update root access settings</DialogTitle>
            <DialogDescription>
              Enable only the root surfaces this node needs. Settings are mapped
              to a root profile and reconciled by the agent on next control
              sync.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              {ROOT_ACCESS_SURFACE_OPTIONS.map((surfaceOption) => {
                const id = `node-root-access-${surfaceOption.key}`;
                const checked =
                  pendingRootAccessSurfaceSelection[surfaceOption.key];

                return (
                  <div
                    key={surfaceOption.key}
                    className="flex items-start justify-between gap-3 rounded-[16px] border px-4 py-3"
                  >
                    <div className="space-y-1">
                      <Label htmlFor={id} className="font-medium">
                        {surfaceOption.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {surfaceOption.description}
                      </p>
                    </div>
                    <Switch
                      id={id}
                      checked={checked}
                      onCheckedChange={(nextChecked) =>
                        setPendingRootAccessSurfaceSelection((previous) => ({
                          ...previous,
                          [surfaceOption.key]: nextChecked,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            <div className="rounded-[18px] border border-tone-warning/30 bg-tone-warning/10 px-4 py-3 text-sm">
              <p className="font-medium text-foreground">Warning</p>
              <p className="mt-1 text-muted-foreground">
                Enabling root access changes the sudo permissions granted to the
                `noderax` user on this node. The agent will reconcile the new
                profile on its next control sync.
              </p>
            </div>

            <div className="rounded-[18px] border px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Effective profile
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {formatRootAccessProfile(pendingRootAccessProfile)}
              </p>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {rootAccessCapabilities.map((capability) => (
                  <p key={capability}>{capability}</p>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRootAccessDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                updateNodeRootAccess.isPending ||
                pendingRootAccessProfile === node.rootAccessProfile
              }
              onClick={async () => {
                try {
                  await updateNodeRootAccess.mutateAsync({
                    nodeId: node.id,
                    payload: {
                      profile: pendingRootAccessProfile,
                    },
                  });
                  setRootAccessDialogOpen(false);
                } catch {
                  // Mutation toast already surfaces the backend error.
                }
              }}
            >
              {updateNodeRootAccess.isPending
                ? "Applying..."
                : "Apply settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};
