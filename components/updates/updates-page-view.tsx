"use client";

import {
  type ReactNode,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCcw,
  Server,
  ShieldAlert,
  Sparkles,
  Undo2,
  Wifi,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
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
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionPanel } from "@/components/ui/section-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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
  useAgentUpdateReleases,
  useAgentUpdateRollouts,
  useAgentUpdateSummary,
  useCancelAgentUpdateRollout,
  useControlPlaneUpdateSummary,
  useCreateAgentUpdateRollout,
  useQueueControlPlaneUpdateApply,
  useQueueControlPlaneUpdateDownload,
  usePlatformNodes,
  useResumeAgentUpdateRollout,
  useRetryAgentUpdateRolloutTarget,
  useSkipAgentUpdateRolloutTarget,
  useWorkspaces,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type {
  AgentRelease,
  AgentUpdateRollout,
  AgentUpdateRolloutTarget,
  ControlPlaneRelease,
  ControlPlaneUpdateOperation,
  NodeSummary,
  RealtimeStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const NODE_LIMIT = 500;
const SUPPORTED_ARCHES = new Set(["amd64", "arm64"]);
const EMPTY_WORKSPACES: Array<{ id: string; name: string }> = [];
const EMPTY_NODES: NodeSummary[] = [];
const EMPTY_RELEASES: AgentRelease[] = [];
const EMPTY_ROLLOUTS: AgentUpdateRollout[] = [];
const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 40] as const;
const ACTIVE_TARGET_STATUSES = new Set([
  "dispatched",
  "downloading",
  "verifying",
  "installing",
  "restarting",
  "waiting_for_reconnect",
]);
const ACTIVE_CONTROL_PLANE_UPDATE_STATUSES = new Set([
  "queued",
  "downloading",
  "verifying",
  "extracting",
  "loading_images",
  "applying",
  "recreating_services",
]);
type UpdateTabId = "control-plane" | "agents";

const getControlPlaneTone = (
  status: ControlPlaneUpdateOperation["status"] | "available" | "prepared",
) => {
  switch (status) {
    case "completed":
      return "tone-success";
    case "failed":
      return "tone-danger";
    case "prepared":
      return "tone-warning";
    case "available":
      return "tone-brand";
    default:
      return "tone-warning";
  }
};

const getControlPlaneReleaseRoleTone = (role: "Installed" | "Prepared" | "Latest") => {
  switch (role) {
    case "Installed":
      return "tone-success";
    case "Prepared":
      return "tone-warning";
    case "Latest":
      return "tone-brand";
  }
};

const formatControlPlaneRelease = (release: ControlPlaneRelease | null) => {
  if (!release) {
    return "Unavailable";
  }

  return `${release.version} · ${release.releaseId}`;
};

const getRolloutTone = (status: AgentUpdateRollout["status"]) => {
  switch (status) {
    case "completed":
      return "tone-success";
    case "paused":
      return "tone-warning";
    case "cancelled":
      return "tone-danger";
    default:
      return "tone-brand";
  }
};

const getTargetTone = (status: AgentUpdateRolloutTarget["status"]) => {
  switch (status) {
    case "completed":
      return "tone-success";
    case "failed":
      return "tone-danger";
    case "skipped":
    case "cancelled":
      return "tone-warning";
    default:
      return "tone-brand";
  }
};

const describeNodeEligibility = (
  node: NodeSummary,
  targetVersion: string | null,
) => {
  if (!targetVersion) {
    return {
      selectable: false,
      reason: "Select a release before choosing nodes.",
    };
  }

  if (node.status !== "online") {
    return {
      selectable: false,
      reason: "Offline nodes must reconnect before rollout.",
    };
  }

  if (node.maintenanceMode) {
    return {
      selectable: false,
      reason: "Maintenance mode blocks new rollout work.",
    };
  }

  if (!SUPPORTED_ARCHES.has(node.arch)) {
    return {
      selectable: false,
      reason: `Architecture ${node.arch} is not supported by official artifacts.`,
    };
  }

  if (node.agentVersion === targetVersion) {
    return {
      selectable: false,
      reason: `Already running agent ${targetVersion}.`,
    };
  }

  return {
    selectable: true,
    reason: null,
  };
};

const findFailedTargets = (rollout: AgentUpdateRollout | null) =>
  rollout?.targets.filter((target) => target.status === "failed") ?? [];

const computeRolloutProgress = (rollout: AgentUpdateRollout | null) => {
  if (!rollout || rollout.counts.total === 0) {
    return 0;
  }

  return Math.round(
    ((rollout.counts.completed + rollout.counts.skipped) /
      rollout.counts.total) *
      100,
  );
};

const findCurrentRolloutTarget = (rollout: AgentUpdateRollout | null) =>
  rollout?.targets.find((target) =>
    ACTIVE_TARGET_STATUSES.has(target.status),
  ) ??
  rollout?.targets.find((target) => target.status === "failed") ??
  rollout?.targets[0] ??
  null;

const getRealtimeTone = (status: RealtimeStatus) => {
  switch (status) {
    case "connected":
      return "tone-success";
    case "reconnecting":
    case "connecting":
    case "degraded":
      return "tone-warning";
    case "disconnected":
      return "tone-danger";
    default:
      return "tone-brand";
  }
};

const getRealtimeLabel = (status: RealtimeStatus) => {
  switch (status) {
    case "connected":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    case "connecting":
      return "Connecting";
    case "degraded":
      return "Degraded";
    case "disconnected":
      return "Offline";
    default:
      return "Idle";
  }
};

const getTargetPriority = (target: AgentUpdateRolloutTarget) => {
  if (ACTIVE_TARGET_STATUSES.has(target.status)) {
    return 0;
  }
  if (target.status === "failed") {
    return 1;
  }
  if (target.status === "pending") {
    return 2;
  }
  return 3;
};

const UpdateStatCard = ({
  label,
  value,
  description,
  icon,
  tone = "tone-brand",
}: {
  label: string;
  value: ReactNode;
  description: ReactNode;
  icon: ReactNode;
  tone?: string;
}) => (
  <div className="rounded-[22px] border border-border/70 bg-background/82 p-4 shadow-[var(--shadow-dashboard)]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <div className="mt-3 text-2xl font-semibold tracking-tight">
          {value}
        </div>
      </div>
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-2xl border bg-background/80",
          tone,
        )}
      >
        {icon}
      </div>
    </div>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">
      {description}
    </p>
  </div>
);

