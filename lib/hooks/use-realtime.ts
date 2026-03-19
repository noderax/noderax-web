"use client";

import { useEffect, useEffectEvent } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { mapEventRecord, mapMetricDtoToPoint } from "@/lib/noderax";
import { queryKeys } from "@/lib/hooks/use-noderax-data";
import { getRealtimeClient, type RealtimeMessage } from "@/lib/websocket";
import type { DashboardOverview, EventRecord, NodeDetail, NodeSummary, TaskDetail } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const prependUnique = <T extends { id: string }>(items: T[] | undefined, value: T) => {
  const nextItems = [value, ...(items ?? [])];
  return nextItems.filter(
    (item, index, collection) =>
      collection.findIndex((candidate) => candidate.id === item.id) === index,
  );
};

const updateDashboardNodes = (
  current: DashboardOverview | undefined,
  updater: (node: NodeSummary) => NodeSummary,
) => {
  if (!current) {
    return current;
  }

  const nextNodes = current.nodes.map(updater);

  return {
    ...current,
    nodes: nextNodes,
    totals: {
      ...current.totals,
      onlineNodes: nextNodes.filter((node) => node.status === "online").length,
    },
  };
};

const collectTrackedNodeIds = (queryClient: QueryClient) => {
  const trackedNodeIds = new Set<string>();

  queryClient
    .getQueriesData<NodeSummary[]>({ queryKey: ["nodes", "list"] })
    .forEach(([, nodes]) => {
      nodes?.forEach((node) => trackedNodeIds.add(node.id));
    });

  queryClient
    .getQueriesData<NodeDetail>({ queryKey: ["nodes", "detail"] })
    .forEach(([, node]) => {
      if (node) {
        trackedNodeIds.add(node.id);
      }
    });

  queryClient
    .getQueriesData<TaskDetail>({ queryKey: ["tasks", "detail"] })
    .forEach(([, task]) => {
      if (task?.node?.id) {
        trackedNodeIds.add(task.node.id);
      }
    });

  queryClient
    .getQueriesData<DashboardOverview>({ queryKey: queryKeys.dashboard.overview })
    .forEach(([, overview]) => {
      overview?.nodes.forEach((node) => trackedNodeIds.add(node.id));
    });

  return trackedNodeIds;
};

