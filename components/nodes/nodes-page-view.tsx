"use client";

import { Boxes, Cpu, ShieldCheck, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { NodesTable } from "@/components/nodes/nodes-table";
import { StatStrip } from "@/components/ui/stat-strip";
import { useNodes } from "@/lib/hooks/use-noderax-data";

export const NodesPageView = () => {
  const nodesQuery = useNodes({ limit: 100 });
  const nodes = nodesQuery.data ?? [];

  const onlineNodes = nodes.filter((node) => node.status === "online");
  const offlineNodes = nodes.filter((node) => node.status === "offline");
  const measurableNodes = nodes.filter((node) => node.latestMetric);
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
  const latestNode = nodes[0];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Fleet"
        title="Node management"
        description="Monitor node connectivity, filter the fleet, and inspect runtime details from a compact operational directory."
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
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Latest node
            </p>
            <p className="text-sm font-medium">{latestNode?.name ?? "No nodes yet"}</p>
            <p className="text-xs text-muted-foreground">
              {latestNode?.hostname ?? "Waiting for registered fleet members."}
            </p>
          </div>
        }
      />

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
              tone: "emerald",
            },
            {
              label: "Offline",
              value: offlineNodes.length,
              description: "Hosts that need follow-up because reporting has stopped.",
              icon: WifiOff,
              tone: "rose",
            },
            {
              label: "Avg CPU load",
              value: `${averageLoad}%`,
              description: "Latest reported CPU usage across nodes with recent telemetry.",
              icon: Cpu,
              tone: "amber",
            },
          ]}
        />
        <NodesTable nodes={nodes} isLoading={nodesQuery.isPending} />
      </div>
    </AppShell>
  );
};
