"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, RefreshCcw, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { SeverityBadge } from "@/components/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
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
  useAcknowledgeIncident,
  useAnalyzeIncident,
  useNodes,
  useResolveIncident,
  useWorkspaceIncidents,
} from "@/lib/hooks/use-noderax-data";
import type { EventSeverity, IncidentStatus } from "@/lib/types";

const formatIncidentStatus = (status: IncidentStatus) => {
  switch (status) {
    case "acknowledged":
      return "Acknowledged";
    case "resolved":
      return "Resolved";
    default:
      return "Open";
  }
};

export const IncidentsPageView = () => {
  const [status, setStatus] = useState<IncidentStatus | "all">("all");
  const [severity, setSeverity] = useState<EventSeverity | "all">("all");
  const [nodeId, setNodeId] = useState("all");
  const [sourcePresetId, setSourcePresetId] = useState("all");
  const [ruleId, setRuleId] = useState("all");
  const nodesQuery = useNodes({ limit: 100 });
  const incidentsQuery = useWorkspaceIncidents({
    status,
    severity,
    nodeId: nodeId === "all" ? undefined : nodeId,
    sourcePresetId: sourcePresetId === "all" ? undefined : sourcePresetId,
    ruleId: ruleId === "all" ? undefined : ruleId,
    limit: 100,
  });
  const acknowledgeIncident = useAcknowledgeIncident();
  const resolveIncident = useResolveIncident();
  const analyzeIncident = useAnalyzeIncident();

  const nodesById = useMemo(
    () => new Map((nodesQuery.data ?? []).map((node) => [node.id, node] as const)),
    [nodesQuery.data],
  );
  const incidents = incidentsQuery.data ?? [];
  const presetOptions = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.sourcePresetId))).sort(),
    [incidents],
  );
  const ruleOptions = useMemo(
    () => Array.from(new Set(incidents.map((incident) => incident.ruleId))).sort(),
    [incidents],
  );

  return (
    <AppShell>
      <SectionPanel
        eyebrow="Incidents"
        title="Workspace incident queue"
        description="Review incident matches emitted by persisted node log monitor rules."
        action={
          <div className="flex flex-wrap gap-2">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as IncidentStatus | "all")}
            >
              <SelectTrigger className="min-w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={severity}
              onValueChange={(value) => setSeverity(value as EventSeverity | "all")}
            >
              <SelectTrigger className="min-w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={nodeId}
              onValueChange={(value) => setNodeId(value ?? "all")}
            >
              <SelectTrigger className="min-w-52">
                <SelectValue placeholder="Node" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All nodes</SelectItem>
                {(nodesQuery.data ?? []).map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sourcePresetId}
              onValueChange={(value) => setSourcePresetId(value ?? "all")}
            >
              <SelectTrigger className="min-w-44">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All presets</SelectItem>
                {presetOptions.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ruleId} onValueChange={(value) => setRuleId(value ?? "all")}>
              <SelectTrigger className="min-w-44">
                <SelectValue placeholder="Rule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rules</SelectItem>
                {ruleOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ShimmerButton
              className="action-btn"
              onClick={() => void incidentsQuery.refetch()}
              disabled={incidentsQuery.isFetching}
            >
              <RefreshCcw
                className={incidentsQuery.isFetching ? "size-4 animate-spin" : "size-4"}
              />
            </ShimmerButton>
          </div>
        }
        contentClassName={incidents.length ? "p-0" : undefined}
      >
        {incidentsQuery.isPending ? (
          <div className="space-y-3 px-5 py-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : incidents.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Severity</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Preset</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Hits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((incident) => (
                <TableRow key={incident.id}>
                  <TableCell>
                    <SeverityBadge severity={incident.severity} />
                  </TableCell>
                  <TableCell className="max-w-[30rem]">
                    <div>
                      <p className="font-medium">{incident.title}</p>
                      {incident.latestAnalysis ? (
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="size-3.5" />
                          {incident.latestAnalysis.summary}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{nodesById.get(incident.nodeId)?.name ?? incident.nodeId}</TableCell>
                  <TableCell>{incident.sourcePresetId}</TableCell>
                  <TableCell>
                    <Badge variant={incident.status === "resolved" ? "secondary" : "outline"}>
                      {formatIncidentStatus(incident.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TimeDisplay value={incident.lastSeenAt} mode="datetime" />
                  </TableCell>
                  <TableCell>{incident.hitCount}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {incident.status !== "acknowledged" &&
                      incident.status !== "resolved" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeIncident.mutate(incident.id)}
                        >
                          Ack
                        </Button>
                      ) : null}
                      {incident.status !== "resolved" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => resolveIncident.mutate(incident.id)}
                        >
                          Resolve
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          analyzeIncident.mutate({
                            incidentId: incident.id,
                            payload: { model: "gpt-5.4-mini" },
                          })
                        }
                      >
                        Analyze
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No incidents found"
            description="Persist log monitor rules on nodes to populate the workspace incident queue."
            icon={AlertTriangle}
          />
        )}
      </SectionPanel>
    </AppShell>
  );
};
