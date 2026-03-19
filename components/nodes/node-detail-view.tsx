"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Network, Timer } from "lucide-react";

import { DeleteNodeDialog } from "@/components/nodes/delete-node-dialog";
import { NodeOsIcon } from "@/components/nodes/node-os-icon";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { SeverityBadge } from "@/components/severity-badge";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { StatStrip } from "@/components/ui/stat-strip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useNode } from "@/lib/hooks/use-noderax-data";
import { useNodeRealtimeSubscription } from "@/lib/hooks/use-realtime";

export const NodeDetailView = ({ id }: { id: string }) => {
  const router = useRouter();
  const authQuery = useAuthSession();

  useNodeRealtimeSubscription(id);

  const nodeQuery = useNode(id);
  const node = nodeQuery.data;
  const isAdmin = authQuery.session?.user.role === "admin";

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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[22px] bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="surface-subtle flex size-12 shrink-0 items-center justify-center rounded-2xl border">
            <NodeOsIcon os={node.os} className="size-6" />
          </div>
          <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{node.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span>{node.hostname}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <NodeOsIcon os={node.os} className="size-4" />
              {node.os} / {node.arch}
            </span>
          </p>
        </div>
        </div>
        {isAdmin ? (
          <DeleteNodeDialog
            nodeId={node.id}
            nodeName={node.name}
            triggerLabel="Delete node"
            triggerVariant="destructive"
            onDeleted={() => router.replace("/nodes")}
          />
        ) : null}
      </div>

      <StatStrip
        items={[
          {
            label: "Latest CPU",
            value: node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A",
            description: "Most recent reported CPU usage.",
            tone: "brand",
          },
          {
            label: "Latest memory",
            value: node.latestMetric ? `${node.latestMetric.memory}%` : "N/A",
            description: "Most recent reported memory usage.",
            tone: "success",
          },
          {
            label: "Latest disk",
            value: node.latestMetric ? `${node.latestMetric.disk}%` : "N/A",
            description: "Most recent reported disk usage.",
            tone: "warning",
          },
          {
            label: "Network summary",
            value: `${String(node.networkStats?.rxBytes ?? "N/A")} / ${String(node.networkStats?.txBytes ?? "N/A")}`,
            description: "RX bytes / TX bytes from the latest metric sample.",
            tone: "neutral",
          },
        ]}
      />

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList variant="line" className="w-fit gap-1 rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="metrics" className="rounded-lg px-3 py-1.5 text-xs">
            Metrics
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg px-3 py-1.5 text-xs">
            Running tasks
          </TabsTrigger>
          <TabsTrigger value="events" className="rounded-lg px-3 py-1.5 text-xs">
            Event history
          </TabsTrigger>
        </TabsList>
        <TabsContent value="metrics" className="mt-0">
          <MetricsChart
            data={node.metrics}
            title="Node telemetry"
            description="CPU, memory, and disk samples ingested for this node."
          />
        </TabsContent>
        <TabsContent value="tasks" className="mt-0">
          <SectionPanel
            eyebrow="Execution"
            title="Running tasks"
            description="Active workloads currently scheduled on this node."
            contentClassName="space-y-3"
          >
            {node.runningTasks.length ? (
              node.runningTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="surface-subtle surface-hover block rounded-[18px] border px-4 py-3"
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
          </SectionPanel>
        </TabsContent>
        <TabsContent value="events" className="mt-0">
          <SectionPanel
            eyebrow="History"
            title="Node event history"
            description="Alerts, recoveries, and task activity recorded for this node."
            contentClassName="space-y-3"
          >
            {node.recentEvents.length ? (
              node.recentEvents.map((event) => (
                <div
                  key={event.id}
                  className="surface-subtle rounded-[18px] border px-4 py-3"
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
          </SectionPanel>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};
