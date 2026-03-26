"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Binary,
  FolderTree,
  ServerCog,
  ShieldAlert,
  TerminalSquare,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { SeverityBadge } from "@/components/severity-badge";
import { CancelTaskDialog } from "@/components/tasks/cancel-task-dialog";
import { TaskLogStream } from "@/components/tasks/task-log-stream";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeDisplay } from "@/components/ui/time-display";
import { apiClient } from "@/lib/api";
import { queryKeys, useTask } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { TaskDetail, TaskStatus } from "@/lib/types";

const QUEUED_CLAIM_WARNING_THRESHOLD_MS = 20_000;
const CANCEL_FALLBACK_POLL_INTERVAL_MS = 2_000;
const CANCEL_FALLBACK_TIMEOUT_MS = 60_000;

const readExitCode = (result: Record<string, unknown> | null) => {
  if (!result) {
    return null;
  }

  const value = result.exitCode;
  return typeof value === "number" ? value : null;
};

const isTerminalStatus = (status: TaskStatus) =>
  status === "success" || status === "failed" || status === "cancelled";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
};

const formatTerminalOutput = (task: TaskDetail) => {
  if (task.type === "packageList" && task.result?.packages) {
    const pkgs = task.result.packages as { name: string; version?: string }[];
    return pkgs.map((p) => `[pkg] ${p.name}${p.version ? ` (${p.version})` : ""}`).join("\n");
  }
  return task.lastOutput ?? "No recent output available.";
};

