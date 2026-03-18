"use client";

import Link from "next/link";
import { Network, Timer } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNodeDetailQuery } from "@/lib/hooks/use-noderax-data";

export const NodeDetailView = ({ id }: { id: string }) => {
  const nodeQuery = useNodeDetailQuery(id);
  const node = nodeQuery.data;

  if (nodeQuery.isError || (!nodeQuery.isPending && !node)) {
    return (
      <AppShell>
        <EmptyState
          title="Node not found"
          description="The requested node detail could not be loaded. It may have been decommissioned or filtered out upstream."
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
        description={`${node.hostname} • ${node.ipAddress} • Last heartbeat ${formatDistanceToNowStrict(
          new Date(node.lastHeartbeat),
          { addSuffix: true },
        )}`}
        actions={<NodeStatusBadge status={node.status} />}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {node.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="rounded-full px-3 py-1">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Average CPU</CardTitle>
            <CardDescription>Current host pressure signal.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{node.avgCpuLoad}%</CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>Workers attached to this node.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{node.agentCount}</CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Kernel</CardTitle>
            <CardDescription>Runtime + distribution pair.</CardDescription>
          </CardHeader>
          <CardContent className="text-lg font-medium">
            {node.os}
            <p className="mt-1 text-sm text-muted-foreground">{node.kernel}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-card/70 shadow-dashboard">
          <CardHeader>
            <CardTitle>Uptime</CardTitle>
            <CardDescription>Host uptime in hours.</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{node.uptimeHours}h</CardContent>
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
            description="CPU, memory, and disk series captured from this host."
          />
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
          <Card className="border-0 bg-card/70 shadow-dashboard">
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
                    className="block rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/30"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{task.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{task.command}</p>
                      </div>
                      <Badge variant="outline" className="rounded-full px-3 py-1">
                        {task.progress}%
                      </Badge>
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
          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <CardTitle>Node event history</CardTitle>
              <CardDescription>
                Timeline of alerts, recoveries, and telemetry anomalies tied to this host.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {node.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{event.title}</p>
                    <Badge variant="outline" className="rounded-full px-3 py-1">
                      {event.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{event.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
