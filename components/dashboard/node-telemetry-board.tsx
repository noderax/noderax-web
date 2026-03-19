"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  MemoryStick,
  ServerCog,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { GridPattern } from "@/components/magic/grid-pattern";
import { ShineBorder } from "@/components/magic/shine-border";
import { NodeOsIcon } from "@/components/nodes/node-os-icon";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeDisplay } from "@/components/ui/time-display";
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

const metricRows = [
  {
    key: "cpu",
    label: "CPU",
    toneClassName: "bg-primary",
    icon: Cpu,
  },
  {
    key: "memory",
    label: "Memory",
    toneClassName: "bg-[var(--semantic-success)]",
    icon: MemoryStick,
  },
  {
    key: "disk",
    label: "Disk",
    toneClassName: "bg-[var(--semantic-warning)]",
    icon: HardDrive,
  },
] as const;

const sortNodes = (nodes: NodeSummary[]) =>
  nodes
    .slice()
    .sort((left, right) => {
      if (left.status !== right.status) {
        return left.status === "online" ? -1 : 1;
      }

      if (Boolean(left.latestMetric) !== Boolean(right.latestMetric)) {
        return left.latestMetric ? -1 : 1;
      }

      return (right.lastSeenAt ?? "").localeCompare(left.lastSeenAt ?? "");
    });

const chunkNodes = (nodes: NodeSummary[], size: number) => {
  const pages: NodeSummary[][] = [];

  for (let index = 0; index < nodes.length; index += size) {
    pages.push(nodes.slice(index, index + size));
  }

  return pages;
};

const serverLights = ["bg-primary", "bg-[var(--semantic-success)]", "bg-[var(--semantic-warning)]"];

export const NodeTelemetryBoard = ({ nodes }: { nodes: NodeSummary[] }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const sortedNodes = useMemo(() => sortNodes(nodes), [nodes]);
  const pages = useMemo(() => chunkNodes(sortedNodes, PAGE_SIZE), [sortedNodes]);
  const lastPageIndex = Math.max(pages.length - 1, 0);
  const currentPageIndex = Math.min(pageIndex, lastPageIndex);
  const currentNodes = pages[currentPageIndex] ?? [];
  const rangeStart = currentPageIndex * PAGE_SIZE + 1;
  const rangeEnd = currentPageIndex * PAGE_SIZE + currentNodes.length;

  return (
    <Card className="border">
      <CardHeader className="border-b border-border/80 bg-muted/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Node telemetry board</CardTitle>
            <CardDescription>
              Nodes are shown in groups of four so each telemetry snapshot stays separate and easy to scan.
            </CardDescription>
          </div>

          {pages.length ? (
            <div className="flex items-center gap-2">
              <div className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
                {rangeStart}-{rangeEnd} of {sortedNodes.length}
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                disabled={currentPageIndex === 0}
                aria-label="Previous node group"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() =>
                  setPageIndex((current) => Math.min(lastPageIndex, current + 1))
                }
                disabled={currentPageIndex >= lastPageIndex}
                aria-label="Next node group"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {currentNodes.length ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {currentNodes.map((node) => (
                <Link
                  key={node.id}
                  href={`/nodes/${node.id}`}
                  className="block h-full"
                >
                  <MagicCard
                    className="h-full rounded-[22px]"
                    gradientSize={180}
                    gradientOpacity={0.42}
                    gradientColor="rgba(220, 38, 38, 0.08)"
                    gradientFrom="rgba(248, 113, 113, 0.42)"
                    gradientTo="rgba(69, 10, 10, 0.12)"
                  >
                    <div className="surface-subtle relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[22px] border p-4">
                      <GridPattern className="opacity-18 [mask-image:linear-gradient(180deg,black,transparent_78%)]" />
                      {node.status === "online" ? (
                        <ShineBorder
                          className="opacity-35"
                          shineColor={["#f87171", "#dc2626", "#7f1d1d"]}
                          duration={18}
                        />
                      ) : null}

                      <div className="relative z-10 flex h-full flex-col gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={cn(
                                "flex size-11 shrink-0 items-center justify-center rounded-2xl border",
                                node.status === "online" ? "tone-brand" : "tone-neutral",
                              )}
                            >
                              <NodeOsIcon os={node.os} className="size-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="mb-2 flex items-center gap-1.5">
                                {serverLights.map((light, index) => (
                                  <span
                                    key={index}
                                    className={cn(
                                      "size-1.5 rounded-full opacity-85",
                                      light,
                                      node.status === "offline" && index > 0 && "bg-border",
                                    )}
                                  />
                                ))}
                                <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Node
                                </span>
                              </div>
                              <p className="truncate font-semibold tracking-tight">{node.name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {node.hostname}
                              </p>
                            </div>
                          </div>
                          <NodeStatusBadge status={node.status} />
                        </div>

                        <div className="rounded-[20px] border border-border/70 bg-background/68 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Activity className="size-3.5 text-tone-brand" />
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                Resource snapshot
                              </p>
                            </div>
                            <p className="text-xs font-medium text-foreground">
                              {node.latestMetric ? "Latest sample" : "No sample"}
                            </p>
                          </div>

                          {node.latestMetric ? (
                            <div className="mt-3 grid gap-2">
                              {metricRows.map((metric) => {
                                const value = node.latestMetric?.[metric.key] ?? 0;
                                const MetricIcon = metric.icon;

                                return (
                                  <div
                                    key={metric.key}
                                    className="rounded-2xl border border-border/70 bg-background/72 px-3 py-2.5"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2">
                                        <MetricIcon className="size-3.5 text-muted-foreground" />
                                        <span className="text-xs font-medium text-foreground">
                                          {metric.label}
                                        </span>
                                      </div>
                                      <span className="font-mono text-xs text-muted-foreground">
                                        {value}%
                                      </span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/90">
                                      <div
                                        className={`h-full rounded-full transition-[width] ${metric.toneClassName}`}
                                        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-2xl border border-dashed px-3 py-5 text-sm text-muted-foreground">
                              Waiting for the first telemetry sample from this server.
                            </div>
                          )}
                        </div>

                        <div className="grid gap-2 text-xs sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/70 bg-background/62 px-3 py-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Runtime
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                              >
                                <NodeOsIcon os={node.os} className="size-3.5" />
                                {node.os}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                              >
                                {node.arch}
                              </Badge>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/70 bg-background/62 px-3 py-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Last seen
                            </p>
                            <TimeDisplay
                              value={node.lastSeenAt}
                              mode="relative"
                              emptyLabel="Never"
                              className="mt-2 block font-medium text-foreground"
                            />
                          </div>
                        </div>

                        <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-3 py-2.5">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Rack profile
                            </p>
                            <p className="mt-1 text-xs font-medium text-foreground">
                              {node.latestMetric ? "Telemetry ready" : "Telemetry pending"}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-2xl border",
                              node.status === "online" ? "tone-success" : "tone-neutral",
                            )}
                          >
                            <ServerCog className="size-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </MagicCard>
                </Link>
              ))}
            </div>

            {pages.length > 1 ? (
              <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {pages.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPageIndex(index)}
                      aria-label={`Show node group ${index + 1}`}
                      className={cn(
                        "h-2.5 rounded-full transition-all",
                        index === currentPageIndex
                          ? "w-7 bg-primary"
                          : "w-2.5 bg-border hover:bg-muted-foreground/50",
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  4 nodes per view with quick paging between groups.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="No nodes in the dashboard snapshot"
            description="Once nodes are available, each node will appear here in its own telemetry card."
            icon={ServerCog}
          />
        )}
      </CardContent>
    </Card>
  );
};
