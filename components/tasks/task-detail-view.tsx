"use client";

import Link from "next/link";
import { FolderTree, ImageIcon, ShieldAlert, UserRound } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TaskLogStream } from "@/components/tasks/task-log-stream";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaskDetailQuery } from "@/lib/hooks/use-noderax-data";

export const TaskDetailView = ({ id }: { id: string }) => {
  const taskQuery = useTaskDetailQuery(id);
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
        description={`${task.command} • Scheduled on ${task.nodeName} • Created ${formatDistanceToNowStrict(
          new Date(task.createdAt),
          { addSuffix: true },
        )}`}
        actions={<TaskStatusBadge status={task.status} />}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Operator</CardTitle>
            <CardDescription>Owning or triggering actor.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <UserRound className="size-4" />
            </div>
            <div>
              <p className="font-medium">{task.operator}</p>
              <p className="text-sm text-muted-foreground">Retries: {task.retries}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Container image</CardTitle>
            <CardDescription>Execution artifact pinned for the task.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
              <ImageIcon className="size-4" />
            </div>
            <p className="font-mono text-sm">{task.image}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Working directory</CardTitle>
            <CardDescription>Runtime filesystem entry point.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
              <FolderTree className="size-4" />
            </div>
            <p className="font-mono text-sm">{task.workingDirectory}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Execution state</CardTitle>
            <CardDescription>Progress and exit metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="font-mono">{task.progress}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Exit code</span>
              <span className="font-mono">{task.exitCode ?? "N/A"}</span>
            </div>
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
          <TaskLogStream taskId={task.id} initialLogs={task.logs} />
        </TabsContent>
        <TabsContent value="execution" className="mt-6">
          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <CardTitle>Execution detail</CardTitle>
              <CardDescription>
                Metadata captured at enqueue and runtime start.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Command
                </p>
                <p className="mt-2 font-mono text-sm">{task.command}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Node: {task.nodeName}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Started: {task.startedAt ? formatDistanceToNowStrict(new Date(task.startedAt), { addSuffix: true }) : "Not started"}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Completed: {task.completedAt ? formatDistanceToNowStrict(new Date(task.completedAt), { addSuffix: true }) : "In progress"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <CardTitle>Task event history</CardTitle>
              <CardDescription>
                Alerts and orchestration updates emitted around this execution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.events.map((event) => (
                <Link
                  key={event.id}
                  href="/events"
                  className="block rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{event.title}</p>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {event.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{event.message}</p>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
