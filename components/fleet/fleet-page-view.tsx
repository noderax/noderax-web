"use client";

import { useMemo, useState } from "react";
import { Boxes, RefreshCw, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useFleetNodes,
  useWorkspaceTeams,
  useWorkspaces,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";

export const FleetPageView = () => {
  const { isPlatformAdmin } = useWorkspaceContext();
  const workspacesQuery = useWorkspaces(isPlatformAdmin);
  const [workspaceId, setWorkspaceId] = useState<"all" | string>("all");
  const [teamId, setTeamId] = useState<"all" | string>("all");
  const [status, setStatus] = useState<"all" | "online" | "offline">("all");
  const [maintenanceMode, setMaintenanceMode] = useState<
    "all" | "maintenance" | "active"
  >("all");
  const teamsQuery = useWorkspaceTeams(isPlatformAdmin && workspaceId !== "all");
  const nodesQuery = useFleetNodes(
    {
      workspaceId: workspaceId === "all" ? undefined : workspaceId,
      teamId: teamId === "all" ? undefined : teamId,
      status: status === "all" ? undefined : status,
      maintenanceMode:
        maintenanceMode === "all"
          ? undefined
          : maintenanceMode === "maintenance",
    },
    isPlatformAdmin,
  );

  const fleetNodes = nodesQuery.data ?? [];
  const onlineNodes = fleetNodes.filter((node) => node.status === "online").length;
  const maintenanceNodes = fleetNodes.filter((node) => node.maintenanceMode).length;
  const versionReportingNodes = fleetNodes.filter((node) => Boolean(node.agentVersion)).length;
  const teams = teamsQuery.data ?? [];
  const workspaceNameLookup = useMemo(
    () =>
      new Map(
        (workspacesQuery.data ?? []).map((workspace) => [workspace.id, workspace.name] as const),
      ),
    [workspacesQuery.data],
  );
  const selectedWorkspaceName =
    workspaceId === "all"
      ? "All workspaces"
      : workspacesQuery.data?.find((workspace) => workspace.id === workspaceId)?.name ??
        "Selected workspace";

  if (!isPlatformAdmin) {
    return (
      <AppShell>
        <EmptyState
          title="Fleet view is restricted"
          description="Only platform admins can review fleet-wide node telemetry."
          icon={ShieldAlert}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionPanel
          eyebrow="Fleet"
          title="Agent fleet inventory"
          description="Review agent version telemetry, team ownership, and maintenance visibility across every workspace."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void nodesQuery.refetch();
              }}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          }
          contentClassName="space-y-6"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Visible nodes: {fleetNodes.length}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Online: {onlineNodes}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Maintenance: {maintenanceNodes}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Reporting version: {versionReportingNodes}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select
              value={workspaceId}
              onValueChange={(value) => {
                setWorkspaceId(value ?? "all");
                setTeamId("all");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workspaces</SelectItem>
                {(workspacesQuery.data ?? []).map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teamId} onValueChange={(value) => setTeamId(value ?? "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Filter team" />
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
            <Select value={status} onValueChange={(value) => setStatus((value ?? "all") as typeof status)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={maintenanceMode}
              onValueChange={(value) =>
                setMaintenanceMode((value ?? "all") as typeof maintenanceMode)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter maintenance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All availability</SelectItem>
                <SelectItem value="active">Accepting work</SelectItem>
                <SelectItem value="maintenance">Maintenance only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <SectionPanel
            eyebrow="Nodes"
            title={`Fleet nodes in ${selectedWorkspaceName}`}
            description="Version telemetry and maintenance visibility for the currently filtered node slice."
            contentClassName="p-0"
          >
            {nodesQuery.isError ? (
              <EmptyState
                title="Fleet nodes unavailable"
                description="The platform could not load fleet node data right now."
                icon={Boxes}
                actionLabel="Retry"
                onAction={() => nodesQuery.refetch()}
              />
            ) : !nodesQuery.isPending && fleetNodes.length === 0 ? (
              <EmptyState
                title="No fleet nodes found"
                description="Try widening the fleet filters or wait for more agents to report telemetry."
                icon={Boxes}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Node</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Last report</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fleetNodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">{node.hostname}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {workspaceNameLookup.get(node.workspaceId) ?? node.workspaceId}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{node.agentVersion ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {node.platformVersion ?? node.kernelVersion ?? "No platform telemetry"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-full px-2.5 py-1">
                            {node.status}
                          </Badge>
                          {node.maintenanceMode ? (
                            <Badge className="rounded-full px-2.5 py-1">Maintenance</Badge>
                          ) : null}
                          <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                            {node.platformFamily}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {node.teamName ?? "Unassigned"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <TimeDisplay
                          value={node.lastVersionReportedAt}
                          mode="datetime"
                          emptyLabel="Not reported"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionPanel>
        </SectionPanel>
      </div>
    </AppShell>
  );
};
