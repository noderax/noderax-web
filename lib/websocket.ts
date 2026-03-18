"use client";

import { io, type Socket } from "socket.io-client";

import type { EventDto, MetricDto, NodeStatus, RealtimeStatus, TaskDto } from "@/lib/types";

export type RealtimeMessage =
  | {
      type: "node.status.updated";
      timestamp: string;
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
      data: MetricDto;
    }
  | {
      type: "task.created" | "task.updated";
      timestamp: string;
      data: TaskDto;
    }
  | {
      type: "event.created";
      timestamp: string;
      data: EventDto;
    };

type MessageListener = (message: RealtimeMessage) => void;
type StatusListener = (status: RealtimeStatus) => void;

const toSocketUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const configuredSocketUrl = process.env.NEXT_PUBLIC_NODERAX_WS_URL;
  if (configuredSocketUrl) {
    return configuredSocketUrl;
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_NODERAX_API_URL;
  if (configuredApiUrl) {
    try {
      return new URL(configuredApiUrl).origin;
    } catch {
      return configuredApiUrl;
    }
  }

  return window.location.origin;
};

const toNamespaceUrl = () => {
  const baseUrl = toSocketUrl();
  if (!baseUrl) {
    return "";
  }

  return baseUrl.endsWith("/realtime") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/realtime`;
};

const asTimestamp = (value: string | null | undefined) => value ?? new Date().toISOString();

class NoderaxRealtimeClient {
  private socket: Socket | null = null;
  private listeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: RealtimeStatus = "idle";
  private connectPromise: Promise<void> | null = null;

  subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    void this.connect();

    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.disconnect();
      }
    };
  }

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private emit(message: RealtimeMessage) {
    this.listeners.forEach((listener) => listener(message));
  }

  async connect() {
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
    const url = toNamespaceUrl();
    if (!url) {
      this.setStatus("disconnected");
      return;
    }

    this.setStatus("connecting");

    const tokenResponse = await fetch("/api/auth/realtime-token", {
      credentials: "include",
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      this.setStatus("disconnected");
      return;
    }

    const { token } = (await tokenResponse.json()) as { token: string };

    const socket = io(url, {
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

    socket.on("connect", () => {
      this.setStatus("connected");
    });

    socket.on("disconnect", () => {
      this.setStatus("disconnected");
    });

    socket.io.on("reconnect_attempt", () => {
      this.setStatus("reconnecting");
    });

    socket.io.on("error", () => {
      this.setStatus("disconnected");
    });

    socket.on("node.status.updated", (payload) => {
      this.emit({
        type: "node.status.updated",
        timestamp: asTimestamp(payload?.lastSeenAt),
        data: {
          nodeId: payload.nodeId,
          hostname: payload.hostname,
          status: payload.status,
          lastSeenAt: payload.lastSeenAt ?? null,
        },
      });
    });

    socket.on("metrics.ingested", (payload: MetricDto) => {
      this.emit({
        type: "metrics.ingested",
        timestamp: asTimestamp(payload.recordedAt),
        data: payload,
      });
    });

    socket.on("task.created", (payload: TaskDto) => {
      this.emit({
        type: "task.created",
        timestamp: asTimestamp(payload.createdAt),
        data: payload,
      });
    });

    socket.on("task.updated", (payload: TaskDto) => {
      this.emit({
        type: "task.updated",
        timestamp: asTimestamp(payload.updatedAt),
        data: payload,
      });
    });

    socket.on("event.created", (payload: EventDto) => {
      this.emit({
        type: "event.created",
        timestamp: asTimestamp(payload.createdAt),
        data: payload,
      });
    });

    this.socket = socket;
  }

  disconnect() {
    this.socket?.disconnect();
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
