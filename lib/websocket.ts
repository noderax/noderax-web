import type { EventRecord, NodeSummary, RealtimeStatus, TaskLogLine, TaskSummary } from "@/lib/types";

export type RealtimeMessage =
  | {
      type: "node.online" | "node.offline";
      timestamp: string;
      data: Partial<NodeSummary> & { id: string };
    }
  | {
      type: "task.updated";
      timestamp: string;
      data: Partial<TaskSummary> & { id: string; latestLog?: TaskLogLine };
    }
  | {
      type: "event.created";
      timestamp: string;
      data: EventRecord;
    }
  | {
      type: "task.log";
      timestamp: string;
      data: TaskLogLine & { taskId: string };
    };

type MessageListener = (message: RealtimeMessage) => void;
type StatusListener = (status: RealtimeStatus) => void;

const RETRY_DELAYS = [1200, 2200, 4000, 7000];

const toSocketUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  const configured = process.env.NEXT_PUBLIC_NODERAX_WS_URL;

  if (configured) {
    return configured;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
};

const normalizeMessage = (payload: unknown): RealtimeMessage | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    type?: string;
    event?: string;
    timestamp?: string;
    data?: unknown;
  };

  const type = candidate.type ?? candidate.event;
  const timestamp = candidate.timestamp ?? new Date().toISOString();
  const data = candidate.data ?? {};

  if (
    type === "node.online" ||
    type === "node.offline" ||
    type === "task.updated" ||
    type === "event.created" ||
    type === "task.log"
  ) {
    return {
      type,
      timestamp,
      data,
    } as RealtimeMessage;
  }

  return null;
};

class NoderaxRealtimeClient {
  private socket: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private retryIndex = 0;
  private status: RealtimeStatus = "idle";
  private listeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private shouldReconnect = true;

  subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    this.connect();

    return () => {
      this.listeners.delete(listener);
      if (!this.listeners.size) {
        this.scheduleDisconnect();
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

  private scheduleDisconnect() {
    window.clearTimeout(this.reconnectTimer ?? undefined);
    this.reconnectTimer = window.setTimeout(() => {
      if (!this.listeners.size) {
        this.disconnect(false);
      }
    }, 5000);
  }

  connect() {
    if (typeof window === "undefined" || this.socket) {
      return;
    }

    const url = toSocketUrl();

    if (!url) {
      return;
    }

    this.shouldReconnect = true;
    this.setStatus(this.retryIndex ? "reconnecting" : "connecting");
    this.socket = new window.WebSocket(url);

    this.socket.onopen = () => {
      this.retryIndex = 0;
      this.setStatus("connected");
    };

    this.socket.onmessage = (event) => {
      try {
        const message = normalizeMessage(JSON.parse(event.data));
        if (message) {
          this.listeners.forEach((listener) => listener(message));
        }
      } catch {
        // Ignore malformed messages from noisy upstream channels.
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      this.setStatus("disconnected");

      if (this.shouldReconnect && this.listeners.size) {
        const delay = RETRY_DELAYS[Math.min(this.retryIndex, RETRY_DELAYS.length - 1)];
        this.retryIndex += 1;
        window.clearTimeout(this.reconnectTimer ?? undefined);
        this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  disconnect(reconnect = false) {
    this.shouldReconnect = reconnect;
    window.clearTimeout(this.reconnectTimer ?? undefined);
    this.socket?.close();
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