export const useRealtimeBridge = () => {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const setRealtimeStatus = useAppStore((state) => state.setRealtimeStatus);

  const onMessage = useEffectEvent((message: RealtimeMessage) => {
    if (message.type === "node.status.updated") {
      queryClient.setQueriesData<NodeSummary[]>(
        { queryKey: ["nodes", "list"] },
        (current) =>
          current?.map((node) =>
            node.id === message.data.nodeId
              ? {
                  ...node,
                  status: message.data.status,
                  lastSeenAt: message.data.lastSeenAt,
                }
              : node,
          ),
      );

      queryClient.setQueryData<NodeDetail | undefined>(
        queryKeys.nodes.detail(message.data.nodeId),
        (current) =>
          current
            ? {
                ...current,
                status: message.data.status,
                lastSeenAt: message.data.lastSeenAt,
              }
            : current,
      );

      queryClient.setQueryData<DashboardOverview | undefined>(
        queryKeys.dashboard.overview,
        (current) =>
          updateDashboardNodes(current, (node) =>
            node.id === message.data.nodeId
              ? {
                  ...node,
                  status: message.data.status,
                  lastSeenAt: message.data.lastSeenAt,
                }
              : node,
          ),
      );

      queryClient.setQueriesData<TaskDetail | undefined>(
        { queryKey: ["tasks", "detail"] },
        (current) =>
          current?.node?.id === message.data.nodeId
            ? {
                ...current,
                node: {
                  ...current.node,
                  status: message.data.status,
                  lastSeenAt: message.data.lastSeenAt,
                },
              }
            : current,
      );
    }

    if (message.type === "metrics.ingested") {
      const point = mapMetricDtoToPoint(message.data);

      queryClient.setQueriesData<NodeSummary[]>(
        { queryKey: ["nodes", "list"] },
        (current) =>
          current?.map((node) =>
            node.id === message.data.nodeId
              ? {
                  ...node,
                  latestMetric: point,
                }
              : node,
          ),
      );

      queryClient.setQueryData<NodeDetail | undefined>(
        queryKeys.nodes.detail(message.data.nodeId),
        (current) =>
          current
            ? {
                ...current,
                latestMetric: point,
                networkStats: message.data.networkStats,
                metrics: [...current.metrics, point]
                  .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
                  .slice(-24),
              }
            : current,
      );

      queryClient.setQueryData<DashboardOverview | undefined>(
        queryKeys.dashboard.overview,
        (current) =>
          updateDashboardNodes(current, (node) =>
            node.id === message.data.nodeId
              ? {
                  ...node,
                  latestMetric: point,
                }
              : node,
          ),
      );

      queryClient.setQueriesData<TaskDetail | undefined>(
        { queryKey: ["tasks", "detail"] },
        (current) =>
          current?.node?.id === message.data.nodeId
            ? {
                ...current,
                node: {
                  ...current.node,
                  latestMetric: point,
                },
              }
            : current,
      );
    }

    if (message.type === "task.updated" || message.type === "task.created") {
      queryClient.invalidateQueries({
        queryKey: ["tasks"],
        refetchType: "active",
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.overview,
        refetchType: "active",
      });

      if (message.type === "task.updated") {
        queryClient.setQueryData<TaskDetail | undefined>(
          queryKeys.tasks.detail(message.data.id),
          (current) =>
            current
              ? {
                  ...current,
                  status: message.data.status,
                  startedAt: message.data.startedAt,
                  finishedAt: message.data.finishedAt,
                  updatedAt: message.data.updatedAt,
                  exitCode:
                    typeof message.data.result?.exitCode === "number"
                      ? message.data.result.exitCode
                      : current.exitCode,
                  lastOutput: message.data.output,
                  result: message.data.result,
                }
              : current,
        );
      }
    }

    if (message.type === "event.created") {
      const event = mapEventRecord(message.data);

      queryClient.setQueriesData<EventRecord[]>(
        { queryKey: ["events", "list"] },
        (current) => prependUnique(current, event),
      );

      queryClient.setQueryData<DashboardOverview | undefined>(
        queryKeys.dashboard.overview,
        (current) =>
          current
            ? {
                ...current,
                recentEvents: prependUnique(current.recentEvents, event).slice(0, 6),
              }
            : current,
      );

      if (event.severity === "critical") {
        toast.error(event.title, {
          description: event.message,
        });
      } else if (event.severity === "warning") {
        toast.warning(event.title, {
          description: event.message,
        });
      }
    }
  });

  useEffect(() => {
    const client = getRealtimeClient();

    if (!session) {
      client.disconnect();
      setRealtimeStatus("idle");
      return;
    }

    const unsubscribeMessages = client.subscribe((message) => onMessage(message));
    const unsubscribeStatus = client.subscribeStatus(setRealtimeStatus);

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [session, setRealtimeStatus]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }

    const client = getRealtimeClient();
    const subscribedNodeIds = new Set<string>();

    const syncNodeSubscriptions = () => {
      const nextNodeIds = collectTrackedNodeIds(queryClient);

      subscribedNodeIds.forEach((nodeId) => {
        if (!nextNodeIds.has(nodeId)) {
          client.unsubscribeNode(nodeId);
          subscribedNodeIds.delete(nodeId);
        }
      });

      nextNodeIds.forEach((nodeId) => {
        if (!subscribedNodeIds.has(nodeId)) {
          client.subscribeNode(nodeId);
          subscribedNodeIds.add(nodeId);
        }
      });
    };

    syncNodeSubscriptions();

    const unsubscribeCache = queryClient.getQueryCache().subscribe(() => {
      syncNodeSubscriptions();
    });

    return () => {
      unsubscribeCache();
      subscribedNodeIds.forEach((nodeId) => client.unsubscribeNode(nodeId));
    };
  }, [queryClient, session?.user.id]);
};

export const useNodeRealtimeSubscription = (nodeId: string | null | undefined) => {
  const sessionUserId = useAppStore((state) => state.session?.user.id);

  useEffect(() => {
    if (!sessionUserId || !nodeId) {
      return;
    }

    const client = getRealtimeClient();
    return client.subscribeNode(nodeId);
  }, [nodeId, sessionUserId]);
};
