"use client";

import { io, type Socket } from "socket.io-client";

import { apiClient } from "@/lib/api";
import type {
  EventDto,
  MetricDto,
  NodeStatus,
  RealtimeEventMeta,
  RealtimeStatus,
  TaskDto,
} from "@/lib/types";

export type RealtimeMessage =
  | {
      type: "node.status.updated";
      timestamp: string;
      meta?: RealtimeEventMeta;
      data: {
        nodeId: string;
        hostname?: string;
        status: NodeStatus;
        lastSeenAt: string | null;
      };
    }
  | {
      type: "metrics.ingested";
      timestamp: string;
      meta?: RealtimeEventMeta;
      data: MetricDto;
    }
  | {
      type: "task.created" | "task.updated";
      timestamp: string;
      meta?: RealtimeEventMeta;
      data: TaskDto;
    }
  | {
      type: "event.created";
      timestamp: string;
      meta?: RealtimeEventMeta;
      data: EventDto;
    };

type MessageListener = (message: RealtimeMessage) => void;
type StatusListener = (status: RealtimeStatus) => void;

type NodeStatusUpdatedPayload = {
  nodeId: string;
  hostname?: string;
  status: NodeStatus;
  lastSeenAt?: string | null;
  sequence?: number;
  sourceInstance?: string;
};

type RealtimeConnectError = Error & {
  data?: {
    message?: string;
  };
};

const REALTIME_NAMESPACE = "/realtime";
const API_PREFIX_PATTERN = /^\/(?:api\/)?v\d+(?:\/.*)?$/i;
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;
const HOST_LIKE_VALUE_PATTERN = /^[a-z\d.-]+(?::\d+)?(?:\/.*)?$/i;

const normalizePathname = (value: string | null | undefined) => {
  if (!value || value === "/") {
    return "/";
  }

  return `/${value.replace(/^\/+|\/+$/g, "")}`;
};

const stripKnownApiPrefix = (value: string) =>
  value.replace(API_PREFIX_PATTERN, "");

const ensureAbsoluteUrl = (value: string) => {
  if (ABSOLUTE_URL_PATTERN.test(value)) {
    return value;
  }

  if (typeof window !== "undefined" && HOST_LIKE_VALUE_PATTERN.test(value)) {
    return `${window.location.protocol}//${value.replace(/^\/+/, "")}`;
  }

  return value;
};

const toRealtimeNamespaceUrl = (value: string) => {
  const absoluteValue = ensureAbsoluteUrl(value);

  try {
    const parsedUrl = new URL(absoluteValue);
    const pathname = normalizePathname(parsedUrl.pathname);

    if (pathname === "/" || API_PREFIX_PATTERN.test(pathname)) {
      return `${parsedUrl.origin}${REALTIME_NAMESPACE}`;
    }

    if (pathname === REALTIME_NAMESPACE) {
      return `${parsedUrl.origin}${REALTIME_NAMESPACE}`;
    }

    if (
      pathname.endsWith(REALTIME_NAMESPACE) &&
      !API_PREFIX_PATTERN.test(pathname)
    ) {
      return `${parsedUrl.origin}${pathname}`;
    }

    return `${parsedUrl.origin}${REALTIME_NAMESPACE}`;
  } catch {
    const normalizedValue = absoluteValue.replace(/\/+$/, "");
    const withoutApiPrefix = stripKnownApiPrefix(normalizedValue);

    if (
      withoutApiPrefix.endsWith(REALTIME_NAMESPACE) &&
      !API_PREFIX_PATTERN.test(
        withoutApiPrefix.replace(REALTIME_NAMESPACE, "") || "/",
      )
    ) {
      return withoutApiPrefix;
    }

    return `${withoutApiPrefix}${REALTIME_NAMESPACE}`;
  }
};

const resolveRealtimeNamespaceUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const configuredSocketUrl = process.env.NEXT_PUBLIC_NODERAX_WS_URL;
  if (configuredSocketUrl) {
    return toRealtimeNamespaceUrl(configuredSocketUrl);
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_NODERAX_API_URL;
  if (configuredApiUrl) {
    try {
      return `${new URL(configuredApiUrl).origin}${REALTIME_NAMESPACE}`;
    } catch {
      return toRealtimeNamespaceUrl(configuredApiUrl);
    }
  }

  return `${window.location.origin}${REALTIME_NAMESPACE}`;
};

const asTimestamp = (value: string | null | undefined) =>
  value ?? new Date().toISOString();

class NoderaxRealtimeClient {
  private socket: Socket | null = null;
  private listeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private nodeSubscriptionCounts = new Map<string, number>();
  private status: RealtimeStatus = "idle";
  private connectPromise: Promise<void> | null = null;
  private wantsConnection = false;
  private staleTimer: ReturnType<typeof setInterval> | null = null;
  private lastSignalAt = 0;
  private didRetryAuth = false;

