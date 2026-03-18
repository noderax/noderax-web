"use client";

import Link from "next/link";
import { ArrowUpRight, Boxes, Cpu, ShieldCheck, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { NodesTable } from "@/components/nodes/nodes-table";
import { buttonVariants } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import { TimeDisplay } from "@/components/ui/time-display";
import { useNodes } from "@/lib/hooks/use-noderax-data";
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export const NodesPageView = () => {
  const nodesQuery = useNodes({ limit: 100 });
  const nodes = nodesQuery.data ?? [];

  const onlineNodes = nodes.filter((node) => node.status === "online");
  const offlineNodes = nodes.filter((node) => node.status === "offline");
  const measurableNodes = nodes.filter((node) => node.latestMetric);
  const featuredNode = onlineNodes[0] ?? nodes[0] ?? null;
  const busiestNode = measurableNodes.reduce<NodeSummary | null>(
    (current, node) => {
      if (!current) {
        return node;
      }

      return (node.latestMetric?.cpu ?? 0) > (current.latestMetric?.cpu ?? 0)
        ? node
        : current;
    },
    null,
  );
  const onlineCoverage = nodes.length ? Math.round((onlineNodes.length / nodes.length) * 100) : 0;
  const averageLoad =
    measurableNodes.length > 0
      ? Math.round(
          measurableNodes.reduce(
            (total, node) => total + (node.latestMetric?.cpu ?? 0),
            0,
          ) / measurableNodes.length,
        )
      : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Fleet"
        title="Node management"
        description="Monitor node connectivity, inspect host metadata, and drill into metrics and node-scoped event history."
        meta={
          <>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Coverage</span>{" "}
              <span className="font-semibold">{onlineCoverage}% online</span>
            </div>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Average CPU</span>{" "}
              <span className="font-semibold">{averageLoad}%</span>
            </div>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Offline</span>{" "}
              <span className="font-semibold">{offlineNodes.length}</span>
            </div>
          </>
        }
        actions={
          featuredNode ? (
            <>
              <div className="min-w-[12rem] flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Fleet spotlight
                </p>
                <p className="mt-1 text-sm font-medium">{featuredNode.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {featuredNode.hostname} • {featuredNode.os} / {featuredNode.arch}
                </p>
              </div>
              <Link
                href={`/nodes/${featuredNode.id}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Open node
                <ArrowUpRight className="size-4" />
              </Link>
            </>
          ) : null
        }
      />
      <div className="space-y-6">
        {featuredNode ? (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionPanel
              variant="feature"
              eyebrow="Node Spotlight"
              title={featuredNode.name}
              description={`${featuredNode.hostname} • ${featuredNode.os} / ${featuredNode.arch}`}
              action={
                <Link
                  href={`/nodes/${featuredNode.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Open node
                  <ArrowUpRight className="size-4" />
                </Link>
              }
              contentClassName="p-6"
            >
              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="surface-subtle rounded-[26px] border p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground/95">
                        Live node summary
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Last seen{" "}
                        <TimeDisplay
                          value={featuredNode.lastSeenAt}
                          mode="relative"
                          emptyLabel="Never"
                        />
                      </p>
                    </div>
                    <NodeStatusBadge status={featuredNode.status} />
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="surface-subtle rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        CPU
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {featuredNode.latestMetric ? `${featuredNode.latestMetric.cpu}%` : "N/A"}
                      </p>
                    </div>
                    <div className="surface-subtle rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Memory
                      </p>
                      <p className="mt-2 text-2xl font-semibold">
                        {featuredNode.latestMetric
                          ? `${featuredNode.latestMetric.memory}%`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="surface-subtle rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Created
                      </p>
                      <TimeDisplay
                        value={featuredNode.createdAt}
                        mode="date"
                        className="mt-2 block text-lg font-semibold"
                      />
                    </div>
                    <div className="surface-subtle rounded-2xl border p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Runtime
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {featuredNode.os}
                      </p>
                      <p className="text-sm text-muted-foreground">{featuredNode.arch}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="surface-subtle rounded-[24px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Fleet coverage
                    </p>
                    <p className="mt-2 text-3xl font-semibold">{onlineCoverage}%</p>
                    <p className="text-sm text-muted-foreground">
                      of the visible fleet is online right now.
                    </p>
                  </div>
                  <div className="surface-subtle rounded-[24px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Hottest node
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {busiestNode?.name ?? "No telemetry yet"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {busiestNode?.latestMetric
                        ? `CPU ${busiestNode.latestMetric.cpu}%`
                        : "Waiting for metric samples."}
                    </p>
                  </div>
                  <div className="surface-subtle rounded-[24px] border p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Follow-up lane
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      {offlineNodes.length ? `${offlineNodes.length} nodes pending` : "All clear"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {offlineNodes.length
                        ? "Offline members still need operator review."
                        : "No offline nodes in the current view."}
                    </p>
                  </div>
                </div>
              </div>
            </SectionPanel>

            <div className="grid gap-4 sm:grid-cols-2">
              <OverviewCard
                title="Total nodes"
                value={nodes.length}
                description="Registered infrastructure members currently tracked by Noderax."
                icon={Boxes}
                tone="brand"
              />
              <OverviewCard
                title="Online"
                value={onlineNodes.length}
                description="Nodes with a healthy status and recent agent activity."
                icon={ShieldCheck}
                tone="emerald"
                delay={0.04}
              />
              <OverviewCard
                title="Offline"
                value={offlineNodes.length}
                description="Hosts that require follow-up because they stopped reporting in."
                icon={WifiOff}
                tone="rose"
                delay={0.08}
              />
              <OverviewCard
                title="Avg CPU load"
                value={`${averageLoad}%`}
                description="Latest reported CPU usage across nodes with recent metrics."
                icon={Cpu}
                tone="amber"
                delay={0.12}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <OverviewCard
              title="Total nodes"
              value={nodes.length}
              description="Registered infrastructure members currently tracked by Noderax."
              icon={Boxes}
              tone="brand"
            />
            <OverviewCard
              title="Online"
              value={onlineNodes.length}
              description="Nodes with a healthy status and recent agent activity."
              icon={ShieldCheck}
              tone="emerald"
              delay={0.04}
            />
            <OverviewCard
              title="Offline"
              value={offlineNodes.length}
              description="Hosts that require follow-up because they stopped reporting in."
              icon={WifiOff}
              tone="rose"
              delay={0.08}
            />
            <OverviewCard
              title="Avg CPU load"
              value={`${averageLoad}%`}
              description="Latest reported CPU usage across nodes with recent metrics."
              icon={Cpu}
              tone="amber"
              delay={0.12}
            />
          </div>
        )}
        <NodesTable nodes={nodes} isLoading={nodesQuery.isPending} />
      </div>
    </AppShell>
  );
};
