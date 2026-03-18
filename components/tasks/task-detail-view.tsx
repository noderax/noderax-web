"use client";

import Link from "next/link";
import { Binary, FolderTree, ServerCog, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TaskLogStream } from "@/components/tasks/task-log-stream";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { SeverityBadge } from "@/components/severity-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Task Detail"
        title={task.name}
        description={
          <>
            {task.command ?? task.type} • Scheduled on {task.nodeName} • Created{" "}
            <TimeDisplay value={task.createdAt} mode="relative" />
          </>
        }
        actions={<TaskStatusBadge status={task.status} />}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Task type</CardTitle>
            <CardDescription>Backend task discriminator.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Binary className="size-4" />
            </div>
            <p className="font-medium">{task.type}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Scheduled node</CardTitle>
            <CardDescription>Node currently associated with this task.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
              <ServerCog className="size-4" />
            </div>
            <div>
              <p className="font-medium">{task.nodeName}</p>
              <p className="text-sm text-muted-foreground">
                {task.node?.hostname ?? "Hostname unavailable"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Latest output</CardTitle>
            <CardDescription>Most recent task message or error.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {task.lastOutput ?? "No task output captured yet."}
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Exit code</CardTitle>
            <CardDescription>Resolved from task result metadata.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {task.exitCode ?? "N/A"}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="mt-6">
        <TabsList variant="line" className="rounded-none bg-transparent p-0">
          <TabsTrigger value="logs">Live logs</TabsTrigger>
          <TabsTrigger value="execution">Execution info</TabsTrigger>
          <TabsTrigger value="events">Related events</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="mt-6">
          <TaskLogStream taskId={task.id} taskStatus={task.status} />
        </TabsContent>
        <TabsContent value="execution" className="mt-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="border-0 bg-card/70 shadow-dashboard">
              <CardHeader>
                <CardTitle>Execution detail</CardTitle>
                <CardDescription>
                  Metadata captured when the task was queued and completed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Command
                  </p>
                  <p className="mt-2 font-mono text-sm">{task.command ?? "No command field"}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Payload
                  </p>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                    {JSON.stringify(task.payload, null, 2)}
                  </pre>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Result
                  </p>
                  <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                    {JSON.stringify(task.result, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card/70 shadow-dashboard">
              <CardHeader>
                <CardTitle>Execution timeline</CardTitle>
                <CardDescription>
                  Status transitions derived from the backend timestamps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <TimeDisplay
                    value={task.createdAt}
                    mode="relative"
                    emptyLabel="Not available"
                    className="mt-1 block font-medium"
                  />
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-muted-foreground">Started</p>
                  <TimeDisplay
                    value={task.startedAt}
                    mode="relative"
                    emptyLabel="Not available"
                    className="mt-1 block font-medium"
                  />
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
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
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <CardTitle>Task event history</CardTitle>
              <CardDescription>
                Related node-scoped events derived from task metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    className="block rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
