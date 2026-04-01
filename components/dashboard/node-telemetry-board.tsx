"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HardDrive,
  MemoryStick,
  ServerCog,
  Thermometer,
} from "lucide-react";

import { NodeActionMenu } from "@/components/nodes/node-action-menu";

import { EmptyState } from "@/components/empty-state";
import { GridPattern } from "@/components/magic/grid-pattern";
import { ShineBorder } from "@/components/magic/shine-border";
import { NodeOsIcon } from "@/components/nodes/node-os-icon";
import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimeDisplay } from "@/components/ui/time-display";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

const metricRows = [
  {
    key: "cpu",
    label: "CPU",
    toneClassName: "bg-primary",
    icon: Cpu,
    suffix: "%",
  },
  {
    key: "memory",
    label: "Memory",
    toneClassName: "bg-(--semantic-success)",
    icon: MemoryStick,
    suffix: "%",
  },
  {
    key: "disk",
    label: "Disk",
    toneClassName: "bg-(--semantic-warning)",
    icon: HardDrive,
    suffix: "%",
  },
  {
    key: "temperature",
    label: "Temp",
    toneClassName: "bg-[var(--color-chart-4)]",
    icon: Thermometer,
    suffix: "°C",
  },
] as const;

const sortNodes = (nodes: NodeSummary[]) =>
  nodes.slice().sort((left, right) => {
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

const serverLights = [
  "bg-primary",
  "bg-[var(--semantic-success)]",
  "bg-[var(--semantic-warning)]",
];

export const NodeTelemetryBoard = ({ nodes }: { nodes: NodeSummary[] }) => {
  const router = useRouter();
  const { buildWorkspaceHref } = useWorkspaceContext();
  const [pageIndex, setPageIndex] = useState(0);
  const [mobileNodeId, setMobileNodeId] = useState<string | null>(null);
  const sortedNodes = useMemo(() => sortNodes(nodes), [nodes]);
  const pages = useMemo(
    () => chunkNodes(sortedNodes, PAGE_SIZE),
    [sortedNodes],
  );
  const lastPageIndex = Math.max(pages.length - 1, 0);
  const currentPageIndex = Math.min(pageIndex, lastPageIndex);
  const currentNodes = pages[currentPageIndex] ?? [];
  const rangeStart = currentPageIndex * PAGE_SIZE + 1;
  const rangeEnd = currentPageIndex * PAGE_SIZE + currentNodes.length;
  const activeMobileNode =
    sortedNodes.find((node) => node.id === mobileNodeId) ??
    sortedNodes[0] ??
    null;

  return (
    <Card
      className="border"
      style={{
        background: "#d4d0c8",
        border: "2px solid",
        borderColor: "#ffffff #808080 #808080 #ffffff",
        boxShadow: "1px 1px 0 #404040",
        borderRadius: "0",
      }}
    >
      <CardHeader
        className="border-b border-border/80 bg-muted/20"
        style={{
          background: "linear-gradient(to right, #0a246a, #a6caf0)",
          borderBottom: "2px solid #404040",
          padding: "4px 8px",
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle style={{ color: "#ffffff", fontSize: "12px", fontWeight: "bold" }}>Node telemetry board</CardTitle>
            <CardDescription style={{ color: "#c8d8f0", fontSize: "10px" }}>
              Nodes are shown in groups of four so each telemetry snapshot stays
              separate and easy to scan.
            </CardDescription>
          </div>

          {pages.length ? (
            <>
              <div className="w-fit rounded-full border px-3 py-1.5 text-xs text-muted-foreground md:hidden">
                {sortedNodes.length} nodes
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <div className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
                  {rangeStart}-{rangeEnd} of {sortedNodes.length}
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    setPageIndex((current) => Math.max(0, current - 1))
                  }
                  disabled={currentPageIndex === 0}
                  aria-label="Previous node group"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    setPageIndex((current) =>
                      Math.min(lastPageIndex, current + 1),
                    )
                  }
                  disabled={currentPageIndex >= lastPageIndex}
                  aria-label="Next node group"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {currentNodes.length ? (
          <>
            <div className="space-y-4 md:hidden">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Select node
                </p>
                <ScrollArea className="w-full">
                  <div className="flex w-max gap-2 pb-2">
                    {sortedNodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setMobileNodeId(node.id)}
                        aria-pressed={activeMobileNode?.id === node.id}
                        className={cn(
                          "flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                          activeMobileNode?.id === node.id
                            ? "tone-brand"
                            : "surface-subtle text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            node.status === "online"
                              ? "bg-(--semantic-success)"
                              : "bg-destructive",
                          )}
                        />
                        <span className="font-medium">{node.name}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {activeMobileNode ? (
                <div
                  className="block cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('[data-slot="dropdown-menu-trigger"]') ||
                      target.closest(".action-menu-area")
                    )
                      return;
                    router.push(
                      buildWorkspaceHref(`nodes/${activeMobileNode.id}`) ??
                        "/workspaces",
                    );
                  }}
                >
                  <MagicCard
                    className="rounded-[22px]"
                    gradientSize={180}
                    gradientOpacity={0.42}
                    gradientColor="rgba(220, 38, 38, 0.08)"
                    gradientFrom="rgba(248, 113, 113, 0.42)"
                    gradientTo="rgba(69, 10, 10, 0.12)"
                  >
                    <div className="surface-subtle relative overflow-hidden rounded-[22px] border p-4">
                      <GridPattern className="opacity-18 mask-image-[linear-gradient(180deg,black,transparent_78%)]" />
                      {activeMobileNode.status === "online" ? (
                        <ShineBorder
                          className="opacity-35"
                          shineColor={["#f87171", "#dc2626", "#7f1d1d"]}
                          duration={18}
                        />
                      ) : null}

                      <div className="relative z-10 space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className={cn(
                                "flex size-11 shrink-0 items-center justify-center rounded-2xl border",
                                activeMobileNode.status === "online"
                                  ? "tone-brand"
                                  : "tone-neutral",
                              )}
                            >
                              <NodeOsIcon
                                os={activeMobileNode.os}
                                className="size-5"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold tracking-tight">
                                {activeMobileNode.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {activeMobileNode.hostname}
                              </p>
                            </div>
                          </div>
                          <div className="action-menu-area flex items-center gap-2">
                            <NodeActionMenu
                              nodeId={activeMobileNode.id}
                              nodeName={activeMobileNode.name}
                            />
                            <NodeStatusBadge status={activeMobileNode.status} />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {metricRows.map((metric) => {
                            const value =
                              activeMobileNode.latestMetric?.[metric.key] ??
                              null;
                            const MetricIcon = metric.icon;
                            return (
                              <div
                                key={metric.key}
                                className="rounded-2xl border border-border/70 bg-background/72 px-3 py-3"
                              >
                                <div className="flex items-center gap-2">
                                  <MetricIcon className="size-3.5 text-muted-foreground" />
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    {metric.label}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-semibold text-foreground">
                                  {typeof value === "number" && value !== null
                                    ? `${value}${metric.suffix}`
                                    : "N/A"}
                                </p>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/90">
                                  <div
                                    className={`h-full rounded-full transition-[width] ${metric.toneClassName}`}
                                    style={{
                                      width:
                                        metric.key === "temperature"
                                          ? value && typeof value === "number"
                                            ? `${Math.max(0, Math.min(100, value))}%`
                                            : "0%"
                                          : `${Math.max(0, Math.min(100, value ?? 0))}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border/70 bg-background/62 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Runtime
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                              >
                                <NodeOsIcon
                                  os={activeMobileNode.os}
                                  className="size-3.5"
                                />
                                {activeMobileNode.os}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="rounded-full px-2.5 py-1 text-[10px] font-medium"
                              >
                                {activeMobileNode.arch}
                              </Badge>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/70 bg-background/62 px-3 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Last seen
                            </p>
                            <TimeDisplay
                              value={activeMobileNode.lastSeenAt}
                              mode="relative"
                              emptyLabel="Never"
                              className="mt-2 block font-medium text-foreground"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/60 px-3 py-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              Node details
                            </p>
                            <p className="mt-1 text-xs font-medium text-foreground">
                              Open full telemetry and task context
                            </p>
                          </div>
                          <div className="tone-brand flex size-9 items-center justify-center rounded-2xl border">
                            <ChevronRight className="size-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </MagicCard>
                </div>
              ) : null}
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
              {currentNodes.map((node) => (
                <div
                  key={node.id}
                  className="block h-full cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('[data-slot="dropdown-menu-trigger"]') ||
                      target.closest(".action-menu-area")
                    )
                      return;
                    router.push(
                      buildWorkspaceHref(`nodes/${node.id}`) ?? "/workspaces",
                    );
                  }}
                >
                  <MagicCard
                    className="h-full rounded-[22px]"
                    gradientSize={180}
                    gradientOpacity={0.42}
                    gradientColor="rgba(220, 38, 38, 0.08)"
                    gradientFrom="rgba(248, 113, 113, 0.42)"
                    gradientTo="rgba(69, 10, 10, 0.12)"
                  >
                    <div className="surface-subtle relative flex h-full min-h-75 flex-col overflow-hidden rounded-[22px] border p-4">
                      <GridPattern className="opacity-18 mask-image-[linear-gradient(180deg,black,transparent_78%)]" />
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
                                node.status === "online"
                                  ? "tone-brand"
                                  : "tone-neutral",
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
                                      node.status === "offline" &&
                                        index > 0 &&
                                        "bg-border",
                                    )}
                                  />
                                ))}
                                <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  Node
                                </span>
                              </div>
                              <p className="truncate font-semibold tracking-tight">
                                {node.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {node.hostname}
                              </p>
                            </div>
                          </div>
                          <div className="action-menu-area flex items-center gap-2">
                            <NodeActionMenu
                              nodeId={node.id}
                              nodeName={node.name}
                            />
                            <NodeStatusBadge status={node.status} />
                          </div>
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
                              {node.latestMetric
                                ? "Latest sample"
                                : "No sample"}
                            </p>
                          </div>

                          {node.latestMetric ? (
                            <div className="mt-3 grid gap-2">
                              {metricRows.map((metric) => {
                                const value =
                                  node.latestMetric?.[metric.key] ?? null;
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
                                        {typeof value === "number" &&
                                        value !== null
                                          ? `${value}${metric.suffix}`
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/90">
                                      <div
                                        className={`h-full rounded-full transition-[width] ${metric.toneClassName}`}
                                        style={{
                                          width:
                                            metric.key === "temperature"
                                              ? value &&
                                                typeof value === "number"
                                                ? `${Math.max(0, Math.min(100, value))}%`
                                                : "0%"
                                              : `${Math.max(0, Math.min(100, value ?? 0))}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-2xl border border-dashed px-3 py-5 text-sm text-muted-foreground">
                              Waiting for the first telemetry sample from this
                              server.
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
                              {node.latestMetric
                                ? "Telemetry ready"
                                : "Telemetry pending"}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-2xl border",
                              node.status === "online"
                                ? "tone-success"
                                : "tone-neutral",
                            )}
                          >
                            <ServerCog className="size-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </MagicCard>
                </div>
              ))}
            </div>

            {pages.length > 1 ? (
              <div className="hidden flex-col gap-3 border-t border-border/80 pt-4 md:flex md:flex-row md:items-center md:justify-between">
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