  private readonly staleThresholdMs = 18_000;
  private readonly staleCheckIntervalMs = 3_000;

  subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    this.wantsConnection = true;
    void this.connect();

    return () => {
      this.listeners.delete(listener);
      if (!this.shouldMaintainConnection()) {
        this.disconnect();
      }
    };
  }

  subscribeNode(nodeId: string) {
    if (!nodeId) {
      return () => {};
    }

    const currentCount = this.nodeSubscriptionCounts.get(nodeId) ?? 0;
    this.nodeSubscriptionCounts.set(nodeId, currentCount + 1);
    this.wantsConnection = true;

    if (currentCount === 0 && this.socket?.connected) {
      this.socket.emit("subscribe.node", { nodeId });
    }

    void this.connect();

    return () => {
      this.unsubscribeNode(nodeId);
    };
  }

  unsubscribeNode(nodeId: string) {
    const currentCount = this.nodeSubscriptionCounts.get(nodeId);
    if (!currentCount) {
      return;
    }

    if (currentCount === 1) {
      this.nodeSubscriptionCounts.delete(nodeId);

      if (this.socket?.connected) {
        this.socket.emit("unsubscribe.node", { nodeId });
      }
    } else {
      this.nodeSubscriptionCounts.set(nodeId, currentCount - 1);
    }

    if (!this.shouldMaintainConnection()) {
      this.disconnect();
    }
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: RealtimeStatus) {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private emit(message: RealtimeMessage) {
    this.markSignal();
    this.listeners.forEach((listener) => listener(message));
  }

  private markSignal() {
    this.lastSignalAt = Date.now();
  }

  private clearStaleTimer() {
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
  }

  private startStaleTimer() {
    this.clearStaleTimer();

    this.staleTimer = setInterval(() => {
      if (!this.socket?.connected || !this.lastSignalAt) {
        return;
      }

      const signalAge = Date.now() - this.lastSignalAt;
      if (signalAge > this.staleThresholdMs) {
        this.setStatus("degraded");
      }
    }, this.staleCheckIntervalMs);
  }

  private shouldMaintainConnection() {
    return this.listeners.size > 0 || this.nodeSubscriptionCounts.size > 0;
  }

  private async syncNodeSubscriptions() {
    if (!this.socket?.connected) {
      return;
    }

    await Promise.all(
      Array.from(this.nodeSubscriptionCounts.keys()).map(async (nodeId) => {
        await this.emitWithAck("subscribe.node", { nodeId });
      }),
    );
  }

  private readonly emitWithAck = async (
    eventName: "subscribe.node" | "unsubscribe.node",
    payload: { nodeId: string },
  ) => {
    if (!this.socket?.connected) {
      return;
    }

    try {
      await this.socket.timeout(2_500).emitWithAck(eventName, payload);
    } catch {
      this.socket.emit(eventName, payload);
    }
  };

  private readonly handleConnect = async () => {
    this.didRetryAuth = false;
    this.markSignal();
    this.setStatus("connected");
    this.startStaleTimer();
    await this.syncNodeSubscriptions();
  };

  private readonly handleConnectError = (error: RealtimeConnectError) => {
    const message =
      error.data?.message ?? error.message ?? "Realtime connection failed.";

    if (/auth|token|unauthorized/i.test(message)) {
      if (!this.didRetryAuth) {
        this.didRetryAuth = true;
        this.setStatus("reconnecting");
        void this.retryConnectionWithFreshToken();
        return;
      }

      console.warn(`[realtime] ${message}`);
      this.disconnect();
      return;
    }

    this.setStatus("disconnected");
  };

  private readonly handleDisconnect = () => {
    this.clearStaleTimer();
    this.setStatus("disconnected");
  };

  private readonly handleReconnectAttempt = () => {
    this.setStatus("reconnecting");
  };

  private readonly handleReconnectError = () => {
    this.setStatus("disconnected");
  };

  private readonly handleReconnectFailed = () => {
    this.setStatus("disconnected");
  };

  private readonly handleAnySignal = () => {
    this.markSignal();
    if (this.socket?.connected && this.status === "degraded") {
      this.setStatus("connected");
    }
  };

  private readonly handleNodeStatusUpdated = (
    payload: NodeStatusUpdatedPayload,
  ) => {
    this.emit({
      type: "node.status.updated",
      timestamp: asTimestamp(payload?.lastSeenAt),
      meta: {
        sequence: payload.sequence,
        sourceInstance: payload.sourceInstance,
      },
      data: {
        nodeId: payload.nodeId,
        hostname: payload.hostname,
        status: payload.status,
        lastSeenAt: payload.lastSeenAt ?? null,
      },
    });
  };

  private readonly handleMetricsIngested = (payload: MetricDto) => {
    this.emit({
      type: "metrics.ingested",
      timestamp: asTimestamp(payload.recordedAt),
      meta: {
        sequence: payload.sequence,
        sourceInstance: payload.sourceInstance,
      },
      data: payload,
    });
  };

  private readonly handleTaskCreated = (payload: TaskDto) => {
    const payloadWithMeta = payload as TaskDto & {
      sequence?: number;
      sourceInstance?: string;
    };

    this.emit({
      type: "task.created",
      timestamp: asTimestamp(payload.createdAt),
      meta: {
        sequence: payloadWithMeta.sequence,
        sourceInstance: payloadWithMeta.sourceInstance,
      },
      data: payload,
    });
  };

  private readonly handleTaskUpdated = (payload: TaskDto) => {
    const payloadWithMeta = payload as TaskDto & {
      sequence?: number;
      sourceInstance?: string;
    };

    this.emit({
      type: "task.updated",
      timestamp: asTimestamp(payload.updatedAt),
      meta: {
        sequence: payloadWithMeta.sequence,
        sourceInstance: payloadWithMeta.sourceInstance,
      },
      data: payload,
    });
  };

  private readonly handleEventCreated = (payload: EventDto) => {
    const payloadWithMeta = payload as EventDto & {
      sequence?: number;
      sourceInstance?: string;
    };

    this.emit({
      type: "event.created",
      timestamp: asTimestamp(payload.createdAt),
      meta: {
        sequence: payloadWithMeta.sequence,
        sourceInstance: payloadWithMeta.sourceInstance,
      },
      data: payload,
    });
  };

  private attachSocketListeners(socket: Socket) {
    socket.on("connect", this.handleConnect);
    socket.on("connect_error", this.handleConnectError);
    socket.on("disconnect", this.handleDisconnect);
    socket.io.on("reconnect_attempt", this.handleReconnectAttempt);
    socket.io.on("reconnect_error", this.handleReconnectError);
    socket.io.on("reconnect_failed", this.handleReconnectFailed);
    socket.onAny(this.handleAnySignal);
    socket.on("node.status.updated", this.handleNodeStatusUpdated);
    socket.on("metrics.ingested", this.handleMetricsIngested);
    socket.on("task.created", this.handleTaskCreated);
    socket.on("task.updated", this.handleTaskUpdated);
    socket.on("event.created", this.handleEventCreated);
  }

  private detachSocketListeners(socket: Socket) {
    socket.off("connect", this.handleConnect);
    socket.off("connect_error", this.handleConnectError);
    socket.off("disconnect", this.handleDisconnect);
    socket.io.off("reconnect_attempt", this.handleReconnectAttempt);
    socket.io.off("reconnect_error", this.handleReconnectError);
    socket.io.off("reconnect_failed", this.handleReconnectFailed);
    socket.offAny(this.handleAnySignal);
    socket.off("node.status.updated", this.handleNodeStatusUpdated);
    socket.off("metrics.ingested", this.handleMetricsIngested);
    socket.off("task.created", this.handleTaskCreated);
    socket.off("task.updated", this.handleTaskUpdated);
    socket.off("event.created", this.handleEventCreated);
  }

  private async retryConnectionWithFreshToken() {
    if (!this.socket || !this.wantsConnection) {
      return;
    }

    try {
      const response = await apiClient.getRealtimeToken();
      this.socket.auth = { token: response.token };
      this.socket.connect();
    } catch {
      this.setStatus("disconnected");
    }
  }

  async connect() {
    this.wantsConnection = true;

    if (typeof window === "undefined" || this.socket || this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.openConnection();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async openConnection() {
    const namespaceUrl = resolveRealtimeNamespaceUrl();
    if (!namespaceUrl || !this.shouldMaintainConnection()) {
      this.setStatus("disconnected");
      return;
    }

    this.setStatus("connecting");

    let token: string;

    try {
      const response = await apiClient.getRealtimeToken();
      token = response.token;
    } catch {
      this.setStatus("disconnected");
      return;
    }

    if (!this.wantsConnection || !this.shouldMaintainConnection()) {
      this.setStatus("disconnected");
      return;
    }

    const socket = io(namespaceUrl, {
      autoConnect: false,
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1_200,
      reconnectionDelayMax: 7_000,
      auth: {
        token,
      },
    });

    this.attachSocketListeners(socket);

    this.socket = socket;
    socket.connect();
  }

  disconnect() {
    this.wantsConnection = false;
    this.clearStaleTimer();
    this.lastSignalAt = 0;
    this.didRetryAuth = false;

    if (this.socket) {
      this.detachSocketListeners(this.socket);
      this.socket.disconnect();
    }

    this.socket = null;
    this.setStatus("disconnected");
  }
}

let realtimeClient: NoderaxRealtimeClient | null = null;

export const getRealtimeClient = () => {
  if (!realtimeClient) {
    realtimeClient = new NoderaxRealtimeClient();
  }

  return realtimeClient;
};
