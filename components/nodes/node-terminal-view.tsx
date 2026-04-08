"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FitAddon } from "@xterm/addon-fit";
import {
  ArchiveX,
  Clock3,
  History,
  LoaderCircle,
  PlugZap,
  Shield,
  ShieldAlert,
  SquareTerminal,
  XCircle,
} from "lucide-react";
import { Terminal } from "xterm";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { NodeOsIcon } from "@/components/nodes/node-os-icon";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SectionPanel } from "@/components/ui/section-panel";
import { TimeDisplay } from "@/components/ui/time-display";
import {
  useCreateTerminalSession,
  useNode,
  useNodeTerminalSessions,
  queryKeys,
  useTerminalSession,
  useTerminateTerminalSession,
  useTerminalSessionChunks,
} from "@/lib/hooks/use-noderax-data";
import { apiClient } from "@/lib/api";
import { NoderaxTerminalClient } from "@/lib/terminal-websocket";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type {
  TerminalSession,
  TerminalSessionStatus,
  TerminalTranscriptChunk,
} from "@/lib/types";
import { profileAllowsSurface } from "@/lib/root-access";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Switch } from "@/components/ui/switch";

const DEFAULT_COLS = 120;
const DEFAULT_ROWS = 34;
const HISTORY_PAGE_SIZE = 200;
const TERMINAL_DETACH_GRACE_SECONDS = 300;

const LIVE_SESSION_STATUSES = new Set<TerminalSessionStatus>([
  "pending",
  "open",
  "terminating",
]);

const formatSessionTitle = (session: TerminalSession) =>
  `${session.createdByEmailSnapshot ?? "Unknown operator"} · ${session.id.slice(0, 8)}`;

const isLiveSession = (status: TerminalSessionStatus) =>
  LIVE_SESSION_STATUSES.has(status);

const areTerminalSessionsEquivalent = (
  left: TerminalSession,
  right: TerminalSession,
) =>
  left.id === right.id &&
  left.status === right.status &&
  left.updatedAt === right.updatedAt &&
  left.closedReason === right.closedReason &&
  left.exitCode === right.exitCode &&
  left.cols === right.cols &&
  left.rows === right.rows &&
  left.openedAt === right.openedAt &&
  left.closedAt === right.closedAt;

const sortSessionsByCreatedAtDesc = (sessions: TerminalSession[]) =>
  sessions
    .slice()
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

const decodeBase64Bytes = (value: string) => {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const decodeTranscriptText = (value: string) => {
  try {
    return new TextDecoder().decode(decodeBase64Bytes(value));
  } catch {
    return "[Unable to decode transcript payload]";
  }
};

const encodeInputPayload = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return globalThis.btoa(binary);
};

