"use client";

import { io, type Socket } from "socket.io-client";

import { apiClient } from "@/lib/api";
import type { TerminalSession, TerminalTranscriptChunk } from "@/lib/types";

const TERMINAL_NAMESPACE = "/terminal";
const API_PREFIX_PATTERN = /^\/(?:api\/)?v\d+(?:\/.*)?$/i;
const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;
const HOST_LIKE_VALUE_PATTERN = /^[a-z\d.-]+(?::\d+)?(?:\/.*)?$/i;

type TerminalConnectError = Error & {
  data?: {
    message?: string;
  };
};

type TerminalSocketStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

type StatusListener = (status: TerminalSocketStatus) => void;
type SessionListener = (session: TerminalSession) => void;
type OutputListener = (chunk: TerminalTranscriptChunk) => void;
type ErrorListener = (message: string) => void;

type TerminalSessionStatePayload = {
  sessionId: string;
  session: TerminalSession;
  sourceInstanceId?: string;
};

type TerminalOutputPayload = {
  sessionId: string;
  chunk: TerminalTranscriptChunk;
  sourceInstanceId?: string;
};

type TerminalErrorPayload = {
  sessionId?: string | null;
  message: string;
  sourceInstanceId?: string;
};

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

const toTerminalNamespaceUrl = (value: string) => {
  const absoluteValue = ensureAbsoluteUrl(value);

  try {
    const parsedUrl = new URL(absoluteValue);
    const pathname = normalizePathname(parsedUrl.pathname);

    if (pathname === "/" || API_PREFIX_PATTERN.test(pathname)) {
      return `${parsedUrl.origin}${TERMINAL_NAMESPACE}`;
    }

    if (pathname === TERMINAL_NAMESPACE) {
      return `${parsedUrl.origin}${TERMINAL_NAMESPACE}`;
    }

    if (
      pathname.endsWith(TERMINAL_NAMESPACE) &&
      !API_PREFIX_PATTERN.test(pathname)
    ) {
      return `${parsedUrl.origin}${pathname}`;
    }

    return `${parsedUrl.origin}${TERMINAL_NAMESPACE}`;
  } catch {
    const normalizedValue = absoluteValue.replace(/\/+$/, "");
    const withoutApiPrefix = stripKnownApiPrefix(normalizedValue);

    if (
      withoutApiPrefix.endsWith(TERMINAL_NAMESPACE) &&
      !API_PREFIX_PATTERN.test(
        withoutApiPrefix.replace(TERMINAL_NAMESPACE, "") || "/",
      )
    ) {
      return withoutApiPrefix;
    }

    return `${withoutApiPrefix}${TERMINAL_NAMESPACE}`;
  }
};

const resolveTerminalNamespaceUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const configuredSocketUrl = process.env.NEXT_PUBLIC_NODERAX_WS_URL;
  if (configuredSocketUrl) {
    return toTerminalNamespaceUrl(configuredSocketUrl);
  }

  const configuredApiUrl = process.env.NEXT_PUBLIC_NODERAX_API_URL;
  if (configuredApiUrl) {
    try {
      return `${new URL(configuredApiUrl).origin}${TERMINAL_NAMESPACE}`;
    } catch {
      return toTerminalNamespaceUrl(configuredApiUrl);
    }
  }

  return `${window.location.origin}${TERMINAL_NAMESPACE}`;
};

export class NoderaxTerminalClient {
  private socket: Socket | null = null;
  private connectPromise: Promise<void> | null = null;
  private sessionId: string | null = null;
  private didRetryAuth = false;
  private suppressErrorEvents = false;
  private status: TerminalSocketStatus = "idle";

  private readonly statusListeners = new Set<StatusListener>();
  private readonly sessionListeners = new Set<SessionListener>();
  private readonly outputListeners = new Set<OutputListener>();
  private readonly closedListeners = new Set<SessionListener>();
  private readonly errorListeners = new Set<ErrorListener>();

  subscribeStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeSessionState(listener: SessionListener) {
    this.sessionListeners.add(listener);
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  subscribeOutput(listener: OutputListener) {
    this.outputListeners.add(listener);
    return () => {
      this.outputListeners.delete(listener);
    };
  }

  subscribeClosed(listener: SessionListener) {
    this.closedListeners.add(listener);
    return () => {
      this.closedListeners.delete(listener);
    };
  }

  subscribeError(listener: ErrorListener) {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  async connect(sessionId: string) {
    this.sessionId = sessionId;

    if (this.socket?.connected) {
      await this.attachSession(sessionId);
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      if (this.sessionId === sessionId && this.socket?.connected) {
        await this.attachSession(sessionId);
      }
      return;
    }

    this.connectPromise = this.openConnection(sessionId);

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async sendInput(sessionId: string, payload: string) {
    await this.emitWithAck("terminal.input", {
      sessionId,
      payload,
    });
  }

  async resize(sessionId: string, cols: number, rows: number) {
    await this.emitWithAck("terminal.resize", {
      sessionId,
      cols,
      rows,
    });
  }

  async terminate(sessionId: string, reason?: string) {
    await this.emitWithAck("terminal.terminate", {
      sessionId,
      reason,
    });
  }

  disconnect() {
    this.connectPromise = null;
    this.didRetryAuth = false;
    this.sessionId = null;

    if (this.socket) {
      this.detachSocketListeners(this.socket);
      this.socket.disconnect();
      this.socket = null;
    }

    this.setStatus("disconnected");
  }

  private setStatus(status: TerminalSocketStatus) {
    if (this.status === status) {
      return;
    }

    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private emitError(message: string) {
    this.errorListeners.forEach((listener) => listener(message));
  }

  private async openConnection(sessionId: string) {
    const namespaceUrl = resolveTerminalNamespaceUrl();
    if (!namespaceUrl) {
      this.setStatus("disconnected");
      throw new Error("Terminal namespace URL is unavailable.");
    }

    this.setStatus("connecting");

    const { token } = await apiClient.getRealtimeToken();
    this.suppressErrorEvents = true;

    const socket = io(namespaceUrl, {
      autoConnect: false,
      transports: ["websocket"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 6_000,
      auth: {
        token,
      },
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const handleConnect = () => {
          cleanup();
          resolve();
        };
        const handleError = (error: TerminalConnectError) => {
          cleanup();
          reject(error);
        };
        const cleanup = () => {
          socket.off("connect", handleConnect);
          socket.off("connect_error", handleError);
        };

        socket.on("connect", handleConnect);
        socket.on("connect_error", handleError);
        socket.connect();
      });

      this.socket = socket;
      this.attachSocketListeners(socket);
      this.didRetryAuth = false;
      this.setStatus("connected");

      await this.attachSession(sessionId);
      this.suppressErrorEvents = false;
    } catch (error) {
      if (this.socket === socket) {
        this.detachSocketListeners(socket);
        this.socket = null;
      }

      socket.disconnect();
      this.suppressErrorEvents = false;
      this.setStatus("disconnected");
      throw error instanceof Error
        ? error
        : new Error("Terminal connection failed.");
    }
  }

  private async attachSession(sessionId: string) {
    const response = await this.emitWithAck("terminal.attach", {
      sessionId,
    });

    if (response && typeof response === "object" && "ok" in response && !response.ok) {
      throw new Error(
        typeof response.message === "string"
          ? response.message
          : "Unable to attach terminal session.",
      );
    }
  }

  private async emitWithAck(eventName: string, payload: Record<string, unknown>) {
    if (!this.socket?.connected) {
      throw new Error("Terminal websocket is not connected.");
    }

    return this.socket.timeout(5_000).emitWithAck(eventName, payload);
  }

  private isRecoverableEndpointError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    const connectError = error as TerminalConnectError;
    const message = `${connectError.data?.message ?? ""} ${error.message}`.toLowerCase();

    if (/auth|token|unauthorized|forbidden/.test(message)) {
      return false;
    }

    return (
      /websocket error|xhr poll error|not found|cannot get|cannot post/.test(message) ||
      /terminal session .* was not found/.test(message)
    );
  }

  private isClosedSessionAttachError(message: string) {
    return /terminal session .* was not found/i.test(message)
      || /terminal session is no longer active/i.test(message)
      || /unable to attach terminal session/i.test(message)
      || /terminal session is no longer available/i.test(message)
      || /\bno longer available\b/i.test(message)
      || /\bsession .* (closed|ended|finished)\b/i.test(message);
  }

  private readonly handleConnect = () => {
    this.didRetryAuth = false;
    this.setStatus("connected");
  };

  private readonly handleConnectError = (error: TerminalConnectError) => {
    const message =
      error.data?.message ?? error.message ?? "Terminal connection failed.";

    if (/auth|token|unauthorized/i.test(message) && !this.didRetryAuth) {
      this.didRetryAuth = true;
      this.setStatus("reconnecting");
      void this.retryConnectionWithFreshToken();
      return;
    }

    this.setStatus("disconnected");
    this.emitError(message);
  };

  private readonly handleDisconnect = () => {
    this.setStatus("disconnected");
  };

  private readonly handleReconnectAttempt = () => {
    this.setStatus("reconnecting");
  };

  private readonly handleReconnect = () => {
    this.didRetryAuth = false;
    this.setStatus("connected");

    if (!this.sessionId) {
      return;
    }

    void this.attachSession(this.sessionId).catch((error) => {
      const message =
        error instanceof Error ? error.message : "Unable to reattach terminal session.";
      if (this.isClosedSessionAttachError(message)) {
        this.disconnect();
        return;
      }

      this.emitError(message);
    });
  };

  private readonly handleReconnectError = (error: Error) => {
    this.setStatus("disconnected");
    this.emitError(error.message || "Terminal reconnect failed.");
  };

  private readonly handleReconnectFailed = () => {
    this.setStatus("disconnected");
    this.emitError("Terminal reconnect failed.");
  };

  private readonly handleSessionState = (
    payload: TerminalSessionStatePayload,
  ) => {
    if (payload.sessionId !== this.sessionId) {
      return;
    }

    this.sessionListeners.forEach((listener) => listener(payload.session));
  };

  private readonly handleOutput = (payload: TerminalOutputPayload) => {
    if (payload.sessionId !== this.sessionId) {
      return;
    }

    this.outputListeners.forEach((listener) => listener(payload.chunk));
  };

  private readonly handleClosed = (payload: TerminalSessionStatePayload) => {
    if (payload.sessionId !== this.sessionId) {
      return;
    }

    this.closedListeners.forEach((listener) => listener(payload.session));
  };

  private readonly handleTerminalError = (payload: TerminalErrorPayload) => {
    if (payload.sessionId && payload.sessionId !== this.sessionId) {
      return;
    }

    const message = payload.message || "Terminal request failed.";

    if (this.isClosedSessionAttachError(message)) {
      this.disconnect();
      return;
    }

    if (this.suppressErrorEvents) {
      return;
    }

    this.emitError(message);
  };

  private attachSocketListeners(socket: Socket) {
    socket.on("connect", this.handleConnect);
    socket.on("connect_error", this.handleConnectError);
    socket.on("disconnect", this.handleDisconnect);
    socket.io.on("reconnect_attempt", this.handleReconnectAttempt);
    socket.io.on("reconnect", this.handleReconnect);
    socket.io.on("reconnect_error", this.handleReconnectError);
    socket.io.on("reconnect_failed", this.handleReconnectFailed);
    socket.on("terminal.session.state", this.handleSessionState);
    socket.on("terminal.output", this.handleOutput);
    socket.on("terminal.closed", this.handleClosed);
    socket.on("terminal.error", this.handleTerminalError);
  }

  private detachSocketListeners(socket: Socket) {
    socket.off("connect", this.handleConnect);
    socket.off("connect_error", this.handleConnectError);
    socket.off("disconnect", this.handleDisconnect);
    socket.io.off("reconnect_attempt", this.handleReconnectAttempt);
    socket.io.off("reconnect", this.handleReconnect);
    socket.io.off("reconnect_error", this.handleReconnectError);
    socket.io.off("reconnect_failed", this.handleReconnectFailed);
    socket.off("terminal.session.state", this.handleSessionState);
    socket.off("terminal.output", this.handleOutput);
    socket.off("terminal.closed", this.handleClosed);
    socket.off("terminal.error", this.handleTerminalError);
  }

  private async retryConnectionWithFreshToken() {
    if (!this.socket) {
      return;
    }

    try {
      const response = await apiClient.getRealtimeToken();
      this.socket.auth = { token: response.token };
      this.socket.connect();
    } catch (error) {
      this.setStatus("disconnected");
      this.emitError(
        error instanceof Error
          ? error.message
          : "Unable to refresh terminal authentication.",
      );
    }
  }
}
