"use client";

import { AlertTriangle, Boxes, CirclePlay, ServerCog } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { RecentEventsFeed } from "@/components/dashboard/recent-events-feed";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardOverviewQuery } from "@/lib/hooks/use-noderax-data";

export const DashboardView = () => {
  const overviewQuery = useDashboardOverviewQuery();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Infrastructure overview"
        description="A single operational surface for node health, task throughput, and incident visibility."
      />

      {overviewQuery.isPending ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-3xl" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <Skeleton className="h-[420px] rounded-3xl" />
            <Skeleton className="h-[420px] rounded-3xl" />
          </div>
        </div>
      ) : overviewQuery.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard
              title="Total Nodes"
              value={overviewQuery.data.totals.totalNodes}
              description="Fleet members connected to the Noderax control plane."
              icon={Boxes}
              tone="blue"
              delay={0}
            />
            <OverviewCard
              title="Online Nodes"
              value={overviewQuery.data.totals.onlineNodes}
              description="Healthy nodes with a current heartbeat and active agent runtime."
              icon={ServerCog}
              tone="emerald"
              delay={0.04}
            />
            <OverviewCard
              title="Running Tasks"
              value={overviewQuery.data.totals.runningTasks}
              description="Executions that are currently consuming cluster capacity."
              icon={CirclePlay}
              tone="amber"
              delay={0.08}
            />
            <OverviewCard
              title="Failed Tasks"
              value={overviewQuery.data.totals.failedTasks}
              description="Tasks requiring inspection, retry, or operator intervention."
              icon={AlertTriangle}
              tone="rose"
              delay={0.12}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <MetricsChart data={overviewQuery.data.metricSeries} />
            <RecentEventsFeed events={overviewQuery.data.recentEvents} />
          </div>

          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <CardTitle>Fleet snapshot</CardTitle>
              <CardDescription>
                The nodes contributing most of the current workload footprint.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewQuery.data.nodes.slice(0, 4).map((node) => (
                <div
                  key={node.id}
                  className="rounded-2xl border border-border/70 bg-background/40 p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{node.name}</p>
                    <span
                      className={`size-2 rounded-full ${
                        node.status === "online" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {node.region} • {node.os}
                  </p>
                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Avg CPU</span>
                      <span className="font-mono">{node.avgCpuLoad}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Agents</span>
                      <span className="font-mono">{node.agentCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Heartbeat</span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(node.lastHeartbeat), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
};
