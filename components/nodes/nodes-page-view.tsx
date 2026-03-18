"use client";

import { Boxes, Cpu, ShieldCheck, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { NodesTable } from "@/components/nodes/nodes-table";
import { useNodes } from "@/lib/hooks/use-noderax-data";

export const NodesPageView = () => {
  const nodesQuery = useNodes({ limit: 100 });
  const nodes = nodesQuery.data ?? [];

  const onlineNodes = nodes.filter((node) => node.status === "online");
  const offlineNodes = nodes.filter((node) => node.status === "offline");
  const measurableNodes = nodes.filter((node) => node.latestMetric);
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
      />
      <div className="space-y-6">
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
        <NodesTable nodes={nodes} isLoading={nodesQuery.isPending} />
      </div>
    </AppShell>
  );
};
