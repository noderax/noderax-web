"use client";

import { AlertTriangle, Boxes, CirclePlay, ServerCog } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { MetricsChart } from "@/components/dashboard/metrics-chart";
import { RecentEventsFeed } from "@/components/dashboard/recent-events-feed";
import { SectionPanel } from "@/components/ui/section-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeDisplay } from "@/components/ui/time-display";
import { useDashboardOverview } from "@/lib/hooks/use-noderax-data";

export const DashboardView = () => {
  const overviewQuery = useDashboardOverview();
  const latestEvent = overviewQuery.data?.recentEvents[0];
  const criticalEvents =
    overviewQuery.data?.recentEvents.filter((event) => event.severity === "critical")
      .length ?? 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Infrastructure overview"
        description="A live operational surface for node health, task throughput, and incident visibility across the Noderax control plane."
        meta={
          overviewQuery.data ? (
            <>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Nodes</span>{" "}
                <span className="font-semibold">{overviewQuery.data.totals.totalNodes}</span>
              </div>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Online</span>{" "}
                <span className="font-semibold">{overviewQuery.data.totals.onlineNodes}</span>
              </div>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Running tasks</span>{" "}
                <span className="font-semibold">{overviewQuery.data.totals.runningTasks}</span>
              </div>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Critical signals</span>{" "}
                <span className="font-semibold">{criticalEvents}</span>
              </div>
            </>
          ) : null
        }
        actions={
          <>
            <div className="min-w-[12rem] flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Live posture
              </p>
              <p className="mt-1 text-sm font-medium">Realtime telemetry is active</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Query reconciliation and websocket mutation keep the deck current.
              </p>
            </div>
            <div className="meta-chip min-w-[11rem] rounded-2xl border px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Latest event
              </p>
              <p className="mt-1 text-sm font-medium">
                {latestEvent?.title ?? "No events yet"}
              </p>
              <TimeDisplay
                value={latestEvent?.createdAt}
                mode="relative"
                emptyLabel="Waiting"
                className="mt-1 block text-xs text-muted-foreground"
              />
            </div>
          </>
        }
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
      ) : overviewQuery.isError ? (
        <EmptyState
          title="Dashboard data is unavailable"
          description="The control plane could not load the current dashboard snapshot. Check the authenticated API connection and try again."
          icon={AlertTriangle}
          actionLabel="Retry"
          onAction={() => overviewQuery.refetch()}
        />
      ) : overviewQuery.data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard
              title="Total Nodes"
              value={overviewQuery.data.totals.totalNodes}
              description="Registered nodes currently known by the control plane."
              icon={Boxes}
              tone="brand"
              delay={0}
            />
            <OverviewCard
              title="Online Nodes"
              value={overviewQuery.data.totals.onlineNodes}
              description="Hosts reporting in with a current last-seen timestamp."
              icon={ServerCog}
              tone="emerald"
              delay={0.04}
            />
            <OverviewCard
              title="Running Tasks"
              value={overviewQuery.data.totals.runningTasks}
              description="Executions that are actively consuming cluster capacity."
              icon={CirclePlay}
              tone="amber"
              delay={0.08}
            />
            <OverviewCard
              title="Failed Tasks"
              value={overviewQuery.data.totals.failedTasks}
              description="Recent failures that still need operator review."
              icon={AlertTriangle}
              tone="rose"
              delay={0.12}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            <MetricsChart data={overviewQuery.data.metricSeries} />
            <RecentEventsFeed events={overviewQuery.data.recentEvents} />
          </div>

          <SectionPanel
            eyebrow="Fleet Scan"
            title="Fleet snapshot"
            description="A quick read on the nodes contributing the most recent telemetry and workload."
            contentClassName="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4"
          >
              {overviewQuery.data.nodes.slice(0, 4).map((node) => (
                <div
                  key={node.id}
                  className="surface-subtle surface-hover rounded-[24px] border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{node.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{node.hostname}</p>
                    </div>
                    <span
                      className={`size-2 rounded-full ${
                        node.status === "online" ? "bg-emerald-400" : "bg-rose-400"
                      }`}
                    />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {node.os} • {node.arch}
                  </p>
                  <div className="mt-5 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">CPU</span>
                      <span className="font-mono">
                        {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Memory</span>
                      <span className="font-mono">
                        {node.latestMetric ? `${node.latestMetric.memory}%` : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last seen</span>
                      <TimeDisplay
                        value={node.lastSeenAt}
                        mode="relative"
                        emptyLabel="Never"
                        className="text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>
              ))}
          </SectionPanel>
        </div>
      ) : null}
    </AppShell>
  );
};
