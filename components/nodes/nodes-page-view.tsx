"use client";

import { Boxes, Cpu, ShieldCheck, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { NodesTable } from "@/components/nodes/nodes-table";
import { StatStrip } from "@/components/ui/stat-strip";
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
      <div className="space-y-6">
        <StatStrip
          items={[
            {
              label: "Total nodes",
              value: nodes.length,
              description: "Infrastructure members currently tracked by the control plane.",
              icon: Boxes,
              tone: "brand",
            },
            {
              label: "Online",
              value: onlineNodes.length,
              description: "Nodes with healthy status and recent agent activity.",
              icon: ShieldCheck,
              tone: "success",
            },
            {
              label: "Offline",
              value: offlineNodes.length,
              description: "Hosts that need follow-up because reporting has stopped.",
              icon: WifiOff,
              tone: "danger",
            },
            {
              label: "Avg CPU load",
              value: `${averageLoad}%`,
              description: "Latest reported CPU usage across nodes with recent telemetry.",
              icon: Cpu,
              tone: "warning",
            },
          ]}
        />
        <NodesTable nodes={nodes} isLoading={nodesQuery.isPending} />
      </div>
    </AppShell>
  );
};
