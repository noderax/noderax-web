"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
  Undo2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionPanel } from "@/components/ui/section-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useCreateAgentUpdateRollout,
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
  NodeSummary,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const NODE_LIMIT = 500;
const SUPPORTED_ARCHES = new Set(["amd64", "arm64"]);
const EMPTY_WORKSPACES: Array<{ id: string; name: string }> = [];
const EMPTY_NODES: NodeSummary[] = [];
const EMPTY_RELEASES: AgentRelease[] = [];
const EMPTY_ROLLOUTS: AgentUpdateRollout[] = [];
const ACTIVE_TARGET_STATUSES = new Set([
  "dispatched",
  "downloading",
  "verifying",
  "installing",
  "restarting",
  "waiting_for_reconnect",
]);

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

export const UpdatesPageView = () => {
  const { isPlatformAdmin } = useWorkspaceContext();
  const workspacesQuery = useWorkspaces(isPlatformAdmin);
  const summaryQuery = useAgentUpdateSummary(isPlatformAdmin);
  const releasesQuery = useAgentUpdateReleases(isPlatformAdmin);
  const rolloutsQuery = useAgentUpdateRollouts(isPlatformAdmin);
  const nodesQuery = usePlatformNodes({ limit: NODE_LIMIT }, isPlatformAdmin);
  const createRollout = useCreateAgentUpdateRollout();
  const resumeRollout = useResumeAgentUpdateRollout();
  const cancelRollout = useCancelAgentUpdateRollout();
  const retryTarget = useRetryAgentUpdateRolloutTarget();
  const skipTarget = useSkipAgentUpdateRolloutTarget();

  const [activeTab, setActiveTab] = useState("fleet");
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
  const deferredSearch = useDeferredValue(search);

  const workspaces = workspacesQuery.data ?? EMPTY_WORKSPACES;
  const nodes = nodesQuery.data ?? EMPTY_NODES;
  const releases = releasesQuery.data ?? EMPTY_RELEASES;
  const recentRollouts = rolloutsQuery.data ?? EMPTY_ROLLOUTS;
  const activeRollout = summaryQuery.data?.activeRollout ?? null;
  const latestRelease = summaryQuery.data?.latestRelease ?? null;

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

  const releaseHighlights = useMemo(
    () =>
      selectedRelease?.notes.flatMap((section) =>
        section.items.map((item) => ({
          section: section.title,
          item,
        })),
      ) ?? [],
    [selectedRelease],
  );

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
      <div className="space-y-6">
        <SectionPanel
          eyebrow="Release Center"
          title="Agent updates"
          description="Track official tagged agent releases, review changelogs, and roll out updates or rollbacks across your connected Linux fleet without living in one long scrolling page."
          action={
            <>
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Official source only
              </Badge>
              <Button
                variant="outline"
                onClick={() => {
                  void summaryQuery.refetch();
                  void releasesQuery.refetch();
                  void rolloutsQuery.refetch();
                  void nodesQuery.refetch();
                }}
              >
                <RefreshCcw className="size-4" />
                Refresh data
              </Button>
            </>
          }
        >
          <div className="grid gap-5 xl:grid-cols-[1.45fr,0.95fr]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {summaryQuery.isPending ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 rounded-[20px]" />
                  ))
                ) : (
                  <>
                    <div className="surface-subtle rounded-[20px] border p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Latest release
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge className="rounded-full">
                          {latestRelease?.version ?? "Unavailable"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {latestRelease ? (
                          <TimeDisplay
                            value={latestRelease.publishedAt}
                            mode="datetime"
                          />
                        ) : (
                          "No tagged release available yet"
                        )}
                      </p>
                    </div>

                    <div className="surface-subtle rounded-[20px] border p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Outdated nodes
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight">
                        {summaryQuery.data?.outdatedNodeCount ?? 0}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Nodes not yet on the latest official tagged release.
                      </p>
                    </div>

                    <div className="surface-subtle rounded-[20px] border p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Eligible now
                      </p>
                      <p className="mt-3 text-2xl font-semibold tracking-tight">
                        {summaryQuery.data?.eligibleOutdatedNodeCount ?? 0}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Online, supported, and ready to receive the selected
                        release.
                      </p>
                    </div>

                    <div className="surface-subtle rounded-[20px] border p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        Catalog sync
                      </p>
                      <p className="mt-3 text-sm font-medium">
                        {summaryQuery.data?.releaseCheckedAt ? (
                          <TimeDisplay
                            value={summaryQuery.data.releaseCheckedAt}
                            mode="datetime"
                          />
                        ) : (
                          "Not checked yet"
                        )}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Official CDN first, official GitHub release metadata as
                        fallback.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="surface-feature rounded-[24px] border p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Selected rollout target
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold tracking-tight">
                        {selectedRelease?.version ?? "Select a release"}
                      </h3>
                      {rollbackMode ? (
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1 tone-warning"
                        >
                          Rollback mode
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1 tone-success"
                        >
                          Update mode
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rollbackMode
                        ? "An older tagged release is selected, so the rollout will be treated as a rollback."
                        : "The selector defaults to the newest official tagged release so you can move quickly."}
                    </p>
                  </div>

                  <Select
                    value={selectedRelease?.version ?? undefined}
                    onValueChange={(value) => setReleaseSelection(value)}
                  >
                    <SelectTrigger className="min-w-52 bg-background">
                      <SelectValue placeholder="Choose release" />
                    </SelectTrigger>
                    <SelectContent>
                      {releases.map((release) => (
                        <SelectItem
                          key={release.version}
                          value={release.version}
                        >
                          {release.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {releaseHighlights.length ? (
                      releaseHighlights.slice(0, 4).map((highlight, index) => (
                        <div
                          key={`${highlight.section}-${highlight.item}-${index}`}
                          className="rounded-[20px] border bg-background/80 p-4"
                        >
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                            {highlight.section}
                          </p>
                          <p className="mt-2 text-sm text-foreground/88">
                            {highlight.item}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[20px] border bg-background/80 p-4 sm:col-span-2">
                        <p className="text-sm text-muted-foreground">
                          Select a tagged release to preview its release notes
                          and prepare a rollout or rollback.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[20px] border bg-background/80 p-4">
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      Selection snapshot
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                      <div className="rounded-2xl border bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">
                          Selected servers
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {effectiveSelectedNodeIds.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">
                          Eligible in filter
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                          {selectableFilteredNodes.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-background/70 p-3">
                        <p className="text-xs text-muted-foreground">
                          Published
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {selectedRelease ? (
                            <TimeDisplay
                              value={selectedRelease.publishedAt}
                              mode="datetime"
                            />
                          ) : (
                            "Waiting for selection"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Rollout watch
                  </p>
                  <h3 className="mt-2 text-lg font-semibold tracking-tight">
                    {activeRollout
                      ? activeRollout.targetVersion
                      : "No active rollout"}
                  </h3>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1",
                    getRolloutTone(activeRollout?.status ?? "queued"),
                  )}
                >
                  {activeRollout?.status ?? "idle"}
                </Badge>
              </div>

              {activeRollout ? (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {activeRollout.statusMessage}
                  </p>
                  <Progress value={rolloutProgress}>
                    <ProgressLabel>Overall progress</ProgressLabel>
                    <ProgressValue>
                      {(_, value) => `${value ?? rolloutProgress}%`}
                    </ProgressValue>
                  </Progress>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-background/80 p-4">
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
                    <div className="rounded-2xl border bg-background/80 p-4">
                      <p className="text-xs text-muted-foreground">
                        Queue state
                      </p>
                      <p className="mt-1 font-semibold">
                        {activeRollout.counts.completed}/
                        {activeRollout.counts.total} completed
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {activeRollout.counts.failed} failed,{" "}
                        {activeRollout.counts.active} active,{" "}
                        {activeRollout.counts.pending} pending
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("rollout")}
                    >
                      Open rollout details
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("fleet")}
                    >
                      Review fleet selection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No rollout is active right now. Use the fleet tab to filter
                    eligible nodes, build a selection, and start the next update
                    or rollback.
                  </p>
                  <div className="rounded-2xl border bg-background/80 p-4">
                    <p className="text-xs text-muted-foreground">
                      Current latest target
                    </p>
                    <p className="mt-1 font-semibold">
                      {latestRelease?.version ?? "Waiting for release metadata"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Preview and `main` builds stay out of this center. Only
                      official tagged releases appear.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("fleet")}
                    >
                      Open fleet tab
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("releases")}
                    >
                      Browse changelog
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionPanel>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value)}
          className="space-y-4"
        >
          <TabsList
            variant="line"
            className="w-full flex-wrap justify-start gap-2 border-b-0"
          >
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="rollout">Active rollout</TabsTrigger>
            <TabsTrigger value="releases">Releases</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="fleet" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[1.45fr,0.85fr]">
              <SectionPanel
                eyebrow="Selection"
                title="Fleet target selection"
                description="Choose the servers that should receive the selected release. The table stays compact here so you can work without scrolling the whole page."
                contentClassName="p-0"
              >
                <div className="border-b border-border/70 px-5 py-4 sm:px-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search node, hostname, or team"
                      className="md:col-span-2 xl:col-span-2"
                    />
                    <Select
                      value={workspaceFilter}
                      onValueChange={(value) =>
                        setWorkspaceFilter(value ?? "all")
                      }
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
                      onValueChange={(value) => setTeamFilter(value ?? "all")}
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
                      onValueChange={(value) =>
                        setStatusFilter((value ?? "all") as typeof statusFilter)
                      }
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
                      onValueChange={(value) =>
                        setMaintenanceFilter(
                          (value ?? "all") as typeof maintenanceFilter,
                        )
                      }
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
                      onValueChange={(value) => setArchFilter(value ?? "all")}
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
                      onValueChange={(value) =>
                        setVersionFilter(value ?? "all")
                      }
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
                </div>

                {!nodes.length && nodesQuery.isPending ? (
                  <div className="space-y-3 px-5 py-4 sm:px-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 rounded-[18px]" />
                    ))}
                  </div>
                ) : !filteredNodes.length ? (
                  <div className="px-5 py-6 sm:px-6">
                    <EmptyState
                      title="No nodes matched the current filter"
                      description="Widen the workspace, team, maintenance, version, or architecture filters to see more rollout targets."
                      icon={ShieldAlert}
                      variant="plain"
                    />
                  </div>
                ) : (
                  <ScrollArea className="h-[34rem]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Node</TableHead>
                          <TableHead>Workspace</TableHead>
                          <TableHead>Team</TableHead>
                          <TableHead>Runtime</TableHead>
                          <TableHead>Current agent</TableHead>
                          <TableHead>Eligibility</TableHead>
                          <TableHead className="text-right">
                            Selection
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNodes.map((node) => {
                          const eligibility = eligibilityByNodeId.get(
                            node.id,
                          ) ?? {
                            selectable: false,
                            reason: "Unknown state.",
                          };
                          const selected = effectiveSelectedNodeIds.includes(
                            node.id,
                          );

                          return (
                            <TableRow key={node.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{node.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {node.hostname} · {node.status}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {workspaceNameById.get(node.workspaceId) ??
                                  node.workspaceId}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {node.teamName ?? "Unassigned"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {node.os} / {node.arch}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {node.agentVersion ?? "Unknown"}
                                  </p>
                                  {node.lastVersionReportedAt ? (
                                    <p className="text-xs text-muted-foreground">
                                      <TimeDisplay
                                        value={node.lastVersionReportedAt}
                                        mode="datetime"
                                      />
                                    </p>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                {eligibility.selectable ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full px-3 py-1 tone-success"
                                  >
                                    Ready
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
                              <TableCell className="text-right">
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
              </SectionPanel>

              <div className="space-y-4">
                <SectionPanel
                  eyebrow="Summary"
                  title="Selection summary"
                  description="Keep the working selection and rollout actions in one compact side rail."
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-[20px] border p-4">
                      <p className="text-xs text-muted-foreground">
                        Target release
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {selectedRelease?.version ?? "None selected"}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {rollbackMode ? "Rollback" : "Update"} mode
                      </p>
                    </div>

                    <div className="rounded-[20px] border p-4">
                      <p className="text-xs text-muted-foreground">
                        Selected nodes
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {effectiveSelectedNodeIds.length}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectableFilteredNodes.length} eligible in the current
                        filter
                      </p>
                    </div>

                    <div className="rounded-[20px] border p-4">
                      <p className="text-xs text-muted-foreground">
                        Blocked in filter
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {filteredBlockedNodeCount}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Offline, maintenance, unsupported, or already updated
                        nodes.
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
                        setSelectedNodeIds(
                          selectableFilteredNodes.map((node) => node.id),
                        )
                      }
                      disabled={
                        !selectableFilteredNodes.length ||
                        Boolean(activeRollout)
                      }
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
                    {activeRollout ? (
                      <p className="text-sm text-muted-foreground">
                        A rollout is already active. Finish, skip, retry, or
                        cancel it before starting another one.
                      </p>
                    ) : null}
                  </div>
                </SectionPanel>

                <SectionPanel
                  eyebrow="Filter snapshot"
                  title="Fleet visibility"
                  description="A quick read on what the current filter is showing."
                >
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {filteredNodes.length} visible
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {selectableFilteredNodes.length} ready
                    </Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {filteredBlockedNodeCount} blocked
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    The deferred search keeps this table responsive even with
                    larger fleets, while the fixed-height viewport stops the
                    rest of the page from getting pushed far below the fold.
                  </p>
                </SectionPanel>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rollout" className="mt-0">
            <SectionPanel
              eyebrow="Rollout"
              title="Active rollout"
              description="Updates are dispatched one node at a time, but the heavy target list now lives inside a fixed-height queue so the page stays compact."
              action={
                activeRollout ? (
                  <>
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
                        <RefreshCcw className="size-4" />
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
                  </>
                ) : null
              }
            >
              {!activeRollout ? (
                <EmptyState
                  title="No active rollout"
                  description="Select a tagged release and one or more eligible servers to begin a sequential fleet update."
                  icon={Clock3}
                  variant="plain"
                />
              ) : (
                <div className="grid gap-4 xl:grid-cols-[0.88fr,1.12fr]">
                  <div className="space-y-4">
                    <div className="rounded-[20px] border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">
                            {activeRollout.targetVersion}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activeRollout.rollback
                              ? "Rollback rollout"
                              : "Update rollout"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1"
                        >
                          {activeRollout.counts.total} targets
                        </Badge>
                      </div>
                      <Progress value={rolloutProgress} className="mt-4">
                        <ProgressLabel>Overall progress</ProgressLabel>
                        <ProgressValue>
                          {(_, value) => `${value ?? rolloutProgress}%`}
                        </ProgressValue>
                      </Progress>
                      <p className="mt-4 text-sm text-muted-foreground">
                        {activeRollout.statusMessage}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1"
                        >
                          Completed {activeRollout.counts.completed}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1"
                        >
                          Active {activeRollout.counts.active}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1"
                        >
                          Failed {activeRollout.counts.failed}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="rounded-full px-3 py-1"
                        >
                          Pending {activeRollout.counts.pending}
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-[20px] border p-4">
                      <p className="text-sm font-medium">Operator actions</p>
                      {failedTargets.length ? (
                        <div className="mt-3 space-y-3">
                          {failedTargets.map((target) => (
                            <div
                              key={target.id}
                              className="flex flex-col gap-3 rounded-2xl border border-tone-warning/30 bg-tone-warning/6 p-3"
                            >
                              <div>
                                <p className="font-medium">
                                  {target.nodeNameSnapshot}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {target.statusMessage ??
                                    "This target failed and paused the rollout."}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
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
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">
                          No operator intervention is currently required. If the
                          rollout pauses without a failed target, you can resume
                          it directly.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-[20px] border">
                    <ScrollArea className="h-[34rem]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Node</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Version path</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Task</TableHead>
                            <TableHead>Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeRollout.targets.map((target) => (
                            <TableRow key={target.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">
                                    {target.nodeNameSnapshot}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {target.previousVersion ?? "unknown"} →{" "}
                                    {target.targetVersion}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full px-3 py-1",
                                    getTargetTone(target.status),
                                  )}
                                >
                                  {target.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {target.statusMessage ??
                                  "Waiting for the next rollout action."}
                              </TableCell>
                              <TableCell className="min-w-48">
                                <Progress value={target.progressPercent}>
                                  <ProgressLabel className="text-xs">
                                    {target.progressPercent}%
                                  </ProgressLabel>
                                  <ProgressValue />
                                </Progress>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {target.taskId
                                  ? target.taskId.slice(0, 8)
                                  : "Pending"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                <TimeDisplay
                                  value={target.updatedAt}
                                  mode="datetime"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </SectionPanel>
          </TabsContent>

          <TabsContent value="releases" className="mt-0">
            <div className="grid gap-4 xl:grid-cols-[0.82fr,1.18fr]">
              <SectionPanel
                eyebrow="Catalog"
                title="Tagged official releases"
                description="Select a release from the compact catalog instead of scrolling through the full changelog stack."
                contentClassName="p-0"
              >
                {releasesQuery.isPending ? (
                  <div className="space-y-3 px-5 py-4 sm:px-6">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-28 rounded-[20px]" />
                    ))}
                  </div>
                ) : !releases.length ? (
                  <div className="px-5 py-6 sm:px-6">
                    <EmptyState
                      title="No tagged releases are available"
                      description="Publish an official tagged agent release to populate the update center."
                      icon={Clock3}
                      variant="plain"
                    />
                  </div>
                ) : (
                  <ScrollArea className="h-[34rem]">
                    <div className="space-y-3 px-5 py-4 sm:px-6">
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
                                ? "surface-feature border-primary/40"
                                : "surface-subtle hover:border-border/80",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
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
                                <ArrowUpCircle className="mt-1 size-4 text-muted-foreground" />
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

              <SectionPanel
                eyebrow="Selected release"
                title={
                  selectedRelease
                    ? `Agent ${selectedRelease.version}`
                    : "Select a release"
                }
                description="Read the full changelog for the currently selected target without expanding every other release card."
              >
                {!selectedRelease ? (
                  <EmptyState
                    title="No release selected"
                    description="Choose a tagged release from the catalog to review its release notes."
                    icon={Clock3}
                    variant="plain"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[20px] border p-4">
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
                      <div className="rounded-[20px] border p-4">
                        <p className="text-xs text-muted-foreground">Commit</p>
                        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                          {selectedRelease.commit}
                        </p>
                      </div>
                      <div className="rounded-[20px] border p-4">
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
                          className="rounded-[22px] border bg-background/80 p-4"
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
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <SectionPanel
              eyebrow="History"
              title="Recent rollouts"
              description="Recent fleet operations remain visible here for audit and operator follow-up, but they no longer push the working controls far below the fold."
              contentClassName="p-0"
            >
              {!recentRollouts.length ? (
                <div className="px-5 py-6 sm:px-6">
                  <EmptyState
                    title="No rollout history yet"
                    description="Once you start update or rollback operations, recent rollout summaries will appear here."
                    icon={Clock3}
                    variant="plain"
                  />
                </div>
              ) : (
                <ScrollArea className="h-[30rem]">
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
                      {recentRollouts.map((rollout) => (
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
                            completed, {rollout.counts.failed} failed,{" "}
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
            </SectionPanel>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};
