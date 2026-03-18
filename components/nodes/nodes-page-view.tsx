"use client";

import { Boxes, Cpu, ShieldCheck, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { NodesTable } from "@/components/nodes/nodes-table";
import { useNodesQuery } from "@/lib/hooks/use-noderax-data";

export const NodesPageView = () => {
  const nodesQuery = useNodesQuery();
  const nodes = nodesQuery.data ?? [];

  const onlineNodes = nodes.filter((node) => node.status === "online");
  const offlineNodes = nodes.filter((node) => node.status === "offline");
  const averageLoad =
    nodes.length > 0
      ? Math.round(nodes.reduce((total, node) => total + node.avgCpuLoad, 0) / nodes.length)
      : 0;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Fleet"
        title="Node management"
        description="Monitor heartbeat status, inspect host metadata, and drill into metrics and event history."
      />
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            title="Total nodes"
            value={nodes.length}
            description="Total number of registered servers currently known by the control plane."
            icon={Boxes}
            tone="blue"
          />
          <OverviewCard
            title="Online"
            value={onlineNodes.length}
            description="Nodes with current heartbeats and healthy runtime connectivity."
            icon={ShieldCheck}
            tone="emerald"
            delay={0.04}
          />
          <OverviewCard
            title="Offline"
            value={offlineNodes.length}
            description="Hosts that missed their heartbeat and require operator attention."
            icon={WifiOff}
            tone="rose"
            delay={0.08}
          />
          <OverviewCard
            title="Avg CPU load"
            value={`${averageLoad}%`}
            description="A coarse utilization signal for balancing future task placement."
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
