"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { mapEventRecord, mapMetricDtoToPoint } from "@/lib/noderax";
import { queryKeys } from "@/lib/hooks/use-noderax-data";
import { getRealtimeClient, type RealtimeMessage } from "@/lib/websocket";
import type {
  DashboardOverview,
  EventRecord,
  NodeDetail,
  NodeSummary,
  TaskDetail,
} from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const METRIC_FLUSH_MS = 300;
const METRIC_WINDOW_LIMIT = 120;
const METRIC_WINDOW_TTL_MS = 20 * 60 * 1000;

const prependUnique = <T extends { id: string }>(
  items: T[] | undefined,
  value: T,
) => {
  const seen = new Set<string>();

  return [value, ...(items ?? [])].filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};

const trimMetricWindow = (
  points: NodeDetail["metrics"],
  nowMs: number,
): NodeDetail["metrics"] => {
  const minTimestampMs = nowMs - METRIC_WINDOW_TTL_MS;
  const filtered = points.filter((point) => {
    const pointMs = new Date(point.timestamp).getTime();
    return Number.isFinite(pointMs) && pointMs >= minTimestampMs;
  });

  if (filtered.length <= METRIC_WINDOW_LIMIT) {
    return filtered;
  }

  return filtered.slice(-METRIC_WINDOW_LIMIT);
};

const upsertMetricPoint = (
  current: NodeDetail["metrics"],
  point: NodeDetail["metrics"][number],
  nowMs: number,
) => {
  if (!current.length) {
    return [point];
  }

  const lastPoint = current[current.length - 1];
  if (lastPoint && lastPoint.timestamp <= point.timestamp) {
    return trimMetricWindow([...current, point], nowMs);
  }

  const next = current.slice();
  const existingIndex = next.findIndex(
    (item) => item.timestamp === point.timestamp,
  );

  if (existingIndex >= 0) {
    next[existingIndex] = point;
    return trimMetricWindow(next, nowMs);
  }

  const insertIndex = next.findIndex(
    (item) => item.timestamp > point.timestamp,
  );
  if (insertIndex < 0) {
    next.push(point);
  } else {
    next.splice(insertIndex, 0, point);
  }

  return trimMetricWindow(next, nowMs);
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
    .getQueriesData<DashboardOverview>({
      queryKey: queryKeys.dashboard.overview,
    })
    .forEach(([, overview]) => {
      overview?.nodes.forEach((node) => trackedNodeIds.add(node.id));
    });

  return trackedNodeIds;
};

