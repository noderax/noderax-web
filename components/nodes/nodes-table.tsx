"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink, MonitorCog } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SectionPanel } from "@/components/ui/section-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const NodesTable = ({
  nodes,
  isLoading,
}: {
  nodes: NodeSummary[];
  isLoading?: boolean;
}) => {
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">(
    "all",
  );
  const [selectedNode, setSelectedNode] = useState<NodeSummary | null>(null);
  const searchQuery = useAppStore((state) => state.searchQuery);

  const filteredNodes = useMemo(
    () =>
      nodes.filter((node) => {
        const matchesStatus =
          statusFilter === "all" ? true : node.status === statusFilter;
        const matchesQuery = searchQuery
          ? [node.name, node.hostname, node.os, node.arch]
              .join(" ")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true;

        return matchesStatus && matchesQuery;
      }),
    [nodes, searchQuery, statusFilter],
  );

  const filterControl = (
    <Select
      value={statusFilter}
      onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
    >
      <SelectTrigger className="min-w-40">
        <SelectValue placeholder="Filter status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="online">Online only</SelectItem>
        <SelectItem value="offline">Offline only</SelectItem>
      </SelectContent>
    </Select>
  );

  if (isLoading) {
    return (
      <SectionPanel
        eyebrow="Directory"
        title="Node inventory"
        description="Filter the fleet and open node-level detail or quick inspection."
        action={filterControl}
        contentClassName="space-y-3"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-[18px]" />
        ))}
      </SectionPanel>
    );
  }

  if (!filteredNodes.length) {
    return (
      <SectionPanel
        eyebrow="Directory"
        title="Node inventory"
        description="Filter the fleet and open node-level detail or quick inspection."
        action={filterControl}
      >
        <EmptyState
          title="No nodes match the current filters"
          description="Adjust the global search or the status filter to inspect another part of the fleet."
          icon={MonitorCog}
        />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      eyebrow="Directory"
      title="Node inventory"
      description="Filter the fleet and open node-level detail or quick inspection."
      action={filterControl}
      contentClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead>OS / Arch</TableHead>
            <TableHead>Latest CPU</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredNodes.map((node) => (
            <TableRow key={node.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{node.name}</p>
                  <p className="text-xs text-muted-foreground">{node.hostname}</p>
                </div>
              </TableCell>
              <TableCell>
                <NodeStatusBadge status={node.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <TimeDisplay value={node.lastSeenAt} mode="relative" emptyLabel="Never" />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {node.os} / {node.arch}
              </TableCell>
              <TableCell>{node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Dialog
                    open={selectedNode?.id === node.id}
                    onOpenChange={(open) => setSelectedNode(open ? node : null)}
                  >
                    <DialogTrigger
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Inspect
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                      <DialogHeader>
                        <DialogTitle>{node.name}</DialogTitle>
                        <DialogDescription>
                          A concise operational snapshot before opening the full node detail view.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Runtime
                          </p>
                          <p className="mt-2 text-sm font-medium">{node.os}</p>
                          <p className="text-sm text-muted-foreground">{node.arch}</p>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Status
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <NodeStatusBadge status={node.status} />
                            <TimeDisplay
                              value={node.lastSeenAt}
                              mode="relative"
                              emptyLabel="Never"
                              className="text-sm text-muted-foreground"
                            />
                          </div>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Hostname
                          </p>
                          <p className="mt-2 text-sm font-medium">{node.hostname}</p>
                          <p className="text-sm text-muted-foreground">
                            Created <TimeDisplay value={node.createdAt} mode="datetime" />
                          </p>
                        </div>
                        <div className="surface-subtle rounded-[16px] border p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Latest telemetry
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            CPU {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Memory {node.latestMetric ? `${node.latestMetric.memory}%` : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <Link
                          href={`/nodes/${node.id}`}
                          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                        >
                          Open node
                          <ExternalLink className="size-4" />
                        </Link>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Link
                    href={`/nodes/${node.id}`}
                    className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                  >
                    Open
                    <ExternalLink className="size-4" />
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionPanel>
  );
};
