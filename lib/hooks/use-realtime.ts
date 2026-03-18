"use client";

import { useEffect, useEffectEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getRealtimeClient, type RealtimeMessage } from "@/lib/websocket";
import type { EventRecord, NodeDetail, NodeSummary, TaskDetail, TaskLogLine, TaskSummary } from "@/lib/types";
import { queryKeys } from "@/lib/hooks/use-noderax-data";
import { useAppStore } from "@/store/useAppStore";

const updateNodeStatus = (
  nodes: NodeSummary[] | undefined,
  message: Extract<RealtimeMessage, { type: "node.online" | "node.offline" }>,
) =>
  nodes?.map((node) =>
    node.id === message.data.id
      ? {
          ...node,
          ...message.data,
          status: message.type === "node.online" ? ("online" as const) : ("offline" as const),
          lastHeartbeat: message.timestamp,
        }
      : node,
  );

const updateTask = (
  tasks: TaskSummary[] | undefined,
  message: Extract<RealtimeMessage, { type: "task.updated" }>,
) =>
  tasks?.map((task) =>
    task.id === message.data.id
      ? {
          ...task,
          ...message.data,
        }
      : task,
  );

const prependEvent = (events: EventRecord[] | undefined, event: EventRecord) => {
  const nextEvents = [event, ...(events ?? [])];
  return nextEvents.filter(
    (candidate, index, collection) =>
      collection.findIndex((item) => item.id === candidate.id) === index,
  );
};

export const useRealtimeBridge = () => {
  const queryClient = useQueryClient();
  const setRealtimeStatus = useAppStore((state) => state.setRealtimeStatus);

  const onMessage = useEffectEvent((message: RealtimeMessage) => {
    if (message.type === "node.online" || message.type === "node.offline") {
      queryClient.setQueryData<NodeSummary[] | undefined>(
        queryKeys.nodes.all,
        (current) => updateNodeStatus(current, message),
      );

      queryClient.setQueryData<NodeDetail | undefined>(
        queryKeys.nodes.detail(message.data.id),
        (current) =>
          current
            ? {
                ...current,
                ...message.data,
                status: message.type === "node.online" ? ("online" as const) : ("offline" as const),
                lastHeartbeat: message.timestamp,
              }
            : current,
      );
    }

    if (message.type === "task.updated") {
      queryClient.setQueryData<TaskSummary[] | undefined>(
        queryKeys.tasks.all,
        (current) => updateTask(current, message),
      );

      queryClient.setQueryData<TaskDetail | undefined>(
        queryKeys.tasks.detail(message.data.id),
        (current) =>
          current
            ? {
                ...current,
                ...message.data,
                logs:
                  message.data.latestLog && !current.logs.some((line) => line.id === message.data.latestLog?.id)
                    ? [...current.logs, message.data.latestLog]
                    : current.logs,
              }
            : current,
      );
    }

    if (message.type === "event.created") {
      queryClient.setQueriesData<EventRecord[]>(
        { queryKey: ["events"] },
        (current) => prependEvent(current, message.data),
      );

      if (message.data.severity === "critical") {
        toast.error(message.data.title, {
          description: message.data.message,
        });
      } else if (message.data.severity === "warning") {
        toast.warning(message.data.title, {
          description: message.data.message,
        });
      }
    }

    void queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.overview,
      refetchType: "active",
    });
  });

  useEffect(() => {
    const client = getRealtimeClient();
    const unsubscribeMessages = client.subscribe((message) => onMessage(message));
    const unsubscribeStatus = client.subscribeStatus(setRealtimeStatus);

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [setRealtimeStatus]);
};

export const useTaskLogSubscription = (
  taskId: string,
  onLog: (log: TaskLogLine) => void,
) => {
  const handleMessage = useEffectEvent((message: RealtimeMessage) => {
    if (message.type === "task.log" && message.data.taskId === taskId) {
      onLog({
        id: message.data.id,
        timestamp: message.data.timestamp,
        stream: message.data.stream,
        message: message.data.message,
      });
    }

    if (
      message.type === "task.updated" &&
      message.data.id === taskId &&
      message.data.latestLog
    ) {
      onLog(message.data.latestLog);
    }
  });

  useEffect(() => {
    const client = getRealtimeClient();
    return client.subscribe((message) => handleMessage(message));
  }, [taskId]);
};