export const useRealtimeBridge = () => {
  const queryClient = useQueryClient();
  const session = useAppStore((state) => state.session);
  const setRealtimeStatus = useAppStore((state) => state.setRealtimeStatus);
  const patchRealtimeHealth = useAppStore((state) => state.patchRealtimeHealth);
  const bumpRealtimeCounter = useAppStore((state) => state.bumpRealtimeCounter);
  const setRealtimeCounter = useAppStore((state) => state.setRealtimeCounter);

  const sequenceByKeyRef = useRef(new Map<string, number>());
  const timestampByKeyRef = useRef(new Map<string, string>());
  const nodeStatusByIdRef = useRef(new Map<string, NodeSummary["status"]>());
  const seenEventIdsRef = useRef(new Set<string>());
  const metricQueueRef = useRef(
    new Map<
      string,
      {
        point: NodeDetail["metrics"][number];
        networkStats: Record<string, unknown>;
      }
    >(),
  );
  const metricQueueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const previousStatusRef =
    useRef<ReturnType<typeof useAppStore.getState>["realtimeStatus"]>("idle");

  const shouldAcceptMessage = useEffectEvent(
    (streamKey: string, message: RealtimeMessage) => {
      const sequence = message.meta?.sequence;
      const previousSequence = sequenceByKeyRef.current.get(streamKey);

      if (typeof sequence === "number") {
        if (
          typeof previousSequence === "number" &&
          sequence < previousSequence
        ) {
          bumpRealtimeCounter("droppedStaleEvents");
          return false;
        }

        if (
          typeof previousSequence === "number" &&
          sequence === previousSequence
        ) {
          bumpRealtimeCounter("droppedDuplicateEvents");
          return false;
        }

        sequenceByKeyRef.current.set(streamKey, sequence);
        timestampByKeyRef.current.set(streamKey, message.timestamp);
        return true;
      }

      const previousTimestamp = timestampByKeyRef.current.get(streamKey);
      if (previousTimestamp && message.timestamp < previousTimestamp) {
        bumpRealtimeCounter("droppedStaleEvents");
        return false;
      }

      timestampByKeyRef.current.set(streamKey, message.timestamp);
      return true;
    },
  );

  const flushMetricQueue = useEffectEvent(() => {
    const startedAt = performance.now();
    const snapshot = Array.from(metricQueueRef.current.entries());

    metricQueueRef.current.clear();
    setRealtimeCounter("metricQueueDepth", 0);

    snapshot.forEach(([nodeId, queued]) => {
      queryClient.setQueriesData<NodeSummary[]>(
        { queryKey: ["nodes", "list"] },
        (current) =>
          current?.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  latestMetric: queued.point,
                }
              : node,
          ),
      );

      queryClient.setQueryData<NodeDetail | undefined>(
        queryKeys.nodes.detail(nodeId),
        (current) =>
          current
            ? {
                ...current,
                latestMetric: queued.point,
                networkStats: queued.networkStats,
                metrics: upsertMetricPoint(
                  current.metrics,
                  queued.point,
                  Date.now(),
                ),
              }
            : current,
      );

      queryClient.setQueryData<DashboardOverview | undefined>(
        queryKeys.dashboard.overview,
        (current) =>
          updateDashboardNodes(current, (node) =>
            node.id === nodeId
              ? {
                  ...node,
                  latestMetric: queued.point,
                }
              : node,
          ),
      );

      queryClient.setQueriesData<TaskDetail | undefined>(
        { queryKey: ["tasks", "detail"] },
        (current) =>
          current?.node?.id === nodeId
            ? {
                ...current,
                node: {
                  ...current.node,
                  latestMetric: queued.point,
                },
              }
            : current,
      );
    });

    performance.measure("realtime:store-to-render", {
      start: startedAt,
      end: performance.now(),
    });
    bumpRealtimeCounter("metricFlushCount");
  });

  const enqueueMetric = useEffectEvent(
    (
      nodeId: string,
      point: NodeDetail["metrics"][number],
      networkStats: Record<string, unknown>,
    ) => {
      metricQueueRef.current.set(nodeId, { point, networkStats });

      const queueDepth = metricQueueRef.current.size;
      setRealtimeCounter("metricQueueDepth", queueDepth);

      const currentHighWater =
        useAppStore.getState().realtimeCounters.metricQueueHighWaterMark;
      if (queueDepth > currentHighWater) {
        setRealtimeCounter("metricQueueHighWaterMark", queueDepth);
      }

      if (metricQueueTimerRef.current) {
        return;
      }

      metricQueueTimerRef.current = setTimeout(() => {
        metricQueueTimerRef.current = null;
        flushMetricQueue();
      }, METRIC_FLUSH_MS);
    },
  );

  const onMessage = useEffectEvent((message: RealtimeMessage) => {
    const receivedAt = Date.now();
    patchRealtimeHealth({
      lastEventAt: new Date(receivedAt).toISOString(),
      eventAgeMs: 0,
      degradedReason: null,
    });

    performance.mark("realtime:socket-receive");

    if (message.type === "node.status.updated") {
      if (!shouldAcceptMessage(`node.status:${message.data.nodeId}`, message)) {
        return;
      }

      const nodeId = message.data.nodeId;
      let previousStatus = nodeStatusByIdRef.current.get(nodeId);
      let nodeLabel = message.data.hostname ?? "Node";

      if (!previousStatus) {
        const detail = queryClient.getQueryData<NodeDetail | undefined>(
          queryKeys.nodes.detail(nodeId),
        );

        if (detail) {
          previousStatus = detail.status;
          nodeLabel = detail.name || detail.hostname || nodeLabel;
        }
      }

      if (!previousStatus) {
        queryClient
          .getQueriesData<NodeSummary[]>({ queryKey: ["nodes", "list"] })
          .forEach(([, nodes]) => {
            const matched = nodes?.find((node) => node.id === nodeId);
            if (matched) {
              previousStatus = matched.status;
              nodeLabel = matched.name || matched.hostname || nodeLabel;
            }
          });
      }

      queryClient.setQueriesData<NodeSummary[]>(
        { queryKey: ["nodes", "list"] },
        (current) =>
          current?.map((node) =>
            node.id === nodeId
              ? {
                  ...node,
                  status: message.data.status,
                  lastSeenAt: message.data.lastSeenAt,
                }
              : node,
          ),
      );

      queryClient.setQueryData<NodeDetail | undefined>(
        queryKeys.nodes.detail(nodeId),
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
            node.id === nodeId
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
          current?.node?.id === nodeId
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

      if (message.data.status === "online" && previousStatus !== "online") {
        toast.success("Node online", {
          description: `${nodeLabel} is now connected and reporting telemetry.`,
        });
      }

      if (message.data.status === "offline" && previousStatus !== "offline") {
        toast.warning("Node offline", {
          description: `${nodeLabel} is no longer reporting telemetry.`,
        });
      }

      nodeStatusByIdRef.current.set(nodeId, message.data.status);

      return;
    }

    if (message.type === "metrics.ingested") {
      if (!shouldAcceptMessage(`node.metric:${message.data.nodeId}`, message)) {
        return;
      }

      const point = mapMetricDtoToPoint(message.data);
      enqueueMetric(message.data.nodeId, point, message.data.networkStats);
      return;
    }

    if (message.type === "task.updated" || message.type === "task.created") {
      if (!shouldAcceptMessage(`task:${message.data.id}`, message)) {
        return;
      }

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

      return;
    }

    if (message.type === "event.created") {
      if (seenEventIdsRef.current.has(message.data.id)) {
        bumpRealtimeCounter("droppedDuplicateEvents");
        return;
      }

      if (!shouldAcceptMessage(`event:${message.data.id}`, message)) {
        return;
      }

      seenEventIdsRef.current.add(message.data.id);
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
                recentEvents: prependUnique(current.recentEvents, event).slice(
                  0,
                  6,
                ),
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

      return;
    }

    performance.mark("realtime:store-updated");
    performance.measure(
      "realtime:socket-to-store",
      "realtime:socket-receive",
      "realtime:store-updated",
    );
  });

  useEffect(() => {
    const client = getRealtimeClient();
    const metricQueue = metricQueueRef.current;

    if (!session) {
      client.disconnect();
      setRealtimeStatus("idle");
      return;
    }

    const unsubscribeMessages = client.subscribe((message) =>
      onMessage(message),
    );
    const unsubscribeStatus = client.subscribeStatus((status) => {
      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = status;

      setRealtimeStatus(status);

      if (status === "reconnecting") {
        bumpRealtimeCounter("reconnectAttempts");
      }

      if (status === "connected" && previousStatus === "reconnecting") {
        bumpRealtimeCounter("reconnectSuccesses");
      }

      patchRealtimeHealth({
        status,
        degradedReason:
          status === "degraded"
            ? "No realtime frames received recently."
            : null,
      });
    });

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();

      if (metricQueueTimerRef.current) {
        clearTimeout(metricQueueTimerRef.current);
        metricQueueTimerRef.current = null;
      }

      if (metricQueue.size > 0) {
        bumpRealtimeCounter("metricDroppedFrames", metricQueue.size);
        metricQueue.clear();
        setRealtimeCounter("metricQueueDepth", 0);
      }
    };
  }, [
    bumpRealtimeCounter,
    patchRealtimeHealth,
    session,
    setRealtimeCounter,
    setRealtimeStatus,
  ]);

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

export const useNodeRealtimeSubscription = (
  nodeId: string | null | undefined,
) => {
  const sessionUserId = useAppStore((state) => state.session?.user.id);

  useEffect(() => {
    if (!sessionUserId || !nodeId) {
      return;
    }

    const client = getRealtimeClient();
    return client.subscribeNode(nodeId);
  }, [nodeId, sessionUserId]);
};