const RolloutTargetCard = ({
  target,
  compact = false,
}: {
  target: AgentUpdateRolloutTarget;
  compact?: boolean;
}) => (
  <div
    className={cn(
      "rounded-[22px] border border-border/70 bg-background/82 p-4 shadow-[var(--shadow-dashboard)]",
      compact ? "space-y-3" : "space-y-4",
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{target.nodeNameSnapshot}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {target.previousVersion ?? "unknown"} to {target.targetVersion}
        </p>
      </div>
      <Badge
        variant="outline"
        className={cn("rounded-full px-3 py-1", getTargetTone(target.status))}
      >
        {target.status}
      </Badge>
    </div>

    <Progress value={target.progressPercent}>
      <ProgressLabel className="text-xs">
        {target.progressPercent}% complete
      </ProgressLabel>
      <ProgressValue />
    </Progress>

    <p className="text-sm leading-6 text-muted-foreground">
      {target.statusMessage ?? "Waiting for the next rollout action."}
    </p>

    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="font-mono">
        {target.taskId ? target.taskId.slice(0, 8) : "Pending"}
      </span>
      <TimeDisplay value={target.updatedAt} mode="datetime" />
    </div>
  </div>
);

const TablePaginationBar = ({
  itemLabel,
  total,
  pageCount,
  currentPageIndex,
  pageSize,
  rangeStart,
  rangeEnd,
  onPageSizeChange,
  onPreviousPage,
  onNextPage,
}: {
  itemLabel: string;
  total: number;
  pageCount: number;
  currentPageIndex: number;
  pageSize: (typeof TABLE_PAGE_SIZE_OPTIONS)[number];
  rangeStart: number;
  rangeEnd: number;
  onPageSizeChange: (
    pageSize: (typeof TABLE_PAGE_SIZE_OPTIONS)[number],
  ) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}) => (
  <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">
        {total > 0 ? (
          <>
            Showing{" "}
            <span className="font-semibold text-foreground">
              {rangeStart}-{rangeEnd}
            </span>{" "}
            of <span className="font-semibold text-foreground">{total}</span>{" "}
            {itemLabel}
          </>
        ) : (
          <>0 {itemLabel}</>
        )}
      </p>
      <Select
        value={String(pageSize)}
        onValueChange={(value) =>
          onPageSizeChange(
            Number(value) as (typeof TABLE_PAGE_SIZE_OPTIONS)[number],
          )
        }
      >
        <SelectTrigger className="h-9 min-w-32">
          <SelectValue placeholder="Rows" />
        </SelectTrigger>
        <SelectContent>
          {TABLE_PAGE_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option} rows
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex items-center justify-between gap-2 sm:justify-end">
      <Button
        variant="outline"
        size="sm"
        onClick={onPreviousPage}
        disabled={currentPageIndex === 0}
      >
        <ArrowLeft className="size-4" />
        Previous
      </Button>
      <div className="rounded-full border border-border/70 px-3 py-1.5 text-xs text-muted-foreground">
        Page {currentPageIndex + 1} / {pageCount}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onNextPage}
        disabled={currentPageIndex >= pageCount - 1}
      >
        Next
        <ArrowRight className="size-4" />
      </Button>
    </div>
  </div>
);

export const UpdatesPageView = () => {
  const { isPlatformAdmin } = useWorkspaceContext();
  const workspacesQuery = useWorkspaces(isPlatformAdmin);
  const controlPlaneSummaryQuery = useControlPlaneUpdateSummary(isPlatformAdmin);
  const summaryQuery = useAgentUpdateSummary(isPlatformAdmin);
  const releasesQuery = useAgentUpdateReleases(isPlatformAdmin);
  const rolloutsQuery = useAgentUpdateRollouts(isPlatformAdmin);
  const nodesQuery = usePlatformNodes({ limit: NODE_LIMIT }, isPlatformAdmin);
  const queueControlPlaneDownload = useQueueControlPlaneUpdateDownload();
  const queueControlPlaneApply = useQueueControlPlaneUpdateApply();
  const createRollout = useCreateAgentUpdateRollout();
  const resumeRollout = useResumeAgentUpdateRollout();
  const cancelRollout = useCancelAgentUpdateRollout();
  const retryTarget = useRetryAgentUpdateRolloutTarget();
  const skipTarget = useSkipAgentUpdateRolloutTarget();
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);
  const realtimeHealth = useAppStore((state) => state.realtimeHealth);

  const [releaseSelection, setReleaseSelection] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const [maintenanceFilter, setMaintenanceFilter] = useState<
    "all" | "active" | "maintenance"
  >("all");
  const [archFilter, setArchFilter] = useState("all");
  const [versionFilter, setVersionFilter] = useState("all");
  const [nodePageSize, setNodePageSize] =
    useState<(typeof TABLE_PAGE_SIZE_OPTIONS)[number]>(10);
  const [nodePageIndex, setNodePageIndex] = useState(0);
  const [historyPageSize, setHistoryPageSize] =
    useState<(typeof TABLE_PAGE_SIZE_OPTIONS)[number]>(10);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] =
    useState<UpdateTabId>("control-plane");
  const [hasUserSelectedTab, setHasUserSelectedTab] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const workspaces = workspacesQuery.data ?? EMPTY_WORKSPACES;
  const nodes = nodesQuery.data ?? EMPTY_NODES;
  const releases = releasesQuery.data ?? EMPTY_RELEASES;
  const recentRollouts = rolloutsQuery.data ?? EMPTY_ROLLOUTS;
  const controlPlaneSummary = controlPlaneSummaryQuery.data ?? null;
  const controlPlaneOperation = controlPlaneSummary?.operation ?? null;
  const controlPlanePreparedRelease = controlPlaneSummary?.preparedRelease ?? null;
  const controlPlaneHasActiveOperation = Boolean(
    controlPlaneOperation &&
      ACTIVE_CONTROL_PLANE_UPDATE_STATUSES.has(controlPlaneOperation.status),
  );
  const activeRollout = summaryQuery.data?.activeRollout ?? null;
  const latestRelease = summaryQuery.data?.latestRelease ?? null;
  const isRefreshingData =
    controlPlaneSummaryQuery.isFetching ||
    summaryQuery.isFetching ||
    releasesQuery.isFetching ||
    rolloutsQuery.isFetching ||
    nodesQuery.isFetching;
  const controlPlaneTabHasUpdate = Boolean(
    controlPlaneHasActiveOperation ||
      controlPlanePreparedRelease ||
      controlPlaneSummary?.updateAvailable,
  );
  const agentTabHasUpdate = Boolean(
    activeRollout || (summaryQuery.data?.outdatedNodeCount ?? 0) > 0,
  );
  const controlPlaneTabLabel = controlPlaneHasActiveOperation
    ? controlPlaneOperation?.operation === "apply"
      ? "Applying"
      : "Downloading"
    : controlPlanePreparedRelease
      ? "Ready"
      : controlPlaneSummary?.updateAvailable
        ? "New"
        : null;
  const agentTabLabel = activeRollout
    ? activeRollout.rollback
      ? "Rollback live"
      : "Rollout live"
    : (summaryQuery.data?.eligibleOutdatedNodeCount ?? 0) > 0
      ? `${summaryQuery.data?.eligibleOutdatedNodeCount} ready`
      : (summaryQuery.data?.outdatedNodeCount ?? 0) > 0
      ? `${summaryQuery.data?.outdatedNodeCount} outdated`
        : null;
  const recommendedTab: UpdateTabId = controlPlaneTabHasUpdate
    ? "control-plane"
    : agentTabHasUpdate
      ? "agents"
      : "control-plane";
  const activeTab = hasUserSelectedTab ? selectedTab : recommendedTab;
  const controlPlaneReleaseNotes = useMemo(() => {
    const releaseEntries = [
      {
        release: controlPlaneSummary?.latestRelease ?? null,
        role: "Latest" as const,
      },
      {
        release: controlPlanePreparedRelease,
        role: "Prepared" as const,
      },
      {
        release: controlPlaneSummary?.currentRelease ?? null,
        role: "Installed" as const,
      },
    ].filter(
      (entry): entry is {
        release: NonNullable<typeof entry.release>;
        role: typeof entry.role;
      } => Boolean(entry.release),
    );

    const releaseMap = new Map<
      string,
      {
        release: (typeof releaseEntries)[number]["release"];
        roles: Array<(typeof releaseEntries)[number]["role"]>;
      }
    >();

    releaseEntries.forEach(({ release, role }) => {
      const key = release.releaseId || release.version;
      const existing = releaseMap.get(key);

      if (existing) {
        if (!existing.roles.includes(role)) {
          existing.roles.push(role);
        }
        if (!existing.release.changelog?.length && release.changelog?.length) {
          existing.release = release;
        }
        return;
      }

      releaseMap.set(key, {
        release,
        roles: [role],
      });
    });

    const rolePriority = {
      Latest: 0,
      Prepared: 1,
      Installed: 2,
    } as const;

    return Array.from(releaseMap.values()).sort((left, right) => {
      const leftPriority = Math.min(
        ...left.roles.map((role) => rolePriority[role]),
      );
      const rightPriority = Math.min(
        ...right.roles.map((role) => rolePriority[role]),
      );

      return (
        leftPriority - rightPriority ||
        (right.release.releasedAt ?? "").localeCompare(
          left.release.releasedAt ?? "",
        )
      );
    });
  }, [
    controlPlanePreparedRelease,
    controlPlaneSummary?.currentRelease,
    controlPlaneSummary?.latestRelease,
  ]);

  const workspaceNameById = useMemo(
    () =>
      new Map(
        workspaces.map((workspace) => [workspace.id, workspace.name] as const),
      ),
    [workspaces],
  );

  const workspaceOptions = useMemo(
    () =>
      Array.from(new Set(nodes.map((node) => node.workspaceId).filter(Boolean)))
        .map((workspaceId) => ({
          id: workspaceId,
          name: workspaceNameById.get(workspaceId) ?? workspaceId,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [nodes, workspaceNameById],
  );

  const teamOptions = useMemo(
    () =>
      Array.from(
        new Map(
          nodes
            .filter((node) => node.teamId && node.teamName)
            .map((node) => [node.teamId!, node.teamName!] as const),
        ),
      )
        .map(([id, name]) => ({ id, name }))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [nodes],
  );

  const versionOptions = useMemo(
    () =>
      Array.from(
        new Set(nodes.map((node) => node.agentVersion ?? "unknown")),
      ).sort((left, right) => left.localeCompare(right)),
    [nodes],
  );

  const selectedRelease = releaseSelection
    ? (releases.find((release) => release.version === releaseSelection) ??
      latestRelease)
    : latestRelease;
  const selectedTargetVersion = selectedRelease?.version ?? null;
  const rollbackMode =
    Boolean(selectedTargetVersion && latestRelease?.version) &&
    selectedTargetVersion !== latestRelease?.version;

  const filteredNodes = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return nodes.filter((node) => {
      if (workspaceFilter !== "all" && node.workspaceId !== workspaceFilter) {
        return false;
      }
      if (teamFilter !== "all" && node.teamId !== teamFilter) {
        return false;
      }
      if (statusFilter !== "all" && node.status !== statusFilter) {
        return false;
      }
      if (maintenanceFilter === "active" && node.maintenanceMode) {
        return false;
      }
      if (maintenanceFilter === "maintenance" && !node.maintenanceMode) {
        return false;
      }
      if (archFilter !== "all" && node.arch !== archFilter) {
        return false;
      }
      if (
        versionFilter !== "all" &&
        (node.agentVersion ?? "unknown") !== versionFilter
      ) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }

      return [
        node.name,
        node.hostname,
        node.teamName ?? "",
        node.agentVersion ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [
    archFilter,
    deferredSearch,
    maintenanceFilter,
    nodes,
    statusFilter,
    teamFilter,
    versionFilter,
    workspaceFilter,
  ]);

  const eligibilityByNodeId = useMemo(
    () =>
      new Map(
        nodes.map(
          (node) =>
            [
              node.id,
              describeNodeEligibility(node, selectedTargetVersion),
            ] as const,
        ),
      ),
    [nodes, selectedTargetVersion],
  );

  const selectableFilteredNodes = filteredNodes.filter(
    (node) => eligibilityByNodeId.get(node.id)?.selectable,
  );

  const effectiveSelectedNodeIds = useMemo(
    () =>
      selectedNodeIds.filter(
        (nodeId) => eligibilityByNodeId.get(nodeId)?.selectable,
      ),
    [eligibilityByNodeId, selectedNodeIds],
  );

  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node] as const)),
    [nodes],
  );

  const activeTargetByNodeId = useMemo(
    () =>
      new Map(
        (activeRollout?.targets ?? []).map((target) => [target.nodeId, target]),
      ),
    [activeRollout],
  );

  const prioritizedFilteredNodes = useMemo(() => {
    return [...filteredNodes].sort((left, right) => {
      const leftTarget = activeTargetByNodeId.get(left.id);
      const rightTarget = activeTargetByNodeId.get(right.id);
      const leftSelected = effectiveSelectedNodeIds.includes(left.id) ? 1 : 0;
      const rightSelected = effectiveSelectedNodeIds.includes(right.id) ? 1 : 0;
      const leftReady = eligibilityByNodeId.get(left.id)?.selectable ? 1 : 0;
      const rightReady = eligibilityByNodeId.get(right.id)?.selectable ? 1 : 0;

      return (
        Number(Boolean(rightTarget)) - Number(Boolean(leftTarget)) ||
        rightSelected - leftSelected ||
        rightReady - leftReady ||
        left.name.localeCompare(right.name)
      );
    });
  }, [
    activeTargetByNodeId,
    effectiveSelectedNodeIds,
    eligibilityByNodeId,
    filteredNodes,
  ]);

  const selectedNodesPreview = useMemo(
    () =>
      effectiveSelectedNodeIds
        .map((nodeId) => nodesById.get(nodeId))
        .filter((node): node is NodeSummary => Boolean(node))
        .slice(0, 5),
    [effectiveSelectedNodeIds, nodesById],
  );

  const liveRolloutTargets = useMemo(
    () =>
      [...(activeRollout?.targets ?? [])]
        .sort((left, right) => {
          return (
            getTargetPriority(left) - getTargetPriority(right) ||
            right.updatedAt.localeCompare(left.updatedAt)
          );
        })
        .slice(0, 10),
    [activeRollout],
  );

  const rolloutProgress = computeRolloutProgress(activeRollout);
  const currentRolloutTarget = findCurrentRolloutTarget(activeRollout);
  const failedTargets = findFailedTargets(activeRollout);
  const filteredBlockedNodeCount = Math.max(
    filteredNodes.length - selectableFilteredNodes.length,
    0,
  );
  const canResumeActiveRollout =
    activeRollout?.status === "paused" && failedTargets.length === 0;
  const isBusy =
    createRollout.isPending ||
    resumeRollout.isPending ||
    cancelRollout.isPending ||
    retryTarget.isPending ||
    skipTarget.isPending;

  const visibleTransitionCount = prioritizedFilteredNodes.filter((node) =>
    activeTargetByNodeId.has(node.id),
  ).length;

  const visibleOnlineCount = prioritizedFilteredNodes.filter(
    (node) => node.status === "online",
  ).length;

  const nodePageCount = Math.max(
    1,
    Math.ceil(prioritizedFilteredNodes.length / nodePageSize),
  );
  const currentNodePageIndex = Math.min(nodePageIndex, nodePageCount - 1);
  const nodePageStart = currentNodePageIndex * nodePageSize;
  const paginatedNodes = prioritizedFilteredNodes.slice(
    nodePageStart,
    nodePageStart + nodePageSize,
  );
  const nodeRangeStart = paginatedNodes.length ? nodePageStart + 1 : 0;
  const nodeRangeEnd = nodePageStart + paginatedNodes.length;

  const historyPageCount = Math.max(
    1,
    Math.ceil(recentRollouts.length / historyPageSize),
  );
  const currentHistoryPageIndex = Math.min(
    historyPageIndex,
    historyPageCount - 1,
  );
  const historyPageStart = currentHistoryPageIndex * historyPageSize;
  const paginatedRollouts = recentRollouts.slice(
    historyPageStart,
    historyPageStart + historyPageSize,
  );
  const historyRangeStart = paginatedRollouts.length ? historyPageStart + 1 : 0;
  const historyRangeEnd = historyPageStart + paginatedRollouts.length;

  const commandDeckPanel = (
    <SectionPanel
      eyebrow="Command deck"
      title="Rollout controls"
      description="Keep target selection, quick actions, and live operator context in one persistent rail."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
          <p className="text-xs text-muted-foreground">Target release</p>
          <p className="mt-1 text-lg font-semibold">
            {selectedRelease?.version ?? "None selected"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {rollbackMode ? "Rollback mode" : "Update mode"}
          </p>
        </div>
        <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
          <p className="text-xs text-muted-foreground">Selection</p>
          <p className="mt-1 text-lg font-semibold">
            {effectiveSelectedNodeIds.length} nodes
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectableFilteredNodes.length} eligible in the current filter.
          </p>
        </div>
        <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
          <p className="text-xs text-muted-foreground">Filter pressure</p>
          <p className="mt-1 text-lg font-semibold">
            {filteredBlockedNodeCount} blocked
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Offline, maintenance, unsupported, or already updated nodes.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <Button
          disabled={
            !selectedRelease ||
            effectiveSelectedNodeIds.length === 0 ||
            Boolean(activeRollout) ||
            createRollout.isPending
          }
          onClick={() =>
            createRollout.mutate({
              nodeIds: effectiveSelectedNodeIds,
              version: selectedRelease?.version,
              rollback: rollbackMode,
            })
          }
        >
          {createRollout.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : rollbackMode ? (
            <Undo2 className="size-4" />
          ) : (
            <ArrowUpCircle className="size-4" />
          )}
          {rollbackMode ? "Start rollback" : "Start rollout"}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setSelectedNodeIds(selectableFilteredNodes.map((node) => node.id))
          }
          disabled={!selectableFilteredNodes.length || Boolean(activeRollout)}
        >
          Select eligible filtered
        </Button>
        <Button
          variant="ghost"
          onClick={() => setSelectedNodeIds([])}
          disabled={!effectiveSelectedNodeIds.length}
        >
          Clear selection
        </Button>
      </div>

      <div className="mt-5 rounded-[22px] border border-border/70 bg-background/82 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Selected nodes
        </p>
        {selectedNodesPreview.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedNodesPreview.map((node) => (
              <Badge
                key={node.id}
                variant="outline"
                className="rounded-full px-3 py-1"
              >
                {node.name}
              </Badge>
            ))}
            {effectiveSelectedNodeIds.length > selectedNodesPreview.length ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                +{effectiveSelectedNodeIds.length - selectedNodesPreview.length}{" "}
                more
              </Badge>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Select one or more eligible nodes from the fleet board to stage the
            next rollout.
          </p>
        )}
      </div>

      {activeRollout ? (
        <p className="mt-4 text-sm text-muted-foreground">
          A rollout is already active. Finish, skip, retry, or cancel it before
          starting another one.
        </p>
      ) : null}
    </SectionPanel>
  );

  const activeRolloutPanel = (
    <div className="rounded-[24px] border border-border/70 bg-background/80 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Active rollout
          </p>
          <h3 className="text-2xl font-semibold tracking-tight">
            {activeRollout ? activeRollout.targetVersion : "No active rollout"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Live queue cards update as targets move through download, install,
            restart, and reconnect confirmation.
          </p>
        </div>

        {activeRollout ? (
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-3 py-1",
                getRolloutTone(activeRollout.status),
              )}
            >
              {activeRollout.status}
            </Badge>
            {canResumeActiveRollout ? (
              <Button
                variant="outline"
                onClick={() => resumeRollout.mutate(activeRollout.id)}
                disabled={isBusy}
              >
                Resume
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => cancelRollout.mutate(activeRollout.id)}
              disabled={isBusy || activeRollout.status === "cancelled"}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>

      {!activeRollout ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
            <p className="text-xs text-muted-foreground">
              Current latest target
            </p>
            <p className="mt-1 font-semibold">
              {latestRelease?.version ?? "Waiting for release metadata"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              When a rollout starts, the active queue and node progress will
              land here without moving you away from the target summary.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
            <p className="text-xs text-muted-foreground">Queue state</p>
            <p className="mt-1 font-semibold">Idle</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Build a selection, choose the target release, and start the next
              update or rollback from the command deck.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Progress value={rolloutProgress}>
            <ProgressLabel>Overall progress</ProgressLabel>
            <ProgressValue>
              {(_, value) => `${value ?? rolloutProgress}%`}
            </ProgressValue>
          </Progress>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
              <p className="text-xs text-muted-foreground">Current node</p>
              <p className="mt-1 font-semibold">
                {currentRolloutTarget?.nodeNameSnapshot ?? "Queued"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {currentRolloutTarget?.statusMessage ??
                  "Waiting for the next target to start."}
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
              <p className="text-xs text-muted-foreground">Queue mix</p>
              <p className="mt-1 font-semibold">
                {activeRollout.counts.completed}/{activeRollout.counts.total}{" "}
                complete
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeRollout.counts.active} active,{" "}
                {activeRollout.counts.pending} pending,{" "}
                {activeRollout.counts.failed} failed
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
              <p className="text-xs text-muted-foreground">Targets</p>
              <p className="mt-1 font-semibold">{activeRollout.counts.total}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeRollout.rollback ? "Rollback" : "Update"} queue is live
                and streaming into the board below.
              </p>
            </div>
          </div>

          {failedTargets.length ? (
            <div className="space-y-3">
              {failedTargets.map((target) => (
                <div
                  key={target.id}
                  className="rounded-[22px] border border-tone-warning/30 bg-tone-warning/6 p-4"
                >
                  <p className="font-medium">{target.nodeNameSnapshot}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {target.statusMessage ??
                      "This target failed and paused the rollout."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        retryTarget.mutate({
                          rolloutId: activeRollout.id,
                          targetId: target.id,
                        })
                      }
                      disabled={isBusy}
                    >
                      Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        skipTarget.mutate({
                          rolloutId: activeRollout.id,
                          targetId: target.id,
                        })
                      }
                      disabled={isBusy}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <ScrollArea className="h-[24rem] pr-1">
            <div className="grid gap-3">
              {liveRolloutTargets.map((target) => (
                <RolloutTargetCard key={target.id} target={target} />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );

  if (!isPlatformAdmin) {
    return (
      <AppShell>
        <EmptyState
          title="Updates are restricted"
          description="Only platform admins can review official agent releases and orchestrate fleet updates."
          icon={ShieldAlert}
        />
      </AppShell>
    );
  }

  if (summaryQuery.isError || releasesQuery.isError || nodesQuery.isError) {
    return (
      <AppShell>
        <EmptyState
          title="Update center is unavailable"
          description="The official release summary or fleet inventory could not be loaded from the authenticated API connection."
          icon={AlertTriangle}
          actionLabel="Retry"
          onAction={() => {
            void controlPlaneSummaryQuery.refetch();
            void summaryQuery.refetch();
            void releasesQuery.refetch();
            void rolloutsQuery.refetch();
            void nodesQuery.refetch();
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <SectionPanel
          eyebrow="Update Center"
          title="Managed release operations"
          description="Switch between control-plane and agent update flows. Tabs indicate where newer builds, staged work, or live rollout activity exist."
          variant="feature"
        >
          <div
            role="tablist"
            aria-label="Update areas"
            className="flex w-full flex-wrap items-center gap-2 overflow-x-auto border-b border-border/70 pb-1"
          >
            <button
              id="control-plane-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "control-plane"}
              className={cn(
                "inline-flex min-w-fit items-center justify-start gap-2 border-b-2 px-1.5 py-2 text-sm font-medium transition-colors sm:min-w-[220px] sm:px-2.5",
                activeTab === "control-plane"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setHasUserSelectedTab(true);
                setSelectedTab("control-plane");
              }}
            >
              <Server className="size-4" />
              <span>Control plane</span>
              {controlPlaneTabLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px]",
                    controlPlaneHasActiveOperation
                      ? getControlPlaneTone(
                          controlPlaneOperation?.status ?? "queued",
                        )
                      : controlPlanePreparedRelease
                        ? getControlPlaneTone("prepared")
                        : "tone-brand",
                  )}
                >
                  {controlPlaneTabLabel}
                </Badge>
              ) : null}
            </button>
            <button
              id="agent-updates-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "agents"}
              className={cn(
                "inline-flex min-w-fit items-center justify-start gap-2 border-b-2 px-1.5 py-2 text-sm font-medium transition-colors sm:min-w-[220px] sm:px-2.5",
                activeTab === "agents"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setHasUserSelectedTab(true);
                setSelectedTab("agents");
              }}
            >
              <ArrowUpCircle className="size-4" />
              <span>Agent updates</span>
              {agentTabLabel ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px]",
                    activeRollout ? getRolloutTone(activeRollout.status) : "tone-brand",
                  )}
                >
                  {agentTabLabel}
                </Badge>
              ) : null}
            </button>
          </div>
        </SectionPanel>

        {activeTab === "control-plane" ? (
          <div
            role="tabpanel"
            aria-labelledby="control-plane-tab"
            className="space-y-4"
          >
            <SectionPanel
              eyebrow="Release Center"
              title="Control plane updates"
              description="Track the installer-managed control plane, stage the latest official bundle, and confirm runtime apply only after the new release is ready on disk."
              variant="feature"
              action={
                <>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Installer-managed only
                  </Badge>
                  {controlPlaneHasActiveOperation ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1",
                        getControlPlaneTone(controlPlaneOperation?.status ?? "available"),
                      )}
                    >
                      {controlPlaneOperation?.operation === "apply"
                        ? "Applying"
                        : "Downloading"}
                    </Badge>
                  ) : controlPlanePreparedRelease ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1",
                        getControlPlaneTone("prepared"),
                      )}
                    >
                      Prepared
                    </Badge>
                  ) : null}
                </>
              }
            >
              {controlPlaneSummaryQuery.isPending ? (
                <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
                  <Skeleton className="h-[220px] rounded-[24px]" />
                  <Skeleton className="h-[220px] rounded-[24px]" />
                </div>
              ) : controlPlaneSummaryQuery.isError ? (
                <EmptyState
                  title="Control-plane updates are unavailable"
                  description="The authenticated API connection could not load the installer-managed control-plane update summary."
                  icon={AlertTriangle}
                  variant="plain"
                  actionLabel="Retry"
                  onAction={() => {
                    void controlPlaneSummaryQuery.refetch();
                  }}
                />
              ) : controlPlaneSummary?.supported ? (
                <div className="grid gap-4 lg:grid-cols-[1.25fr_0.95fr]">
                  <div
                    className="overflow-hidden rounded-[30px] border border-border/70 p-5 shadow-[var(--shadow-dashboard-hover)]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at top left, color-mix(in oklch, var(--primary) 14%, transparent), transparent 36%), radial-gradient(circle at 88% 18%, color-mix(in oklch, var(--semantic-success) 12%, transparent), transparent 24%), linear-gradient(180deg, color-mix(in oklch, var(--surface-feature) 85%, white 15%), var(--surface-feature))",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        <Sparkles className="mr-1 size-3.5" />
                        Latest-only channel
                      </Badge>
                      {controlPlaneSummary.updateAvailable ? (
                        <Badge className="rounded-full px-3 py-1">
                          Latest {controlPlaneSummary.latestRelease?.version}
                        </Badge>
                      ) : null}
                      {controlPlanePreparedRelease ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-3 py-1",
                            getControlPlaneTone("prepared"),
                          )}
                        >
                          Prepared
                        </Badge>
                      ) : null}
                    </div>

                    <div className="mt-5 max-w-3xl">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Control-plane runtime
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.45rem]">
                        <AnimatedGradientText
                          className="font-semibold"
                          colorFrom="#d95f31"
                          colorTo="#ffb54c"
                          speed={1.2}
                        >
                          Stage first, apply deliberately
                        </AnimatedGradientText>
                      </h2>
                      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                        Downloads run on the host supervisor and only mutate the live
                        runtime after an explicit apply confirmation.
                      </p>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      {controlPlaneSummary.updateAvailable &&
                      !controlPlaneHasActiveOperation &&
                      !controlPlanePreparedRelease ? (
                        <ShimmerButton
                          className="action-btn"
                          onClick={() => queueControlPlaneDownload.mutate()}
                          disabled={queueControlPlaneDownload.isPending}
                        >
                          {queueControlPlaneDownload.isPending
                            ? "Queueing download..."
                            : "Download latest update"}
                        </ShimmerButton>
                      ) : null}
                      {controlPlanePreparedRelease ? (
                        <Button onClick={() => setIsApplyDialogOpen(true)}>
                          Apply prepared update
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        onClick={() => {
                          void controlPlaneSummaryQuery.refetch();
                        }}
                      >
                        Refresh control plane
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <UpdateStatCard
                      label="Current build"
                      value={formatControlPlaneRelease(controlPlaneSummary.currentRelease)}
                      description={
                        controlPlaneSummary.currentRelease?.releasedAt ? (
                          <TimeDisplay
                            value={controlPlaneSummary.currentRelease.releasedAt}
                            mode="datetime"
                          />
                        ) : (
                          "Current release timestamp unavailable."
                        )
                      }
                      icon={<Server className="size-4" />}
                    />
                    <UpdateStatCard
                      label="Latest build"
                      value={formatControlPlaneRelease(controlPlaneSummary.latestRelease)}
                      description={
                        controlPlaneSummary.latestRelease?.releasedAt ? (
                          <TimeDisplay
                            value={controlPlaneSummary.latestRelease.releasedAt}
                            mode="datetime"
                          />
                        ) : (
                          "Latest release feed unavailable."
                        )
                      }
                      icon={<ArrowUpCircle className="size-4" />}
                      tone={
                        controlPlaneSummary.updateAvailable
                          ? "tone-brand"
                          : "tone-success"
                      }
                    />
                    <UpdateStatCard
                      label="Prepared build"
                      value={formatControlPlaneRelease(controlPlanePreparedRelease)}
                      description={
                        controlPlaneOperation?.message ??
                        "No staged control-plane release is waiting to be applied."
                      }
                      icon={
                        controlPlaneOperation?.status === "failed" ? (
                          <AlertTriangle className="size-4" />
                        ) : (
                          <Clock3 className="size-4" />
                        )
                      }
                      tone={
                        controlPlaneOperation?.status === "failed"
                          ? "tone-danger"
                          : controlPlanePreparedRelease
                            ? "tone-warning"
                            : "tone-brand"
                      }
                    />
                  </div>

                  <SectionPanel
                    eyebrow="Operation"
                    title="Control-plane state"
                    description="The host-side supervisor updates this state while downloading, verifying, extracting, or applying the prepared release."
                    className="lg:col-span-2"
                  >
                    {controlPlaneOperation ? (
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                        <div className="space-y-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-3 py-1",
                              getControlPlaneTone(controlPlaneOperation.status),
                            )}
                          >
                            {controlPlaneOperation.operation} {controlPlaneOperation.status}
                          </Badge>
                          <p className="text-sm leading-7 text-muted-foreground">
                            {controlPlaneOperation.error ??
                              controlPlaneOperation.message ??
                              "Waiting for the next control-plane update action."}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>
                              Requested <TimeDisplay value={controlPlaneOperation.requestedAt} mode="datetime" />
                            </span>
                            {controlPlaneOperation.completedAt ? (
                              <span>
                                Completed <TimeDisplay value={controlPlaneOperation.completedAt} mode="datetime" />
                              </span>
                            ) : null}
                            {controlPlaneOperation.rollbackStatus ? (
                              <span>Rollback {controlPlaneOperation.rollbackStatus}</span>
                            ) : null}
                          </div>
                        </div>
                        {controlPlanePreparedRelease &&
                        !controlPlaneHasActiveOperation ? (
                          <Button onClick={() => setIsApplyDialogOpen(true)}>
                            Apply prepared update
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm leading-7 text-muted-foreground">
                        No control-plane update operation is active. If the latest
                        release differs from the installed build, you can stage it
                        here and confirm the apply separately.
                      </p>
                    )}
                  </SectionPanel>

                  <SectionPanel
                    eyebrow="Release notes"
                    title="Control-plane changelog"
                    description="Review the installer-managed release notes for the installed, prepared, and latest platform builds."
                    className="lg:col-span-2"
                  >
                    {!controlPlaneReleaseNotes.length ? (
                      <EmptyState
                        title="No release notes available"
                        description="Release notes appear here when the current catalog manifest includes changelog sections."
                        icon={Clock3}
                        variant="plain"
                      />
                    ) : (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {controlPlaneReleaseNotes.map(({ release, roles }) => (
                          <div
                            key={release.releaseId}
                            className="rounded-[24px] border border-border/70 bg-background/82 p-5 shadow-[var(--shadow-dashboard)]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full px-3 py-1">
                                    {release.version}
                                  </Badge>
                                  {roles.map((role) => (
                                    <Badge
                                      key={`${release.releaseId}-${role}`}
                                      variant="outline"
                                      className={cn(
                                        "rounded-full px-3 py-1",
                                        getControlPlaneReleaseRoleTone(role),
                                      )}
                                    >
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                                <p className="mt-3 text-xs text-muted-foreground">
                                  Release ID
                                </p>
                                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                                  {release.releaseId}
                                </p>
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                <p>Published</p>
                                <p className="mt-1 font-medium text-foreground">
                                  {release.releasedAt ? (
                                    <TimeDisplay
                                      value={release.releasedAt}
                                      mode="datetime"
                                    />
                                  ) : (
                                    "Unknown"
                                  )}
                                </p>
                              </div>
                            </div>

                            {release.changelog?.length ? (
                              <div className="mt-4 space-y-3">
                                {release.changelog.map((section) => (
                                  <div
                                    key={`${release.releaseId}-${section.title}`}
                                    className="rounded-[20px] border border-border/70 bg-muted/20 p-4"
                                  >
                                    <p className="text-sm font-medium">
                                      {section.title}
                                    </p>
                                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                                      {section.items.map((item) => (
                                        <li key={item} className="flex gap-2">
                                          <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/60" />
                                          <span>{item}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                                No changelog was published for this control-plane
                                release manifest.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </SectionPanel>
                </div>
              ) : (
                <EmptyState
                  title="Control-plane self-update is unavailable"
                  description="This deployment is not marked as installer-managed, so the dashboard exposes the control-plane section in read-only mode."
                  icon={ShieldAlert}
                  variant="plain"
                />
              )}
            </SectionPanel>
          </div>
        ) : null}

        {activeTab === "agents" ? (
          <div role="tabpanel" aria-labelledby="agent-updates-tab" className="space-y-4">
            <SectionPanel
              eyebrow="Release Center"
              title="Agent updates"
              description="Track official tagged agent releases, watch live version changes land on the fleet, and keep selection, rollout, and rollback controls visible without bouncing between disconnected panels."
              variant="feature"
              action={
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-3 py-1",
                      getRealtimeTone(realtimeStatus),
                    )}
                  >
                    <Wifi className="mr-1 size-3.5" />
                    {getRealtimeLabel(realtimeStatus)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    Official source only
                  </Badge>
                  <ShimmerButton
                    className="action-btn border-border/70 bg-(--control-surface) text-foreground shadow-none"
                    background="var(--control-surface)"
                    onClick={() => {
                      void controlPlaneSummaryQuery.refetch();
                      void summaryQuery.refetch();
                      void releasesQuery.refetch();
                      void rolloutsQuery.refetch();
                      void nodesQuery.refetch();
                    }}
                    disabled={isRefreshingData}
                  >
                    <RefreshCcw
                      className={
                        isRefreshingData
                          ? "size-4 animate-spin"
                          : "action-icon-spin size-4"
                      }
                    />
                    Refresh data
                  </ShimmerButton>
                </>
              }
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
                <div
                  className="overflow-hidden rounded-[30px] border border-border/70 p-5 shadow-[var(--shadow-dashboard-hover)]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at top left, color-mix(in oklch, var(--primary) 14%, transparent), transparent 36%), radial-gradient(circle at 88% 18%, color-mix(in oklch, var(--semantic-success) 12%, transparent), transparent 24%), linear-gradient(180deg, color-mix(in oklch, var(--surface-feature) 85%, white 15%), var(--surface-feature))",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      <Sparkles className="mr-1 size-3.5" />
                      Live command deck
                    </Badge>
                    {latestRelease ? (
                      <Badge
                        className="rounded-full px-3 py-1"
                      >
                        Latest {latestRelease.version}
                      </Badge>
                    ) : null}
                    {activeRollout ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-3 py-1",
                          getRolloutTone(activeRollout.status),
                        )}
                      >
                        {activeRollout.rollback ? "Rollback" : "Rollout"} live
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-5 max-w-3xl">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Fleet release operations
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-[2.45rem]">
                  <AnimatedGradientText
                    className="font-semibold"
                    colorFrom="#d95f31"
                    colorTo="#ffb54c"
                    speed={1.2}
                  >
                    Stage, watch, and confirm
                  </AnimatedGradientText>
                  <span className="block">
                    every agent version change in one place.
                  </span>
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                  The board below is tuned for live operations: version shifts
                  land in-place, rollout pressure stays visible, and selection
                  controls remain docked on the right so you can act without
                  losing the fleet table.
                </p>
              </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryQuery.isPending ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <Skeleton key={index} className="h-40 rounded-[22px]" />
                      ))
                    ) : (
                      <>
                        <UpdateStatCard
                          label="Latest release"
                          value={latestRelease?.version ?? "Unavailable"}
                          description={
                            latestRelease ? (
                              <TimeDisplay
                                value={latestRelease.publishedAt}
                                mode="datetime"
                              />
                            ) : (
                              "No tagged release available yet."
                            )
                          }
                          icon={<Sparkles className="size-4" />}
                        />
                        <UpdateStatCard
                          label="Outdated nodes"
                          value={summaryQuery.data?.outdatedNodeCount ?? 0}
                          description="Servers not yet on the newest tagged agent release."
                          icon={<Server className="size-4" />}
                          tone="tone-warning"
                        />
                        <UpdateStatCard
                          label="Eligible now"
                          value={summaryQuery.data?.eligibleOutdatedNodeCount ?? 0}
                          description="Online, supported, and ready for the current target."
                          icon={<CheckCircle2 className="size-4" />}
                          tone="tone-success"
                        />
                        <UpdateStatCard
                          label="Live transitions"
                          value={activeRollout?.counts.active ?? 0}
                          description={
                            realtimeHealth.lastEventAt ? (
                              <>
                                Last signal{" "}
                                <TimeDisplay
                                  value={realtimeHealth.lastEventAt}
                                  mode="datetime"
                                />
                              </>
                            ) : (
                              "Waiting for the first realtime event."
                            )
                          }
                          icon={<Activity className="size-4" />}
                        />
                      </>
                    )}
                  </div>

                  <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:items-stretch">
                <div className="rounded-[24px] border border-border/70 bg-background/80 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Selected target
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1",
                        rollbackMode ? "tone-warning" : "tone-success",
                      )}
                    >
                      {rollbackMode ? "Rollback mode" : "Update mode"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-semibold tracking-tight">
                      {selectedRelease?.version ?? "Select a release"}
                    </h3>
                    {selectedRelease ? (
                      <p className="text-sm text-muted-foreground">
                        Published{" "}
                        <TimeDisplay
                          value={selectedRelease.publishedAt}
                          mode="datetime"
                        />
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                      <p className="text-xs text-muted-foreground">Selection</p>
                      <p className="mt-1 text-lg font-semibold">
                        {effectiveSelectedNodeIds.length}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Nodes staged for the next rollout command.
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                      <p className="text-xs text-muted-foreground">
                        Visible ready
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {selectableFilteredNodes.length}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Eligible nodes inside the active fleet filter.
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                      <p className="text-xs text-muted-foreground">
                        Live board
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {visibleTransitionCount}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Visible nodes currently carrying rollout state.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-border/70 bg-background/80 p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Release signal
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                      <p className="text-xs text-muted-foreground">
                        Catalog sync
                      </p>
                      <p className="mt-1 font-medium">
                        {summaryQuery.data?.releaseCheckedAt ? (
                          <TimeDisplay
                            value={summaryQuery.data.releaseCheckedAt}
                            mode="datetime"
                          />
                        ) : (
                          "Not checked yet"
                        )}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                      <p className="text-xs text-muted-foreground">
                        Current live node
                      </p>
                      <p className="mt-1 font-medium">
                        {currentRolloutTarget?.nodeNameSnapshot ??
                          "No active target"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {currentRolloutTarget?.statusMessage ??
                          "When a rollout is running, the active node and progress will stay pinned here."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

                  <div className="mt-3">{activeRolloutPanel}</div>
                </div>

                <div className="space-y-4">
                  <SectionPanel
                    eyebrow="Live pulse"
                    title={
                      activeRollout ? activeRollout.targetVersion : "Rollout watch"
                    }
                    description="Realtime status, queue pressure, and the node currently carrying update work."
                  >
                    {activeRollout ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-3 py-1",
                              getRolloutTone(activeRollout.status),
                            )}
                          >
                            {activeRollout.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-full px-3 py-1"
                          >
                            {activeRollout.counts.total} targets
                          </Badge>
                        </div>
                        <Progress value={rolloutProgress}>
                          <ProgressLabel>Overall progress</ProgressLabel>
                          <ProgressValue>
                            {(_, value) => `${value ?? rolloutProgress}%`}
                          </ProgressValue>
                        </Progress>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                            <p className="text-xs text-muted-foreground">
                              Current node
                            </p>
                            <p className="mt-1 font-semibold">
                              {currentRolloutTarget?.nodeNameSnapshot ?? "Queued"}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {currentRolloutTarget?.statusMessage ??
                                "Waiting for the next target to start."}
                            </p>
                          </div>
                          <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                            <p className="text-xs text-muted-foreground">
                              Queue mix
                            </p>
                            <p className="mt-1 font-semibold">
                              {activeRollout.counts.completed}/
                              {activeRollout.counts.total} complete
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {activeRollout.counts.active} active,{" "}
                              {activeRollout.counts.pending} pending,{" "}
                              {activeRollout.counts.failed} failed
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {activeRollout.statusMessage}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          No rollout is active right now. Build a selection on the
                          left, choose the target release on the right, and start
                          the next update or rollback from the command deck.
                        </p>
                        <div className="rounded-[20px] border border-border/70 bg-background/85 p-4">
                          <p className="text-xs text-muted-foreground">
                            Current latest target
                          </p>
                          <p className="mt-1 font-semibold">
                            {latestRelease?.version ??
                              "Waiting for release metadata"}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Only official tagged releases appear here. Preview or
                            main channel binaries stay out of the operator flow.
                          </p>
                        </div>
                      </div>
                    )}
                  </SectionPanel>

                  {commandDeckPanel}
                </div>
              </div>
            </SectionPanel>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.92fr)] xl:items-start">
              <div className="space-y-4 xl:col-span-2">
                <SectionPanel
                  eyebrow="Fleet board"
                  title="Target selection"
                  description="Filter the fleet, watch live version movement in the rows, and keep active rollout nodes pinned near the top of the table."
                  contentClassName="p-0"
                >
              <div className="border-b border-border/70 px-4 py-3 sm:px-5">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setNodePageIndex(0);
                    }}
                    placeholder="Search node, hostname, or team"
                    className="md:col-span-2 xl:col-span-2"
                  />
                  <Select
                    value={workspaceFilter}
                    onValueChange={(value) => {
                      setWorkspaceFilter(value ?? "all");
                      setNodePageIndex(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All workspaces</SelectItem>
                      {workspaceOptions.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={teamFilter}
                    onValueChange={(value) => {
                      setTeamFilter(value ?? "all");
                      setNodePageIndex(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Team" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teams</SelectItem>
                      {teamOptions.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter((value ?? "all") as typeof statusFilter);
                      setNodePageIndex(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={maintenanceFilter}
                    onValueChange={(value) => {
                      setMaintenanceFilter(
                        (value ?? "all") as typeof maintenanceFilter,
                      );
                      setNodePageIndex(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Availability" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All availability</SelectItem>
                      <SelectItem value="active">Accepting work</SelectItem>
                      <SelectItem value="maintenance">
                        Maintenance only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={archFilter}
                    onValueChange={(value) => {
                      setArchFilter(value ?? "all");
                      setNodePageIndex(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Arch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All arch</SelectItem>
                      <SelectItem value="amd64">amd64</SelectItem>
                      <SelectItem value="arm64">arm64</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={versionFilter}
                    onValueChange={(value) => {
                      setVersionFilter(value ?? "all");
                      setNodePageIndex(0);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Agent version" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All versions</SelectItem>
                      {versionOptions.map((version) => (
                        <SelectItem key={version} value={version}>
                          {version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {prioritizedFilteredNodes.length} visible
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {visibleOnlineCount} online
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {selectableFilteredNodes.length} ready
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {filteredBlockedNodeCount} blocked
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {visibleTransitionCount} in transition
                  </Badge>
                </div>
              </div>

              {!nodes.length && nodesQuery.isPending ? (
                <div className="space-y-3 px-4 py-3 sm:px-5">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 rounded-[18px]" />
                  ))}
                </div>
              ) : !prioritizedFilteredNodes.length ? (
                <div className="px-4 py-5 sm:px-5">
                  <EmptyState
                    title="No nodes matched the current filter"
                    description="Widen the workspace, team, maintenance, version, or architecture filters to see more rollout targets."
                    icon={ShieldAlert}
                    variant="plain"
                  />
                </div>
              ) : (
                <ScrollArea className="max-h-[32rem]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Node</TableHead>
                        <TableHead>Placement</TableHead>
                        <TableHead>Version lane</TableHead>
                        <TableHead>Runtime</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead className="text-right">Selection</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedNodes.map((node) => {
                        const eligibility = eligibilityByNodeId.get(
                          node.id,
                        ) ?? {
                          selectable: false,
                          reason: "Unknown state.",
                        };
                        const selected = effectiveSelectedNodeIds.includes(
                          node.id,
                        );
                        const rolloutTarget = activeTargetByNodeId.get(node.id);

                        return (
                          <TableRow key={node.id}>
                            <TableCell className="align-top">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium">{node.name}</p>
                                  {rolloutTarget ? (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "rounded-full px-3 py-1",
                                        getTargetTone(rolloutTarget.status),
                                      )}
                                    >
                                      {rolloutTarget.status}{" "}
                                      {rolloutTarget.progressPercent}%
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {node.hostname} · {node.status}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-sm text-muted-foreground">
                              <p>
                                {workspaceNameById.get(node.workspaceId) ??
                                  node.workspaceId}
                              </p>
                              <p className="mt-1 text-xs">
                                {node.teamName ?? "Unassigned"}
                              </p>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full px-3 py-1">
                                    {node.agentVersion ?? "Unknown"}
                                  </Badge>
                                  {selectedTargetVersion &&
                                  node.agentVersion !==
                                    selectedTargetVersion ? (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full px-3 py-1"
                                    >
                                      Target {selectedTargetVersion}
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {node.lastVersionReportedAt ? (
                                    <>
                                      Last version signal{" "}
                                      <TimeDisplay
                                        value={node.lastVersionReportedAt}
                                        mode="datetime"
                                      />
                                    </>
                                  ) : (
                                    "No version signal received yet."
                                  )}
                                </p>
                                {rolloutTarget ? (
                                  <p className="text-xs text-muted-foreground">
                                    {rolloutTarget.statusMessage ??
                                      "This node is currently participating in the active rollout."}
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-sm text-muted-foreground">
                              <p>
                                {node.os} / {node.arch}
                              </p>
                              <p className="mt-1 text-xs">
                                {node.lastSeenAt ? (
                                  <>
                                    Seen{" "}
                                    <TimeDisplay
                                      value={node.lastSeenAt}
                                      mode="datetime"
                                    />
                                  </>
                                ) : (
                                  "No heartbeat yet"
                                )}
                              </p>
                            </TableCell>
                            <TableCell className="align-top">
                              {eligibility.selectable ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-3 py-1 tone-success"
                                >
                                  Ready
                                </Badge>
                              ) : selectedTargetVersion &&
                                node.agentVersion === selectedTargetVersion ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full px-3 py-1 tone-success"
                                >
                                  Latest
                                </Badge>
                              ) : (
                                <div className="space-y-1">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full px-3 py-1 tone-warning"
                                  >
                                    Blocked
                                  </Badge>
                                  <p className="max-w-sm text-xs text-muted-foreground">
                                    {eligibility.reason}
                                  </p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              <Button
                                size="sm"
                                variant={selected ? "default" : "outline"}
                                disabled={
                                  !eligibility.selectable ||
                                  Boolean(activeRollout)
                                }
                                onClick={() =>
                                  setSelectedNodeIds((current) =>
                                    current.includes(node.id)
                                      ? current.filter(
                                          (value) => value !== node.id,
                                        )
                                      : [...current, node.id],
                                  )
                                }
                              >
                                {selected
                                  ? "Selected"
                                  : eligibility.selectable
                                    ? "Select"
                                    : "Unavailable"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {prioritizedFilteredNodes.length ? (
                <TablePaginationBar
                  itemLabel="nodes"
                  total={prioritizedFilteredNodes.length}
                  pageCount={nodePageCount}
                  currentPageIndex={currentNodePageIndex}
                  pageSize={nodePageSize}
                  rangeStart={nodeRangeStart}
                  rangeEnd={nodeRangeEnd}
                  onPageSizeChange={(value) => {
                    setNodePageSize(value);
                    setNodePageIndex(0);
                  }}
                  onPreviousPage={() =>
                    setNodePageIndex((current) => Math.max(0, current - 1))
                  }
                  onNextPage={() =>
                    setNodePageIndex((current) =>
                      Math.min(nodePageCount - 1, current + 1),
                    )
                  }
                />
              ) : null}
                </SectionPanel>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.85fr)] xl:items-start">
                  <SectionPanel
                    eyebrow="Release notes"
                    title={
                      selectedRelease
                        ? `Agent ${selectedRelease.version}`
                        : "Select a release"
                    }
                    description="Read the selected changelog while the official catalog stays visible beside it."
                  >
                {!selectedRelease ? (
                  <EmptyState
                    title="No release selected"
                    description="Choose a tagged release from the catalog to review the notes before starting a rollout."
                    icon={Clock3}
                    variant="plain"
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
                        <p className="text-xs text-muted-foreground">
                          Published
                        </p>
                        <p className="mt-2 text-sm font-medium">
                          <TimeDisplay
                            value={selectedRelease.publishedAt}
                            mode="datetime"
                          />
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
                        <p className="text-xs text-muted-foreground">Commit</p>
                        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                          {selectedRelease.commit}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
                        <p className="text-xs text-muted-foreground">Usage</p>
                        <p className="mt-2 text-sm font-medium">
                          {selectedRelease.version === latestRelease?.version
                            ? "Use for rollout"
                            : "Use for rollback"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {selectedRelease.notes.map((section) => (
                        <div
                          key={`${selectedRelease.version}-${section.title}`}
                          className="rounded-[22px] border border-border/70 bg-background/82 p-4 shadow-[var(--shadow-dashboard)]"
                        >
                          <p className="text-sm font-medium">{section.title}</p>
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {section.items.map((item) => (
                              <li key={item} className="flex gap-2">
                                <span className="mt-2 size-1.5 rounded-full bg-muted-foreground/60" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </SectionPanel>

                  <SectionPanel
                    eyebrow="Catalog"
                    title="Official releases"
                    description="Pick the release that powers the command deck and notes panel."
                    contentClassName="p-0"
                    className="h-full"
                  >
                {releasesQuery.isPending ? (
                  <div className="space-y-3 px-4 py-3 sm:px-5">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 rounded-[20px]" />
                    ))}
                  </div>
                ) : !releases.length ? (
                  <div className="px-4 py-5 sm:px-5">
                    <EmptyState
                      title="No tagged releases are available"
                      description="Publish an official tagged agent release to populate the update center."
                      icon={Clock3}
                      variant="plain"
                    />
                  </div>
                ) : (
                  <ScrollArea className="h-[30rem]">
                    <div className="space-y-3 px-4 py-3 sm:px-5">
                      {releases.map((release) => {
                        const selected =
                          selectedRelease?.version === release.version;

                        return (
                          <button
                            key={release.version}
                            type="button"
                            onClick={() => setReleaseSelection(release.version)}
                            className={cn(
                              "w-full rounded-[22px] border p-4 text-left transition-colors",
                              selected
                                ? "surface-feature border-primary/40 shadow-[var(--shadow-dashboard)]"
                                : "surface-subtle hover:border-border/80",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full">
                                    {release.version}
                                  </Badge>
                                  {release.version ===
                                  latestRelease?.version ? (
                                    <Badge
                                      variant="outline"
                                      className="rounded-full px-3 py-1 tone-success"
                                    >
                                      Latest
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  <TimeDisplay
                                    value={release.publishedAt}
                                    mode="datetime"
                                  />
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {release.notes.reduce(
                                    (count, section) =>
                                      count + section.items.length,
                                    0,
                                  )}{" "}
                                  changelog items
                                </p>
                              </div>
                              {selected ? (
                                <CheckCircle2 className="mt-1 size-4 text-primary" />
                              ) : release.version === latestRelease?.version ? (
                                <Sparkles className="mt-1 size-4 text-muted-foreground" />
                              ) : (
                                <Undo2 className="mt-1 size-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
                  </SectionPanel>
                </div>

                <SectionPanel
                  eyebrow="History"
                  title="Recent rollouts"
                  description="Audit recent fleet operations without pushing the live command deck below the fold."
                  contentClassName="p-0"
                >
              {!recentRollouts.length ? (
                <div className="px-4 py-5 sm:px-5">
                  <EmptyState
                    title="No rollout history yet"
                    description="Once you start update or rollback operations, recent rollout summaries will appear here."
                    icon={Clock3}
                    variant="plain"
                  />
                </div>
              ) : (
                <ScrollArea className="max-h-[30rem]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>When</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Counts</TableHead>
                        <TableHead>Operator</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRollouts.map((rollout) => (
                        <TableRow key={rollout.id}>
                          <TableCell className="text-muted-foreground">
                            <TimeDisplay
                              value={rollout.createdAt}
                              mode="datetime"
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {rollout.targetVersion}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full px-3 py-1",
                                getRolloutTone(rollout.status),
                              )}
                            >
                              {rollout.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {rollout.rollback ? "Rollback" : "Update"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rollout.counts.completed}/{rollout.counts.total}{" "}
                            complete, {rollout.counts.failed} failed,{" "}
                            {rollout.counts.skipped} skipped
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {rollout.requestedByEmailSnapshot ?? "System"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {recentRollouts.length ? (
                <TablePaginationBar
                  itemLabel="rollouts"
                  total={recentRollouts.length}
                  pageCount={historyPageCount}
                  currentPageIndex={currentHistoryPageIndex}
                  pageSize={historyPageSize}
                  rangeStart={historyRangeStart}
                  rangeEnd={historyRangeEnd}
                  onPageSizeChange={(value) => {
                    setHistoryPageSize(value);
                    setHistoryPageIndex(0);
                  }}
                  onPreviousPage={() =>
                    setHistoryPageIndex((current) => Math.max(0, current - 1))
                  }
                  onNextPage={() =>
                    setHistoryPageIndex((current) =>
                      Math.min(historyPageCount - 1, current + 1),
                    )
                  }
                />
              ) : null}
                </SectionPanel>
              </div>
            </div>
          </div>
        ) : null}
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Apply prepared control-plane update</DialogTitle>
              <DialogDescription>
                This recreates the runtime API and web containers against the
                prepared bundle. PostgreSQL, Redis, TLS materials, and installer
                state stay in place.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Prepared build:{" "}
                <span className="font-medium text-foreground">
                  {formatControlPlaneRelease(controlPlanePreparedRelease)}
                </span>
              </p>
              <p>
                The host supervisor performs a rolling apply and will attempt an
                automatic rollback if the runtime health check fails.
              </p>
            </div>
            <DialogFooter showCloseButton>
              <Button
                onClick={() => {
                  queueControlPlaneApply.mutate(undefined, {
                    onSuccess: () => {
                      setIsApplyDialogOpen(false);
                    },
                  });
                }}
                disabled={
                  queueControlPlaneApply.isPending || !controlPlanePreparedRelease
                }
              >
                {queueControlPlaneApply.isPending
                  ? "Queueing apply..."
                  : "Queue apply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
};
