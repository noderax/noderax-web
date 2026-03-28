"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Search } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SectionPanel } from "@/components/ui/section-panel";
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
  usePlatformAuditLogs,
  useWorkspaceAuditLogs,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";

const formatActor = (email: string | null, actorType: "user" | "system") =>
  email ?? (actorType === "system" ? "System" : "Unknown operator");

const formatTarget = (
  targetType: string,
  targetLabel: string | null,
  targetId: string | null,
) => targetLabel ?? targetId ?? targetType;

export const AuditPageView = ({
  scope,
}: {
  scope: "platform" | "workspace";
}) => {
  const { isPlatformAdmin, isWorkspaceAdmin, workspace } = useWorkspaceContext();
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const filters = useMemo(
    () => ({
      actor: actorFilter.trim() || undefined,
      action: actionFilter.trim() || undefined,
      targetType: targetTypeFilter.trim() || undefined,
      limit: 100,
    }),
    [actionFilter, actorFilter, targetTypeFilter],
  );

  const platformLogsQuery = usePlatformAuditLogs(
    filters,
    scope === "platform" && isPlatformAdmin,
  );
  const workspaceLogsQuery = useWorkspaceAuditLogs(
    filters,
    scope === "workspace" && isWorkspaceAdmin,
  );
  const query = scope === "platform" ? platformLogsQuery : workspaceLogsQuery;
  const logs = query.data ?? [];
  const uniqueActors = new Set(
    logs.map((log) => formatActor(log.actorEmailSnapshot, log.actorType)),
  );

  if (scope === "platform" && !isPlatformAdmin) {
    return (
      <AppShell>
        <EmptyState
          title="Platform audit is restricted"
          description="Only platform admins can review global audit history."
          icon={ClipboardList}
        />
      </AppShell>
    );
  }

  if (scope === "workspace" && !isWorkspaceAdmin) {
    return (
      <AppShell>
        <EmptyState
          title="Workspace audit is restricted"
          description="Only workspace owners and admins can review audit history."
          icon={ClipboardList}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionPanel
          eyebrow="Audit"
          title={
            scope === "platform"
              ? "Platform audit log"
              : `${workspace?.name ?? "Workspace"} audit log`
          }
          description="Review append-only admin and security activity with actor, target, and timestamp context."
          action={
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                value={actorFilter}
                onChange={(event) => setActorFilter(event.target.value)}
                placeholder="Filter actor email"
              />
              <Input
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                placeholder="Filter action key"
              />
              <Input
                value={targetTypeFilter}
                onChange={(event) => setTargetTypeFilter(event.target.value)}
                placeholder="Filter target type"
              />
            </div>
          }
          contentClassName="space-y-4"
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Entries: {logs.length}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Unique actors: {uniqueActors.size}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Scope: {scope}
            </Badge>
          </div>

          {query.isError ? (
            <EmptyState
              title="Audit log is unavailable"
              description="The audit stream could not be loaded from the authenticated API connection."
              icon={Search}
              actionLabel="Retry"
              onAction={() => query.refetch()}
            />
          ) : !query.isPending && logs.length === 0 ? (
            <EmptyState
              title="No audit entries found"
              description="Try widening the filters or perform an admin action to generate a fresh audit trail."
              icon={ClipboardList}
            />
          ) : (
            <div className="overflow-hidden rounded-[20px] border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground">
                        <TimeDisplay value={log.createdAt} mode="datetime" />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {formatActor(log.actorEmailSnapshot, log.actorType)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.ipAddress ?? "No IP recorded"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full px-2.5 py-1">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {formatTarget(log.targetType, log.targetLabel, log.targetId)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.targetType}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[24rem]">
                        <pre className="line-clamp-4 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                          {JSON.stringify(
                            log.changes ?? log.metadata ?? {},
                            null,
                            2,
                          )}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionPanel>
      </div>
    </AppShell>
  );
};
