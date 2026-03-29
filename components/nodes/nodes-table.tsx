"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, MonitorCog } from "lucide-react";

import { NodeActionMenu } from "@/components/nodes/node-action-menu";

import { DeleteNodeDialog } from "@/components/nodes/delete-node-dialog";
import { NodeOsIcon } from "@/components/nodes/node-os-icon";
import { EmptyState } from "@/components/empty-state";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SectionPanel } from "@/components/ui/section-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { NodeSummary, TeamDto } from "@/lib/types";
import { cn } from "@/lib/utils";

const getCpuColor = (cpu: number) => {
  if (cpu > 90) return "text-tone-danger font-bold";
  if (cpu > 70) return "text-tone-warning font-semibold";
  return "text-tone-success font-medium";
};

const getTempColor = (temp: number) => {
  if (temp > 85) return "text-tone-danger font-bold text-[1.05em]";
  if (temp > 65) return "text-tone-warning font-semibold";
  return "text-tone-success font-medium";
};

export const NodesTable = ({
  nodes,
  isLoading,
  isError,
  onRetry,
  statusFilter,
  onStatusFilterChange,
  teams,
  teamFilter,
  onTeamFilterChange,
  maintenanceFilter,
  onMaintenanceFilterChange,
  page,
  onPreviousPage,
  onNextPage,
  hasNextPage,
  isAdmin,
  createAction,
}: {
  nodes: NodeSummary[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  statusFilter: "all" | "online" | "offline";
  onStatusFilterChange: (value: "all" | "online" | "offline") => void;
  teams: TeamDto[];
  teamFilter: "all" | string;
  onTeamFilterChange: (value: "all" | string) => void;
  maintenanceFilter: "all" | "maintenance" | "active";
  onMaintenanceFilterChange: (value: "all" | "maintenance" | "active") => void;
  page: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  hasNextPage: boolean;
  isAdmin?: boolean;
  createAction?: React.ReactNode;
}) => {
  const [selectedNode, setSelectedNode] = useState<NodeSummary | null>(null);
  const { buildWorkspaceHref } = useWorkspaceContext();
  const selectedTeam = teams.find((team) => team.id === teamFilter);

  const filterControl = (
    <>
      <Select
        value={statusFilter}
        onValueChange={(value) => onStatusFilterChange((value ?? "all") as typeof statusFilter)}
      >
        <SelectTrigger id="node-status-filter" className="min-w-40">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="online">Online only</SelectItem>
          <SelectItem value="offline">Offline only</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={teamFilter}
        onValueChange={(value) => onTeamFilterChange(value ?? "all")}
      >
        <SelectTrigger id="node-team-filter" className="min-w-44">
          <SelectValue placeholder="Filter team">
            {teamFilter === "all" ? "All teams" : selectedTeam?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All teams</SelectItem>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={maintenanceFilter}
        onValueChange={(value) =>
          onMaintenanceFilterChange((value ?? "all") as typeof maintenanceFilter)
        }
      >
        <SelectTrigger id="node-maintenance-filter" className="min-w-44">
          <SelectValue placeholder="Filter maintenance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All availability</SelectItem>
          <SelectItem value="active">Accepting work</SelectItem>
          <SelectItem value="maintenance">Maintenance only</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const pager = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onPreviousPage} disabled={page === 0}>
        Previous
      </Button>
      <span className="px-1 text-xs font-medium text-muted-foreground">
        Page {page + 1}
      </span>
      <Button variant="outline" size="sm" onClick={onNextPage} disabled={!hasNextPage}>
        Next
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <SectionPanel
        eyebrow="Directory"
        title="Node inventory"
        description="Filter nodes, page through results, and open node-level detail."
        action={
          <>
            {filterControl}
            {pager}
            {createAction}
          </>
        }
        contentClassName="space-y-3"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-[18px]" />
        ))}
      </SectionPanel>
    );
  }

  if (isError) {
    return (
      <SectionPanel
        eyebrow="Directory"
        title="Node inventory"
        description="Filter nodes, page through results, and open node-level detail."
        action={
          <>
            {filterControl}
            {pager}
            {createAction}
          </>
        }
      >
        <EmptyState
          title="Node inventory is unavailable"
          description="The node list could not be loaded from the authenticated API connection."
          icon={MonitorCog}
          actionLabel="Retry"
          onAction={onRetry}
        />
      </SectionPanel>
    );
  }

  if (!nodes.length) {
    return (
      <SectionPanel
        eyebrow="Directory"
        title="Node inventory"
        description="Filter nodes, page through results, and open node-level detail."
        action={
          <>
            {filterControl}
            {pager}
            {createAction}
          </>
        }
      >
        <EmptyState
          title="No nodes found"
          description="No nodes were returned for the current search, status filter, or page."
          icon={MonitorCog}
        />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      eyebrow="Directory"
      title="Node inventory"
      description="Filter nodes, page through results, and open node-level detail."
      action={
        <>
          {filterControl}
          {pager}
          {createAction}
        </>
      }
      contentClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead>OS / Arch</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead>Latest CPU</TableHead>
            <TableHead>Latest Temp</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {nodes.map((node) => (
            <TableRow key={node.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{node.name}</p>
                  <p className="text-xs text-muted-foreground">{node.hostname}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <NodeStatusBadge status={node.status} />
                  {node.maintenanceMode ? (
                    <Badge className="rounded-full px-2.5 py-1">
                      Maintenance
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {node.teamName ?? "Unassigned"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <TimeDisplay value={node.lastSeenAt} mode="relative" emptyLabel="Never" />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex items-center gap-2">
                  <NodeOsIcon os={node.os} className="size-4" />
                  <span>
                    {node.os} / {node.arch}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {node.agentVersion ?? "Unknown"}
              </TableCell>
              <TableCell className={node.latestMetric ? getCpuColor(node.latestMetric.cpu) : ""}>
                {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
              </TableCell>
              <TableCell
                className={
                  node.latestMetric?.temperature !== null && node.latestMetric?.temperature !== undefined
                    ? getTempColor(node.latestMetric.temperature)
                    : ""
                }
              >
                {node.latestMetric?.temperature !== null && node.latestMetric?.temperature !== undefined
                  ? `${node.latestMetric.temperature.toFixed(1)}°C`
                  : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Dialog
                    open={selectedNode?.id === node.id}
                    onOpenChange={(open) => setSelectedNode(open ? node : null)}
                  >
                    <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      Inspect
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>{node.name}</DialogTitle>
                        <DialogDescription>
                          A concise operational snapshot before opening the full node detail view.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Runtime
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <NodeOsIcon os={node.os} className="size-4.5" />
                            <p className="text-sm font-medium">{node.os}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{node.arch}</p>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Ownership
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {node.teamName ?? "Unassigned"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {node.maintenanceMode
                              ? node.maintenanceReason ?? "In maintenance mode"
                              : "Accepting new work"}
                          </p>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Status
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <NodeStatusBadge status={node.status} />
                            <TimeDisplay
                              value={node.lastSeenAt}
                              mode="relative"
                              emptyLabel="Never"
                              className="text-sm text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Hostname
                          </p>
                          <p className="mt-2 text-sm font-medium">{node.hostname}</p>
                          <p className="text-sm text-muted-foreground">
                            Created <TimeDisplay value={node.createdAt} mode="datetime" />
                          </p>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Latest telemetry
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            CPU {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
                          </p>
                          <p className="text-sm font-medium">
                            Temp{" "}
                            {node.latestMetric?.temperature !== null && node.latestMetric?.temperature !== undefined
                              ? `${node.latestMetric.temperature.toFixed(1)}°C`
                              : "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Memory {node.latestMetric ? `${node.latestMetric.memory}%` : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Link
                          href={buildWorkspaceHref(`nodes/${node.id}`) ?? "/workspaces"}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Open node
                          <ExternalLink className="size-4" />
                        </Link>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {isAdmin ? (
                    <>
                      <NodeActionMenu
                        nodeId={node.id}
                        nodeName={node.name}
                        variant="outline"
                      />
                      <DeleteNodeDialog nodeId={node.id} nodeName={node.name} />
                    </>
                  ) : null}

                  <Link
                    href={buildWorkspaceHref(`nodes/${node.id}`) ?? "/workspaces"}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    Open
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionPanel>
  );
};
