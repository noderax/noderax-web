"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
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
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const formatLastSeen = (value: string | null) =>
  value
    ? formatDistanceToNowStrict(new Date(value), {
        addSuffix: true,
      })
    : "Never";

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

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-dashboard">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!filteredNodes.length) {
    return (
      <EmptyState
        title="No nodes match the current filters"
        description="Adjust the global search or the status filter to inspect another part of the fleet."
        icon={MonitorCog}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
        >
          <SelectTrigger className="min-w-40 rounded-full bg-card/80">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online only</SelectItem>
            <SelectItem value="offline">Offline only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-dashboard">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>OS / Arch</TableHead>
              <TableHead>Latest CPU</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNodes.map((node) => (
              <TableRow key={node.id}>
                <TableCell className="pl-4">
                  <div>
                    <p className="font-medium">{node.name}</p>
                    <p className="text-xs text-muted-foreground">{node.hostname}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <NodeStatusBadge status={node.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatLastSeen(node.lastSeenAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {node.os} / {node.arch}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {node.latestMetric ? `${node.latestMetric.cpu}%` : "N/A"}
                </TableCell>
                <TableCell className="pr-4 text-right">
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
                      <DialogContent className="max-w-lg rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>{node.name}</DialogTitle>
                          <DialogDescription>
                            Quick operational snapshot before opening the full node detail surface.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Runtime
                            </p>
                            <p className="mt-2 text-sm font-medium">{node.os}</p>
                            <p className="text-sm text-muted-foreground">{node.arch}</p>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Activity
                            </p>
                            <p className="mt-2 text-sm font-medium">{formatLastSeen(node.lastSeenAt)}</p>
                            <NodeStatusBadge status={node.status} />
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              Hostname
                            </p>
                            <p className="mt-2 text-sm font-medium">{node.hostname}</p>
                            <p className="text-sm text-muted-foreground">
                              Created {new Date(node.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
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
      </div>
    </>
  );
};