const statusTone = (status: TerminalSessionStatus) => {
  switch (status) {
    case "open":
      return "default";
    case "pending":
    case "terminating":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

const directionTone = (direction: TerminalTranscriptChunk["direction"]) => {
  switch (direction) {
    case "stdin":
      return "secondary";
    case "stderr":
      return "destructive";
    case "system":
      return "default";
    default:
      return "outline";
  }
};

const formatGraceWindowLabel = (seconds: number) => {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  return `${seconds} second${seconds === 1 ? "" : "s"}`;
};

const isExpectedTerminalClosureMessage = (message: string) =>
  /terminal session .* was not found/i.test(message) ||
  /terminal session is no longer active/i.test(message) ||
  /unable to attach terminal session/i.test(message) ||
  /terminal session is no longer available/i.test(message) ||
  /\bno longer available\b/i.test(message) ||
  /\bsession .* (closed|ended|finished)\b/i.test(message);

export const NodeTerminalView = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const { workspace, workspaceId, buildWorkspaceHref, isWorkspaceAdmin } =
    useWorkspaceContext();
  const currentUserId = useAppStore((state) => state.session?.user.id ?? null);

  const nodeQuery = useNode(id);
  const sessionsQuery = useNodeTerminalSessions(id, { limit: 20, offset: 0 });
  const createTerminalSession = useCreateTerminalSession();
  const terminateTerminalSession = useTerminateTerminalSession();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [terminalStatus, setTerminalStatus] = useState<
    "idle" | "connecting" | "connected" | "reconnecting" | "disconnected"
  >("idle");
  const [sessionOverrides, setSessionOverrides] = useState<
    Record<string, TerminalSession>
  >({});
  const [transcriptTerminalMode, setTranscriptTerminalMode] = useState(false);
  const [startAsRoot, setStartAsRoot] = useState(false);

  const terminalElementRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalClientRef = useRef<NoderaxTerminalClient | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const attachBannerSessionIdRef = useRef<string | null>(null);
  const renderedChunkSeqRef = useRef(0);
  const hydratingConsoleRef = useRef(false);
  const pendingLiveChunksRef = useRef<TerminalTranscriptChunk[]>([]);

  const sessions = useMemo(
    () => {
      const sessionMap = new Map<string, TerminalSession>();

      (sessionsQuery.data ?? []).forEach((session) => {
        sessionMap.set(session.id, sessionOverrides[session.id] ?? session);
      });

      Object.values(sessionOverrides).forEach((session) => {
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, session);
        }
      });

      return Array.from(sessionMap.values()).sort((left, right) => {
        const rightCreatedAt = new Date(right.createdAt).getTime();
        const leftCreatedAt = new Date(left.createdAt).getTime();
        return rightCreatedAt - leftCreatedAt;
      });
    },
    [sessionOverrides, sessionsQuery.data],
  );

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId(null);
      return;
    }

    const selectedExists = selectedSessionId
      ? sessions.some((session) => session.id === selectedSessionId)
      : false;

    if (selectedExists) {
      return;
    }

    const preferredLiveSession = sessions.find(
      (session) =>
        isLiveSession(session.status) && session.createdByUserId === currentUserId,
    );
    setSelectedSessionId(preferredLiveSession?.id ?? sessions[0]?.id ?? null);
  }, [currentUserId, selectedSessionId, sessions]);

  useEffect(() => {
    setHistoryPage(0);
  }, [selectedSessionId]);

  const selectedSession = selectedSessionId
    ? sessionOverrides[selectedSessionId] ??
      sessions.find((session) => session.id === selectedSessionId) ??
      null
    : null;
  const selectedSessionKey = selectedSession?.id ?? null;
  const selectedSessionNodeId = selectedSession?.nodeId ?? null;
  const selectedSessionStatus = selectedSession?.status ?? null;
  const selectedSessionDetailQuery = useTerminalSession(selectedSessionKey ?? "", {
    enabled: Boolean(selectedSession && isLiveSession(selectedSession.status)),
    refetchIntervalMs: selectedSession
      ? selectedSession.status === "terminating"
        ? 3_000
        : 10_000
      : false,
  });

  const canControlSelectedLiveSession = Boolean(
    selectedSession &&
      isLiveSession(selectedSession.status) &&
      selectedSession.createdByUserId === currentUserId &&
      isWorkspaceAdmin &&
      !workspace?.isArchived,
  );

  const canReadSelectedTranscript = Boolean(
    selectedSession &&
      (!isLiveSession(selectedSession.status) ||
        selectedSession.createdByUserId === currentUserId),
  );
  const detachGraceLabel = formatGraceWindowLabel(
    TERMINAL_DETACH_GRACE_SECONDS,
  );
  const terminateRequested = selectedSession?.status === "terminating";
  const liveSessionNotice = selectedSession
    ? selectedSession.status === "pending"
      ? "Starting the remote shell. The first prompt can take a few seconds."
      : selectedSession.status === "terminating"
        ? terminalStatus === "disconnected" || terminalStatus === "idle"
          ? "The remote shell disconnected. Noderax is finalizing the session and persisting the last transcript chunks."
          : "Termination requested. Waiting for the remote shell to exit and persist the final transcript."
        : canControlSelectedLiveSession
          ? `Interactive session is live. If you leave without terminating, it stays available for ${detachGraceLabel} so you can reattach.`
          : null
    : null;

  const transcriptQuery = useTerminalSessionChunks(
    selectedSession?.id ?? "",
    {
      limit: HISTORY_PAGE_SIZE,
      offset: historyPage * HISTORY_PAGE_SIZE,
      refetchIntervalMs:
        selectedSession && isLiveSession(selectedSession.status)
          ? selectedSession.status === "terminating"
            ? 3_000
            : 5_000
          : false,
    },
    canReadSelectedTranscript,
  );

  const syncTerminalSessionCaches = useEffectEvent(
    (
      session: TerminalSession,
      options?: { refreshChunks?: boolean; updateDetailCache?: boolean },
    ) => {
      setSessionOverrides((current) => {
        const existing = current[session.id];
        if (existing && areTerminalSessionsEquivalent(existing, session)) {
          return current;
        }

        return {
          ...current,
          [session.id]: session,
        };
      });

      if (options?.updateDetailCache ?? true) {
        const currentDetail = queryClient.getQueryData<TerminalSession>(
          queryKeys.nodes.terminalSession(session.workspaceId, session.id),
        );

        if (!currentDetail || !areTerminalSessionsEquivalent(currentDetail, session)) {
          queryClient.setQueryData(
            queryKeys.nodes.terminalSession(session.workspaceId, session.id),
            session,
          );
        }
      }

      queryClient.setQueriesData<TerminalSession[]>(
        {
          queryKey: ["nodes", session.workspaceId, session.nodeId, "terminal-sessions"],
        },
        (current) => {
          if (!current) {
            return current;
          }

          const existingIndex = current.findIndex((item) => item.id === session.id);
          if (existingIndex >= 0) {
            const existing = current[existingIndex];
            if (areTerminalSessionsEquivalent(existing, session)) {
              return current;
            }

            const nextSessions = current.slice();
            nextSessions[existingIndex] = session;
            return sortSessionsByCreatedAtDesc(nextSessions);
          }

          return sortSessionsByCreatedAtDesc([session, ...current]);
        },
      );

      if (options?.refreshChunks) {
        void queryClient.invalidateQueries({
          queryKey: ["nodes", session.workspaceId, "terminal-session", session.id, "chunks"],
          refetchType: "active",
        });
      }
    },
  );

  const refreshSelectedTerminalState = useCallback(async () => {
    if (!workspaceId || !selectedSessionKey) {
      return;
    }

    await Promise.allSettled([
      selectedSessionNodeId
        ? queryClient.invalidateQueries({
            queryKey: ["nodes", workspaceId, selectedSessionNodeId, "terminal-sessions"],
            refetchType: "active",
          })
        : Promise.resolve(),
      queryClient.invalidateQueries({
        queryKey: queryKeys.nodes.terminalSession(workspaceId, selectedSessionKey),
        refetchType: "active",
      }),
      queryClient.invalidateQueries({
        queryKey: ["nodes", workspaceId, "terminal-session", selectedSessionKey, "chunks"],
        refetchType: "active",
      }),
    ]);
  }, [queryClient, selectedSessionKey, selectedSessionNodeId, workspaceId]);

  const finalizeTerminalConnection = useCallback((message?: string) => {
    if (terminalRef.current) {
      terminalRef.current.writeln("");
      terminalRef.current.writeln(
        `[session finalizing] ${message ?? "Remote shell disconnected. Waiting for the final transcript sync."}`,
      );
    }

    activeSessionIdRef.current = null;
    terminalClientRef.current?.disconnect();
    terminalClientRef.current = null;
    void refreshSelectedTerminalState();
  }, [refreshSelectedTerminalState]);

  const handleTerminalConnectionIssue = useEffectEvent((message: string) => {
    if (terminateRequested && isExpectedTerminalClosureMessage(message)) {
      finalizeTerminalConnection(message);
      return;
    }

    toast.error("Terminal connection issue", {
      description: message,
    });
  });

  const handleTerminalConnectFailure = useEffectEvent((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "The terminal session could not be attached.";

    if (terminateRequested && isExpectedTerminalClosureMessage(message)) {
      finalizeTerminalConnection(message);
      return;
    }

    toast.error("Unable to connect terminal", {
      description: message,
    });
  });

  useEffect(() => {
    const session = selectedSessionDetailQuery.data;
    if (!session) {
      return;
    }

    syncTerminalSessionCaches(session, { updateDetailCache: false });

    if (!isLiveSession(session.status)) {
      void queryClient.invalidateQueries({
        queryKey: ["nodes", session.workspaceId, "terminal-session", session.id, "chunks"],
        refetchType: "active",
      });
    }
  }, [queryClient, selectedSessionDetailQuery.data]);

  useEffect(() => {
    if (!terminateRequested) {
      return;
    }

    if (terminalStatus !== "disconnected" && terminalStatus !== "idle") {
      return;
    }

    void refreshSelectedTerminalState();
  }, [refreshSelectedTerminalState, terminalStatus, terminateRequested]);

  const renderTerminalChunk = useEffectEvent(
    (chunk: TerminalTranscriptChunk, options?: { allowStdin?: boolean }) => {
      if (!terminalRef.current) {
        return;
      }

      if (chunk.seq <= renderedChunkSeqRef.current) {
        return;
      }

      renderedChunkSeqRef.current = chunk.seq;

      if (chunk.direction === "stdin" && !options?.allowStdin) {
        return;
      }

      terminalRef.current.write(decodeBase64Bytes(chunk.payload));
    },
  );

  const hydrateLiveConsole = useEffectEvent(async (sessionId: string) => {
    if (!workspaceId || !terminalRef.current) {
      hydratingConsoleRef.current = false;
      pendingLiveChunksRef.current = [];
      return;
    }

    try {
      const chunks = await apiClient.getTerminalSessionChunks(sessionId, workspaceId, {
        limit: HISTORY_PAGE_SIZE,
        offset: 0,
      });

      chunks
        .slice()
        .sort((left, right) => left.seq - right.seq)
        .forEach((chunk) => {
          renderTerminalChunk(chunk);
        });
    } catch {
      // Best-effort hydration; live websocket output continues even if this fetch fails.
    } finally {
      hydratingConsoleRef.current = false;
      pendingLiveChunksRef.current
        .slice()
        .sort((left, right) => left.seq - right.seq)
        .forEach((chunk) => {
          renderTerminalChunk(chunk);
        });
      pendingLiveChunksRef.current = [];
    }
  });

  const transcriptTerminalText = useMemo(() => {
    const chunks = transcriptQuery.data ?? [];
    return chunks
      .filter((chunk) => chunk.direction !== "stdin")
      .map((chunk) => decodeTranscriptText(chunk.payload))
      .join("");
  }, [transcriptQuery.data]);

  const ensureTerminal = useEffectEvent(() => {
    const container = terminalElementRef.current;
    if (!container || terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "var(--font-mono-ui), monospace",
      fontSize: 13,
      lineHeight: 1.25,
      theme: {
        background: "#111316",
        foreground: "#f2eee7",
        cursor: "#f97316",
        selectionBackground: "rgba(249, 115, 22, 0.24)",
        black: "#111316",
        red: "#ef4444",
        green: "#34d399",
        yellow: "#f59e0b",
        blue: "#60a5fa",
        magenta: "#fb7185",
        cyan: "#22d3ee",
        white: "#f2eee7",
        brightBlack: "#5b6571",
        brightRed: "#f87171",
        brightGreen: "#6ee7b7",
        brightYellow: "#fbbf24",
        brightBlue: "#93c5fd",
        brightMagenta: "#fda4af",
        brightCyan: "#67e8f9",
        brightWhite: "#fff7ed",
      },
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.onData((data) => {
      const sessionId = activeSessionIdRef.current;
      const client = terminalClientRef.current;
      if (!sessionId || !client) {
        return;
      }

      void client.sendInput(sessionId, encodeInputPayload(data)).catch((error) => {
        toast.error("Unable to send terminal input", {
          description:
            error instanceof Error
              ? error.message
              : "Terminal input could not be forwarded.",
        });
      });
    });
  });

  const fitTerminal = useEffectEvent(() => {
    if (!terminalRef.current || !fitAddonRef.current) {
      return;
    }

    fitAddonRef.current.fit();
    const dimensions = terminalRef.current.cols && terminalRef.current.rows
      ? {
          cols: terminalRef.current.cols,
          rows: terminalRef.current.rows,
        }
      : {
          cols: DEFAULT_COLS,
          rows: DEFAULT_ROWS,
        };

    const sessionId = activeSessionIdRef.current;
    const client = terminalClientRef.current;

    if (
      !sessionId ||
      !client ||
      selectedSessionStatus !== "open" ||
      sessionId !== selectedSessionKey
    ) {
      return;
    }

    void client.resize(sessionId, dimensions.cols, dimensions.rows).catch(() => {
      // Resize failures are non-fatal and are surfaced by the server error event.
    });
  });

  useEffect(() => {
    ensureTerminal();

    if (!terminalElementRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      fitTerminal();
    });

    observer.observe(terminalElementRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canControlSelectedLiveSession || selectedSessionStatus !== "open") {
      return;
    }

    fitTerminal();
  }, [
    canControlSelectedLiveSession,
    selectedSessionKey,
    selectedSessionStatus,
  ]);

  useEffect(() => {
    const activeSession = selectedSession;

    if (!canControlSelectedLiveSession || !selectedSessionKey || !activeSession) {
      attachBannerSessionIdRef.current = null;
      activeSessionIdRef.current = null;
      renderedChunkSeqRef.current = 0;
      hydratingConsoleRef.current = false;
      pendingLiveChunksRef.current = [];
      setTerminalStatus("idle");
      terminalClientRef.current?.disconnect();
      terminalClientRef.current = null;
      return;
    }

    ensureTerminal();

    const terminal = terminalRef.current;
    if (terminal && attachBannerSessionIdRef.current !== selectedSessionKey) {
      terminal.reset();
      terminal.writeln(
        `Connecting to ${selectedSessionNodeId?.slice(0, 8) ?? "unknown"} terminal session ${selectedSessionKey?.slice(0, 8) ?? "unknown"}...`,
      );
      attachBannerSessionIdRef.current = selectedSessionKey;
      renderedChunkSeqRef.current = 0;
      hydratingConsoleRef.current = true;
      pendingLiveChunksRef.current = [];
    }

    activeSessionIdRef.current = selectedSessionKey;

    const client = new NoderaxTerminalClient();
    terminalClientRef.current = client;
    let disposed = false;

    const unsubscribeStatus = client.subscribeStatus(setTerminalStatus);
    const unsubscribeSession = client.subscribeSessionState((session) => {
      syncTerminalSessionCaches(session);
    });
    const unsubscribeOutput = client.subscribeOutput((chunk) => {
      if (!terminalRef.current) {
        return;
      }

      if (chunk.sessionId !== activeSessionIdRef.current) {
        return;
      }

      if (hydratingConsoleRef.current) {
        pendingLiveChunksRef.current.push(chunk);
        return;
      }

      renderTerminalChunk(chunk);
    });
    const unsubscribeClosed = client.subscribeClosed((session) => {
      syncTerminalSessionCaches(session, { refreshChunks: true });

      if (terminalRef.current) {
        terminalRef.current.writeln("");
        terminalRef.current.writeln(
          `[session closed] ${session.closedReason ?? "Terminal session finished."}`,
        );
      }

      client.disconnect();
    });
    const unsubscribeError = client.subscribeError((message) => {
      handleTerminalConnectionIssue(message);
    });

    const scopedWorkspaceId = activeSession.workspaceId;

    void client
      .connect(selectedSessionKey, scopedWorkspaceId)
      .then(async () => {
        if (disposed) {
          return;
        }
        await hydrateLiveConsole(selectedSessionKey);
        fitTerminal();
      })
      .catch((error) => {
        handleTerminalConnectFailure(error);
      });

    return () => {
      unsubscribeStatus();
      unsubscribeSession();
      unsubscribeOutput();
      unsubscribeClosed();
      unsubscribeError();
      disposed = true;
      client.disconnect();

      if (terminalClientRef.current === client) {
        terminalClientRef.current = null;
      }
    };
  }, [
    canControlSelectedLiveSession,
    selectedSessionKey,
    selectedSessionNodeId,
    selectedSession,
  ]);

  useEffect(() => {
    return () => {
      terminalClientRef.current?.disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      renderedChunkSeqRef.current = 0;
      hydratingConsoleRef.current = false;
      pendingLiveChunksRef.current = [];
    };
  }, []);

  const node = nodeQuery.data;
  const canUseRootTerminalProfile = Boolean(
    node && profileAllowsSurface(node.rootAccessAppliedProfile, "terminal"),
  );
  const canStartTerminal =
    Boolean(node) &&
    isWorkspaceAdmin &&
    !workspace?.isArchived &&
    node?.status === "online";
  const rootTerminalDisabledReason = !node
    ? "Node details are still loading."
    : !isWorkspaceAdmin
      ? "Only workspace administrators can start terminal sessions."
      : workspace?.isArchived
        ? "Archived workspaces cannot start new terminal sessions."
        : node.status !== "online"
          ? "The node must be online before any terminal session can start."
          : "This node needs Terminal root or All root applied before a root shell can start.";

  useEffect(() => {
    if (!canUseRootTerminalProfile && startAsRoot) {
      setStartAsRoot(false);
    }
  }, [canUseRootTerminalProfile, startAsRoot]);

  const handleCreateSession = async () => {
    if (!node) {
      return;
    }

    try {
      const session = await createTerminalSession.mutateAsync({
        nodeId: node.id,
        payload: {
          cols: terminalRef.current?.cols || DEFAULT_COLS,
          rows: terminalRef.current?.rows || DEFAULT_ROWS,
          runAsRoot: startAsRoot,
        },
      });

      setSessionOverrides((current) => ({
        ...current,
        [session.id]: session,
      }));
      setSelectedSessionId(session.id);
    } catch {
      // Mutation toasts already surface the backend reason.
    }
  };

  const handleTerminateSession = async () => {
    if (!selectedSession || !node) {
      return;
    }

    try {
      const session = await terminateTerminalSession.mutateAsync({
        sessionId: selectedSession.id,
        nodeId: node.id,
        payload: {
          reason: "Operator requested termination from the terminal console.",
        },
      });

      setSessionOverrides((current) => ({
        ...current,
        [session.id]: session,
      }));
      finalizeTerminalConnection(
        "Termination accepted. Waiting for the remote shell to exit and persist the final transcript.",
      );
    } catch {
      // Mutation toasts already surface the backend reason.
    }
  };

  if (nodeQuery.isError || (!nodeQuery.isPending && !node)) {
    return (
      <AppShell>
        <EmptyState
          title="Node not found"
          description="The requested node could not be loaded for terminal access."
          icon={XCircle}
        />
      </AppShell>
    );
  }

  if (!node) {
    return (
      <AppShell>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-[22px] bg-muted" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="surface-subtle flex size-12 shrink-0 items-center justify-center rounded-2xl border">
              <NodeOsIcon os={node.os} className="size-6" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Interactive terminal
              </h1>
              <p className="text-sm text-muted-foreground">
                {node.name} · {node.hostname} · {node.os} / {node.arch}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{node.status}</Badge>
                <Badge variant="outline">
                  {workspace?.name ?? "Workspace"} / {workspace?.currentUserRole ?? "viewer"}
                </Badge>
                <Badge variant={canUseRootTerminalProfile ? "default" : "outline"}>
                  {canUseRootTerminalProfile
                    ? "Root terminal available"
                    : "User terminal only"}
                </Badge>
                {node.maintenanceMode ? (
                  <Badge variant="secondary">Maintenance mode</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={buildWorkspaceHref(`nodes/${node.id}`) ?? "/workspaces"}
              className={buttonVariants({ variant: "outline" })}
            >
              Back to node
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-xs text-muted-foreground">
              <Switch
                checked={startAsRoot}
                onCheckedChange={setStartAsRoot}
                disabled={!canUseRootTerminalProfile}
              />
              <span>{startAsRoot ? "Start as root" : "Start as noderax"}</span>
            </div>
            <Button
              onClick={() => void handleCreateSession()}
              disabled={!canStartTerminal || createTerminalSession.isPending}
            >
              {createTerminalSession.isPending
                ? "Starting..."
                : startAsRoot
                  ? "Start root terminal"
                  : "Start terminal"}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleTerminateSession()}
              disabled={
                !canControlSelectedLiveSession ||
                terminateTerminalSession.isPending ||
                terminateRequested
              }
            >
              {terminateTerminalSession.isPending
                ? "Requesting stop..."
                : terminateRequested
                  ? "Termination requested"
                  : "Terminate"}
            </Button>
          </div>
        </div>

        {workspace?.isArchived ? (
          <EmptyState
            title="Workspace is archived"
            description="New interactive terminal sessions are disabled while this workspace is archived. Existing transcript history remains visible."
            icon={ArchiveX}
          />
        ) : null}

        {!isWorkspaceAdmin ? (
          <EmptyState
            title="Admin access required"
            description="Interactive terminal access is limited to platform admins who are workspace owners or admins."
            icon={ShieldAlert}
          />
        ) : null}

        {node.status !== "online" ? (
          <EmptyState
            title="Node is offline"
            description="The node must be online and connected to the agent realtime route before a terminal can start."
            icon={PlugZap}
          />
        ) : null}

        {!canUseRootTerminalProfile ? (
          <div className="surface-subtle flex items-start gap-3 rounded-[20px] border px-4 py-3 text-sm text-muted-foreground">
            <div className="tone-warning flex size-10 shrink-0 items-center justify-center rounded-2xl border">
              <Shield className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Root shell is disabled</p>
              <p>{rootTerminalDisabledReason}</p>
            </div>
          </div>
        ) : (
          <div className="surface-subtle flex items-start gap-3 rounded-[20px] border px-4 py-3 text-sm text-muted-foreground">
            <div className="tone-brand flex size-10 shrink-0 items-center justify-center rounded-2xl border">
              <Shield className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Root shell is available</p>
              <p>
                Enable the toggle above when you want the new session to start as
                root. Leaving it off starts the shell as the regular noderax
                user.
              </p>
            </div>
          </div>
        )}

        <SectionPanel
          eyebrow="Live session"
          title="Terminal console"
          description="xterm.js console tunneled through the Noderax agent. Only the session creator can control a live terminal."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                Socket: {terminalStatus}
              </Badge>
              {selectedSession ? (
                <Badge variant={statusTone(selectedSession.status)}>
                  Session: {selectedSession.status}
                </Badge>
              ) : null}
              {selectedSession?.runAsRoot ? (
                <Badge variant="default">Privilege: root</Badge>
              ) : null}
              {selectedSession && canControlSelectedLiveSession ? (
                <Badge variant="outline">
                  Reattach window: {detachGraceLabel}
                </Badge>
              ) : null}
            </div>
          }
          contentClassName="space-y-4"
        >
          {selectedSession && canControlSelectedLiveSession ? (
            <>
              {liveSessionNotice ? (
                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm",
                    terminateRequested
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                      : "surface-subtle text-muted-foreground",
                  )}
                >
                  <div className="flex items-start gap-3">
                    {terminateRequested ? (
                      <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" />
                    ) : (
                      <Clock3 className="mt-0.5 size-4 shrink-0" />
                    )}
                    <p>{liveSessionNotice}</p>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="surface-subtle rounded-2xl border px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Session owner
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedSession.createdByEmailSnapshot ?? "Unknown operator"}
                  </p>
                </div>
                <div className="surface-subtle rounded-2xl border px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Opened
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    <TimeDisplay
                      value={selectedSession.openedAt ?? selectedSession.createdAt}
                      mode="relative"
                    />
                  </p>
                </div>
                <div className="surface-subtle rounded-2xl border px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Size
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {selectedSession.cols} × {selectedSession.rows}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-border/80 bg-[#111316] shadow-[0_20px_60px_-34px_rgba(15,23,42,0.8)]">
                <div className="flex items-center justify-between border-b border-white/8 bg-white/3 px-4 py-2 text-xs text-[#ddd3c3]">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    <span>Session {selectedSession.id.slice(0, 8)}</span>
                  </div>
                  <span className="font-mono text-[#b8aa95]">
                    {node.hostname}
                  </span>
                </div>
                <div
                  ref={terminalElementRef}
                  className="h-[24rem] w-full px-2 py-3 md:h-[30rem]"
                />
              </div>
            </>
          ) : selectedSession && isLiveSession(selectedSession.status) ? (
            <EmptyState
              title="Live session is not attachable here"
              description="Only the operator who created this live session can attach and send input. Closed sessions remain available in the transcript timeline."
              icon={SquareTerminal}
              variant="plain"
            />
          ) : (
            <EmptyState
              title="No active terminal selected"
              description="Start a new session to open an interactive shell, or choose a completed session below to inspect its transcript."
              icon={SquareTerminal}
              variant="plain"
            />
          )}
        </SectionPanel>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <SectionPanel
            eyebrow="Recent sessions"
            title="Session history"
            description="Open sessions, recent failures, and recently closed transcripts for this node."
            contentClassName="p-0"
          >
            {sessionsQuery.isPending ? (
              <div className="space-y-3 px-5 py-4 sm:px-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : sessions.length ? (
              <ScrollArea className="h-[32rem]">
                <div className="space-y-3 px-5 py-4 sm:px-6">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                      className={cn(
                        "surface-subtle surface-hover flex w-full flex-col gap-3 rounded-2xl border px-4 py-3 text-left",
                        selectedSessionId === session.id
                          ? "border-primary/35 shadow-[0_14px_30px_-28px_rgba(249,115,22,0.9)]"
                          : "border-border/80",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-medium">{formatSessionTitle(session)}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.id}
                          </p>
                        </div>
                        <Badge variant={statusTone(session.status)}>
                          {session.status}
                        </Badge>
                        {session.runAsRoot ? (
                          <Badge variant="default">root</Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          <TimeDisplay value={session.createdAt} mode="relative" />
                        </span>
                        {session.exitCode !== null ? (
                          <span>Exit {session.exitCode}</span>
                        ) : null}
                        {session.closedReason ? (
                          <span>{session.closedReason}</span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <EmptyState
                title="No terminal sessions yet"
                description="This node does not have a terminal session history yet."
                icon={History}
                variant="plain"
              />
            )}
          </SectionPanel>

          <SectionPanel
            eyebrow="Transcript"
            title="Deterministic I/O timeline"
          description="Persisted base64 transcript chunks rendered as chronological input, output, and system events."
          action={
              selectedSession ? (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-xs text-muted-foreground">
                    <Switch
                      checked={transcriptTerminalMode}
                      onCheckedChange={setTranscriptTerminalMode}
                    />
                    Terminal view
                  </div>
                  {!isLiveSession(selectedSession.status) ? (
                    <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((page) => Math.max(0, page - 1))}
                    disabled={historyPage === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {historyPage + 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((page) => page + 1)}
                    disabled={
                      transcriptQuery.isPending ||
                      (transcriptQuery.data?.length ?? 0) < HISTORY_PAGE_SIZE
                    }
                  >
                    Next
                  </Button>
                    </>
                  ) : null}
                </div>
              ) : null
            }
            contentClassName="p-0"
          >
            {!selectedSession ? (
              <EmptyState
                title="Select a session"
                description="Choose a recent session to inspect its transcript timeline."
                icon={History}
                variant="plain"
              />
            ) : !canReadSelectedTranscript ? (
              <EmptyState
                title="Transcript access is restricted"
                description="Only the creator of a live terminal session can inspect its persisted transcript while it is still active."
                icon={SquareTerminal}
                variant="plain"
              />
            ) : transcriptQuery.isPending ? (
              <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                {selectedSession && isLiveSession(selectedSession.status)
                  ? "Streaming transcript..."
                  : "Loading transcript..."}
              </div>
            ) : transcriptQuery.isError ? (
              <EmptyState
                title="Transcript unavailable"
                description="The transcript could not be loaded for the selected session."
                icon={XCircle}
                actionLabel="Retry"
                onAction={() => void transcriptQuery.refetch()}
                variant="plain"
              />
            ) : transcriptQuery.data?.length ? (
              <ScrollArea className="h-[32rem]">
                {transcriptTerminalMode ? (
                  <div className="min-h-full bg-[#0e0e0e]">
                    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-[#0e0e0e]/95 px-5 py-3 backdrop-blur">
                      <SquareTerminal className="size-4 text-emerald-400" />
                      <span className="font-mono text-xs font-medium text-emerald-400">
                        Terminal Window
                      </span>
                    </div>
                    <div className="p-5">
                      <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#a8ff60] selection:bg-emerald-900">
                        {transcriptTerminalText}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 px-5 py-4 sm:px-6">
                    {transcriptQuery.data.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="surface-subtle rounded-2xl border px-4 py-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={directionTone(chunk.direction)}>
                              {chunk.direction}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground">
                              seq {chunk.seq}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            <TimeDisplay
                              value={chunk.sourceTimestamp ?? chunk.createdAt}
                              mode="relative"
                            />
                          </span>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-background/60 px-3 py-2 font-mono text-xs leading-6 text-foreground">
                          {decodeTranscriptText(chunk.payload)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : (
              <EmptyState
                title={
                  selectedSession && isLiveSession(selectedSession.status)
                    ? "Waiting for transcript chunks"
                    : "Transcript is empty"
                }
                description={
                  selectedSession && isLiveSession(selectedSession.status)
                    ? "Persisted input, output, and system chunks will appear here as the live session runs."
                    : "No persisted transcript chunks were found for the selected session page."
                }
                icon={History}
                variant="plain"
              />
            )}
          </SectionPanel>
        </div>
      </div>
    </AppShell>
  );
};
