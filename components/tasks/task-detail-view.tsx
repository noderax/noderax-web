"use client";

import Link from "next/link";
import { Binary, FolderTree, ServerCog, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { SeverityBadge } from "@/components/severity-badge";
import { TaskLogStream } from "@/components/tasks/task-log-stream";
import { Badge } from "@/components/ui/badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeDisplay } from "@/components/ui/time-display";
import { useTask } from "@/lib/hooks/use-noderax-data";

export const TaskDetailView = ({ id }: { id: string }) => {
  const taskQuery = useTask(id);
  const task = taskQuery.data;

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
            label: "Latest output",
            value: task.lastOutput ?? "No output",
            description: "Most recent task message or error.",
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
        <TabsList variant="line" className="w-fit gap-1 rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="logs" className="rounded-lg px-3 py-1.5 text-xs">
            Live logs
          </TabsTrigger>
          <TabsTrigger value="execution" className="rounded-lg px-3 py-1.5 text-xs">
            Execution info
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg px-3 py-1.5 text-xs">
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
                <p className="mt-2 font-mono text-sm">{task.command ?? "No command field"}</p>
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
                {task.node ? <NodeStatusBadge status={task.node.status} /> : null}
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
                      ? `/nodes/${event.entityId}`
                      : event.entityType === "task" && event.entityId
                        ? `/tasks/${event.entityId}`
                        : "/events"
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
                  <p className="mt-2 text-sm text-muted-foreground">{event.message}</p>
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
