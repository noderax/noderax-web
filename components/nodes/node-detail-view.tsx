"use client";

import Link from "next/link";
import { Network, Timer } from "lucide-react";

import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { SeverityBadge } from "@/components/severity-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeDisplay } from "@/components/ui/time-display";
import { useNode } from "@/lib/hooks/use-noderax-data";

export const NodeDetailView = ({ id }: { id: string }) => {
  const nodeQuery = useNode(id);
  const node = nodeQuery.data;

  if (nodeQuery.isError || (!nodeQuery.isPending && !node)) {
    return (
      <AppShell>
        <EmptyState
          title="Node not found"
          description="The requested node detail could not be loaded. It may have been decommissioned or is unavailable upstream."
          icon={Network}
        />
      </AppShell>
    );
  }

  if (!node) {
    return (
      <AppShell>
        <div className="grid gap-6 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Node Detail"
        title={node.name}
        description={
          <>
            {node.hostname} • {node.os} / {node.arch} • Last seen{" "}
            <TimeDisplay value={node.lastSeenAt} mode="relative" emptyLabel="Never" />
          </>
        }
        meta={
          <>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Hostname</span>{" "}
              <span className="font-semibold">{node.hostname}</span>
            </div>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Created</span>{" "}
              <TimeDisplay value={node.createdAt} mode="date" />
            </div>
            {node.lastSeenAt ? (
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Last seen</span>{" "}
                <TimeDisplay value={node.lastSeenAt} mode="relative" emptyLabel="Never" />
              </div>
            ) : null}
          </>
        }
        actions={
          <>
            <div className="min-w-[10rem] flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Fleet state
              </p>
              <p className="mt-1 text-sm font-medium">
                {node.latestMetric ? `${node.latestMetric.cpu}% CPU / ${node.latestMetric.memory}% MEM` : "Telemetry pending"}
              </p>
            </div>
            <NodeStatusBadge status={node.status} />
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="surface-panel border">
          <CardHeader>
            <CardTitle>Latest CPU</CardTitle>
            <CardDescription>Most recent reported CPU usage.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
          </CardContent>
        </Card>
        <Card className="surface-panel border">
          <CardHeader>
            <CardTitle>Latest memory</CardTitle>
            <CardDescription>Most recent reported memory usage.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {node.latestMetric ? `${node.latestMetric.memory}%` : "N/A"}
          </CardContent>
        </Card>
        <Card className="surface-panel border">
          <CardHeader>
            <CardTitle>Latest disk</CardTitle>
            <CardDescription>Most recent reported disk usage.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {node.latestMetric ? `${node.latestMetric.disk}%` : "N/A"}
          </CardContent>
        </Card>
        <Card className="surface-panel border">
          <CardHeader>
            <CardTitle>Network summary</CardTitle>
            <CardDescription>Aggregated counters from the latest metric sample.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>RX bytes: {String(node.networkStats?.rxBytes ?? "N/A")}</p>
            <p>TX bytes: {String(node.networkStats?.txBytes ?? "N/A")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="mt-6">
        <TabsList variant="line" className="rounded-none bg-transparent p-0">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="tasks">Running tasks</TabsTrigger>
          <TabsTrigger value="events">Event history</TabsTrigger>
        </TabsList>
        <TabsContent value="metrics" className="mt-6">
          <MetricsChart
            data={node.metrics}
            title="Node telemetry"
            description="CPU, memory, and disk samples ingested for this node."
          />
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
          <Card className="surface-panel border">
            <CardHeader>
              <CardTitle>Running tasks</CardTitle>
              <CardDescription>
                Active workloads presently scheduled on this node.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {node.runningTasks.length ? (
                node.runningTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="surface-subtle surface-hover block rounded-2xl border p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {task.command ?? task.type}
                        </p>
                      </div>
                      <TaskStatusBadge status={task.status} />
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No active tasks"
                  description="This node is currently idle and ready to accept new task assignments."
                  icon={Timer}
                  className="min-h-48"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="events" className="mt-6">
          <Card className="surface-panel border">
            <CardHeader>
              <CardTitle>Node event history</CardTitle>
              <CardDescription>
                Alerts, recoveries, and task activity recorded for this node.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {node.recentEvents.length ? (
                node.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="surface-subtle rounded-2xl border p-4"
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
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No node events yet"
                  description="This node has not produced any recorded events in the selected time window."
                  icon={Network}
                  className="min-h-48"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