export const TaskDetailView = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const { buildWorkspaceHref, isWorkspaceAdmin, workspaceId } =
    useWorkspaceContext();
  const taskQuery = useTask(id);
  const task = taskQuery.data;
  const [now, setNow] = useState(() => Date.now());
  const [isCancelling, setIsCancelling] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    if (!task || task.status !== "queued") {
      return;
    }

    const interval = globalThis.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      globalThis.clearInterval(interval);
    };
  }, [task]);

  const queuedForMs = useMemo(() => {
    if (!task || task.status !== "queued") {
      return 0;
    }

    const createdAtMs = Date.parse(task.createdAt);
    if (Number.isNaN(createdAtMs)) {
      return 0;
    }

    return Math.max(0, now - createdAtMs);
  }, [now, task]);

  const showClaimWarning =
    task?.status === "queued" &&
    queuedForMs >= QUEUED_CLAIM_WARNING_THRESHOLD_MS;
  const taskStatusForUi: TaskStatus | "cancelling" =
    isCancelling && task?.status === "running"
      ? "cancelling"
      : (task?.status ?? "queued");
  const isAdmin = isWorkspaceAdmin;
  const syncCancellationState = useEffectEvent((status: TaskStatus) => {
    if (status === "cancelled") {
      toast.success("Task stopped.");
    }

    if (status === "cancelled" || status === "success" || status === "failed") {
      setIsCancelling(false);
    }
  });

  useEffect(() => {
    if (!task || !isCancelling) {
      return;
    }

    if (
      task.status === "cancelled" ||
      task.status === "success" ||
      task.status === "failed"
    ) {
      syncCancellationState(task.status);
    }
  }, [isCancelling, task]);

  useEffect(() => {
    if (!task || !isCancelling || task.status !== "running") {
      return;
    }

    const startedAt = Date.now();
    let stopped = false;

    const syncTaskDetail = (status: TaskStatus) => {
      if (isTerminalStatus(status)) {
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        });
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "overview"],
          refetchType: "active",
        });
      }
    };

    const tick = async () => {
      if (stopped) {
        return;
      }

      if (Date.now() - startedAt >= CANCEL_FALLBACK_TIMEOUT_MS) {
        setIsCancelling(false);
        toast.warning("Stop request was sent. Status update is delayed.");
        return;
      }

      try {
        const latestTask = await apiClient.getTask(id, workspaceId ?? undefined);
        if (stopped) {
          return;
        }

        queryClient.setQueryData<TaskDetail | undefined>(
          workspaceId
            ? queryKeys.tasks.detail(workspaceId, id)
            : (["tasks", "detail", id] as const),
          (current) =>
            current
              ? {
                  ...current,
                  status: latestTask.status,
                  startedAt: latestTask.startedAt,
                  finishedAt: latestTask.finishedAt,
                  updatedAt: latestTask.updatedAt,
                  lastOutput: latestTask.output,
                  result: latestTask.result,
                  exitCode: readExitCode(latestTask.result) ?? current.exitCode,
                }
              : current,
        );

        syncTaskDetail(latestTask.status);

        if (isTerminalStatus(latestTask.status)) {
          setIsCancelling(false);
        }
      } catch {
        // Websocket may still update status; keep fallback polling until timeout.
      }
    };

    void tick();
    const interval = globalThis.setInterval(() => {
      void tick();
    }, CANCEL_FALLBACK_POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      globalThis.clearInterval(interval);
    };
  }, [id, isCancelling, queryClient, task, workspaceId]);

  if (taskQuery.isError || (!taskQuery.isPending && !task)) {
    return (
      <AppShell>
        <EmptyState
          title="Task not found"
          description="The requested task detail could not be loaded. It may have been deleted or never existed in the current environment."
          icon={ShieldAlert}
        />
      </AppShell>
    );
  }

  if (!task) {
    return (
      <AppShell>
        <div className="h-32 animate-pulse rounded-[22px] bg-muted" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {showClaimWarning ? (
        <div className="mb-4 flex items-start gap-3 rounded-[18px] border border-tone-warning/40 bg-tone-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-warning" />
          <div>
            <p className="font-medium text-foreground">
              Agent has not claimed this task yet.
            </p>
            <p className="mt-1 text-muted-foreground">
              The task has remained queued for {formatDuration(queuedForMs)}.
              This may indicate a claim or polling issue on the backend agent
              side.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <TaskStatusBadge status={task.status} />
        <div className="flex items-center gap-2">
          {task.scheduleId ? (
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Scheduled
            </Badge>
          ) : null}
          {taskStatusForUi === "cancelling" ? (
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 tone-warning"
            >
              Cancelling
            </Badge>
          ) : null}
          {isAdmin ? (
            <CancelTaskDialog
              taskId={task.id}
              taskStatus={task.status}
              onRequested={(status) => {
                if (status === "running") {
                  setIsCancelling(true);
                  return;
                }

                if (status === "cancelled") {
                  setIsCancelling(false);
                }
              }}
            />
          ) : null}
        </div>
      </div>

      <StatStrip
        items={[
          {
            label: "Task type",
            value: task.type,
            description: "Backend task discriminator.",
            icon: Binary,
            tone: "brand",
          },
          {
            label: "Scheduled node",
            value: task.nodeName,
            description: task.node?.hostname ?? "Hostname unavailable",
            icon: ServerCog,
            tone: "success",
          },
          {
            label: "Related events",
            value: task.relatedEvents?.length.toString() ?? "0",
            description: "Number of node events linked.",
            icon: FolderTree,
            tone: "warning",
          },
          {
            label: "Exit code",
            value: task.exitCode ?? "N/A",
            description: "Resolved from task result metadata.",
            tone: "danger",
          },
        ]}
      />

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList
          variant="line"
          className="w-fit gap-1 rounded-xl bg-muted/70 p-1"
        >
          <TabsTrigger value="logs" className="rounded-lg px-3 py-1.5 text-xs">
            Live logs
          </TabsTrigger>
          <TabsTrigger
            value="execution"
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Execution info
          </TabsTrigger>
          <TabsTrigger
            value="events"
            className="rounded-lg px-3 py-1.5 text-xs"
          >
            Related events
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-0">
          <TaskLogStream taskId={task.id} taskStatus={task.status} />
        </TabsContent>
        <TabsContent value="execution" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionPanel
              eyebrow="Payload"
              title="Execution detail"
              description="Metadata captured when the task was queued and completed."
              contentClassName="space-y-4"
            >
              <div className="surface-subtle rounded-[18px] border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Command
                </p>
                <p className="mt-2 font-mono text-sm">
                  {task.command ?? "No command field"}
                </p>
                {task.scheduleName ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Source schedule:{" "}
                    <span className="font-medium text-foreground">{task.scheduleName}</span>
                  </p>
                ) : null}
              </div>
              <div className="surface-subtle rounded-[18px] border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Execution Output
                  </p>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="terminal-mode" className="text-xs text-muted-foreground mr-1">Terminal view</Label>
                    <Switch id="terminal-mode" size="sm" checked={showTerminal} onCheckedChange={setShowTerminal} />
                  </div>
                </div>
                {showTerminal ? (
                  <div className="mt-3 rounded-lg bg-[#0e0e0e] border border-white/10 p-4">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                       <TerminalSquare className="size-4 text-emerald-400" />
                       <span className="text-xs font-medium text-emerald-400 font-mono">Terminal Window</span>
                    </div>
                    <pre className="h-96 overflow-y-auto overflow-x-auto text-[13px] font-mono leading-relaxed text-[#a8ff60] selection:bg-emerald-900 scrollbar-thumb-emerald-800 scrollbar-track-transparent">
                      {formatTerminalOutput(task)}
                    </pre>
                  </div>
                ) : (
                  <pre className="mt-2 max-h-40 overflow-y-auto overflow-x-auto text-xs text-muted-foreground">
                    {task.lastOutput ?? "No recent output"}
                  </pre>
                )}
              </div>
              <div className="surface-subtle rounded-[18px] border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Payload
                </p>
                <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                  {JSON.stringify(task.payload, null, 2)}
                </pre>
              </div>
              <div className="surface-subtle rounded-[18px] border p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Result
                </p>
                <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </div>
            </SectionPanel>

            <SectionPanel
              eyebrow="Timeline"
              title="Execution timeline"
              description="Status transitions derived from the backend timestamps."
              contentClassName="space-y-3"
            >
              <div className="surface-subtle rounded-[18px] border p-4">
                <p className="text-sm text-muted-foreground">Created</p>
                <TimeDisplay
                  value={task.createdAt}
                  mode="relative"
                  emptyLabel="Not available"
                  className="mt-1 block font-medium"
                />
              </div>
              <div className="surface-subtle rounded-[18px] border p-4">
                <p className="text-sm text-muted-foreground">Started</p>
                <TimeDisplay
                  value={task.startedAt}
                  mode="relative"
                  emptyLabel="Not available"
                  className="mt-1 block font-medium"
                />
              </div>
              <div className="surface-subtle rounded-[18px] border p-4">
                <p className="text-sm text-muted-foreground">Finished</p>
                <TimeDisplay
                  value={task.finishedAt}
                  mode="relative"
                  emptyLabel="Not available"
                  className="mt-1 block font-medium"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Node: {task.nodeName}
                </Badge>
                {task.node ? (
                  <NodeStatusBadge status={task.node.status} />
                ) : null}
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Status: {task.status}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Updated:{" "}
                  <TimeDisplay
                    value={task.updatedAt}
                    mode="relative"
                    emptyLabel="Not available"
                  />
                </Badge>
              </div>
            </SectionPanel>
          </div>
        </TabsContent>
        <TabsContent value="events" className="mt-0">
          <SectionPanel
            eyebrow="History"
            title="Task event history"
            description="Related node-scoped events derived from task metadata."
            contentClassName="space-y-3"
          >
            {task.relatedEvents.length ? (
              task.relatedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={
                    event.entityType === "node" && event.entityId
                      ? (buildWorkspaceHref(`nodes/${event.entityId}`) ??
                        "/workspaces")
                      : event.entityType === "task" && event.entityId
                        ? (buildWorkspaceHref(`tasks/${event.entityId}`) ??
                          "/workspaces")
                        : (buildWorkspaceHref("events") ?? "/workspaces")
                  }
                  className="surface-subtle surface-hover block rounded-[18px] border px-4 py-3"
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
                </Link>
              ))
            ) : (
              <EmptyState
                title="No related events"
                description="The backend has not recorded any task-linked events for this execution yet."
                icon={FolderTree}
                className="min-h-56"
              />
            )}
          </SectionPanel>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
