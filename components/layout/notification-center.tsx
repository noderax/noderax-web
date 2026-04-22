"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  BellDot,
  CheckCheck,
  CircleAlert,
  Clock3,
  MailWarning,
  RefreshCw,
  ServerCrash,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeDisplay } from "@/components/ui/time-display";
import { apiClient } from "@/lib/api";
import type {
  DependencyHealthCheck,
  EventDto,
  EventRecord,
  OutboxDeadLetterRecord,
  OutboxDependencyMeta,
  ReadinessResponse,
  TaskSummary,
} from "@/lib/types";
import { getRealtimeClient, type RealtimeMessage } from "@/lib/websocket";
import { buildWorkspacePath } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type NotificationCenterTab = "all" | "events" | "tasks" | "nodes" | "runtime";
type NotificationSeverityFilter = "all" | "info" | "warning" | "critical";

type NotificationCenterItem = {
  id: string;
  kind: "event" | "task" | "runtime";
  category: "task" | "node" | "platform" | "system";
  title: string;
  message: string;
  timestamp: string;
  severity: "info" | "warning" | "critical" | null;
  href: string | null;
  badge: string;
  icon: ReactNode;
};

const MAX_LIVE_ITEMS = 40;
const NOTIFICATION_TABS: Array<{
  value: NotificationCenterTab;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "events", label: "Events" },
  { value: "tasks", label: "Tasks" },
  { value: "nodes", label: "Nodes" },
  { value: "runtime", label: "Runtime" },
];

const readStorageValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeStorageValue = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const dedupeItems = (items: NotificationCenterItem[]) => {
  const seen = new Set<string>();
  const next: NotificationCenterItem[] = [];

  items
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
    .forEach((item) => {
      if (seen.has(item.id)) {
        return;
      }
      seen.add(item.id);
      next.push(item);
    });

  return next;
};

const buildEventItem = (
  event: EventRecord,
  workspaceSlug: string | null,
): NotificationCenterItem => {
  const href =
    workspaceSlug && event.entityType === "task" && event.entityId
      ? buildWorkspacePath(workspaceSlug, `tasks/${event.entityId}`)
      : workspaceSlug && event.entityType === "node" && event.entityId
        ? buildWorkspacePath(workspaceSlug, `nodes/${event.entityId}`)
        : workspaceSlug
          ? buildWorkspacePath(workspaceSlug, "events")
          : null;

  return {
    id: `event:${event.id}`,
    kind: "event",
    category:
      event.entityType === "task"
        ? "task"
        : event.entityType === "node"
          ? "node"
          : "system",
    title: event.title,
    message: event.message,
    timestamp: event.createdAt,
    severity: event.severity,
    href,
    badge: event.sourceLabel,
    icon:
      event.severity === "critical" ? (
        <ShieldAlert className="size-4 text-tone-danger" />
      ) : event.severity === "warning" ? (
        <AlertTriangle className="size-4 text-tone-warning" />
      ) : (
        <CircleAlert className="size-4 text-tone-brand" />
      ),
  };
};

const humanizeTaskStatus = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1);

const buildTaskItem = (
  task: TaskSummary,
  workspaceSlug: string | null,
  source: "snapshot" | "created" | "updated",
): NotificationCenterItem => ({
  id:
    source === "created"
      ? `task:${task.id}:created:${task.createdAt}`
      : source === "updated"
        ? `task:${task.id}:updated:${task.updatedAt}:${task.status}`
        : `task:${task.id}:snapshot:${task.updatedAt}`,
  kind: "task",
  category: "task",
  title:
    source === "created"
      ? `Task queued: ${task.name}`
      : `Task ${humanizeTaskStatus(task.status).toLowerCase()}: ${task.name}`,
  message: `${task.nodeName} · ${humanizeTaskStatus(task.status)}`,
  timestamp: source === "created" ? task.createdAt : task.updatedAt,
  severity: task.status === "failed" ? "warning" : null,
  href: workspaceSlug ? buildWorkspacePath(workspaceSlug, `tasks/${task.id}`) : null,
  badge: source === "created" ? "Task created" : "Task update",
  icon:
    task.status === "failed" ? (
      <AlertTriangle className="size-4 text-tone-warning" />
    ) : (
      <Clock3 className="size-4 text-muted-foreground" />
    ),
});

const parseOutboxMeta = (
  check: DependencyHealthCheck | undefined,
): OutboxDependencyMeta | null => {
  const meta = check?.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return null;
  }

  const record = meta as Record<string, unknown>;
  const deadLetters = Array.isArray(record.deadLetters)
    ? record.deadLetters.filter(
        (item): item is OutboxDeadLetterRecord =>
          Boolean(item) &&
          typeof item === "object" &&
          !Array.isArray(item) &&
          typeof (item as OutboxDeadLetterRecord).id === "string",
      )
    : [];

  return {
    backlogCount:
      typeof record.backlogCount === "number" ? record.backlogCount : 0,
    dueCount: typeof record.dueCount === "number" ? record.dueCount : 0,
    failedCount: typeof record.failedCount === "number" ? record.failedCount : 0,
    deadLetterCount:
      typeof record.deadLetterCount === "number" ? record.deadLetterCount : 0,
    deadLetters,
    actions: Array.isArray(record.actions)
      ? record.actions.filter(
          (item): item is { id: string; label: string } =>
            Boolean(item) &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            typeof (item as { id?: string }).id === "string" &&
            typeof (item as { label?: string }).label === "string",
        )
      : [],
  };
};

const buildRuntimeItems = (
  readiness: ReadinessResponse | undefined,
): NotificationCenterItem[] =>
  Object.entries(readiness?.checks ?? {})
    .filter(([, check]) => !check.healthy)
    .map(([key, check]) => ({
      id: `runtime:${key}:${check.status}:${check.detail ?? "none"}`,
      kind: "runtime",
      category: "platform",
      title: `${key} is ${check.status.replace(/_/g, " ")}`,
      message: check.detail ?? "Dependency check requires operator attention.",
      timestamp: readiness?.timestamp ?? new Date().toISOString(),
      severity: "warning",
      href: null,
      badge: "Runtime",
      icon:
        key === "outbox" ? (
          <MailWarning className="size-4 text-tone-warning" />
        ) : (
          <ServerCrash className="size-4 text-tone-warning" />
        ),
    }));

const eventToRecord = (event: EventDto): EventRecord => {
  const taskId =
    event.metadata &&
    typeof event.metadata === "object" &&
    typeof event.metadata.taskId === "string"
      ? event.metadata.taskId
      : undefined;

  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    title: event.type
      .split(/[._-]+/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    message: event.message,
    createdAt: event.createdAt,
    sourceLabel: event.type.startsWith("node.")
      ? "Node monitor"
      : event.type.startsWith("task.")
        ? "Task engine"
        : "Control plane",
    entityType: taskId ? "task" : event.nodeId ? "node" : "system",
    entityId: taskId ?? event.nodeId ?? undefined,
    nodeId: event.nodeId,
    metadata: event.metadata,
  };
};

type NotificationCenterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: NotificationCenterTab;
  onTabChange: (value: NotificationCenterTab) => void;
  workspaceId: string | null;
  workspaceSlug: string | null;
  sessionUserId: string | null;
  isPlatformAdmin: boolean;
  readiness: ReadinessResponse | undefined;
};

export const NotificationCenter = ({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  workspaceId,
  workspaceSlug,
  sessionUserId,
  isPlatformAdmin,
  readiness,
}: NotificationCenterProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const storageKey = `noderax.notification-center.read:${sessionUserId ?? "anonymous"}:${workspaceId ?? "global"}`;
  const [severityFilter, setSeverityFilter] =
    useState<NotificationSeverityFilter>("all");
  const [liveItems, setLiveItems] = useState<NotificationCenterItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() =>
    readStorageValue<string[]>(storageKey, []),
  );
  const [selectedDeadLetterIds, setSelectedDeadLetterIds] = useState<string[]>([]);

  const runtimeItems = useMemo(() => buildRuntimeItems(readiness), [readiness]);
  const outboxMeta = parseOutboxMeta(readiness?.checks?.outbox);

  const eventsQuery = useQuery({
    queryKey: workspaceId
      ? ["events", workspaceId, "list", { limit: 12 }]
      : ["events", "idle", { limit: 12 }],
    queryFn: () => apiClient.getEventRecords({ limit: 12 }, workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const tasksQuery = useQuery({
    queryKey: workspaceId
      ? ["tasks", workspaceId, "list", { limit: 16 }]
      : ["tasks", "idle", { limit: 16 }],
    queryFn: () => apiClient.getTaskSummaries({ limit: 16 }, workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    const client = getRealtimeClient();
    const unsubscribe = client.subscribe((message: RealtimeMessage) => {
      if (message.type === "event.created" && message.data.workspaceId === workspaceId) {
        const item = buildEventItem(eventToRecord(message.data), workspaceSlug);
        setLiveItems((current) =>
          dedupeItems([item, ...current]).slice(0, MAX_LIVE_ITEMS),
        );
        return;
      }

      if (
        (message.type === "task.created" || message.type === "task.updated") &&
        message.data.workspaceId === workspaceId
      ) {
        const existingTask = (tasksQuery.data ?? []).find(
          (task) => task.id === message.data.id || task.nodeId === message.data.nodeId,
        );
        const summary: TaskSummary = {
          id: message.data.id,
          name:
            typeof message.data.type === "string"
              ? message.data.type
              : existingTask?.name ?? "Task",
          type: message.data.type,
          status: message.data.status,
          nodeId: message.data.nodeId,
          targetTeamId: message.data.targetTeamId ?? null,
          targetTeamName: message.data.targetTeamName ?? null,
          templateId: message.data.templateId ?? null,
          templateName: message.data.templateName ?? null,
          nodeName: existingTask?.nodeName ?? "Unknown node",
          command:
            typeof message.data.payload.command === "string"
              ? message.data.payload.command
              : null,
          scheduleId:
            typeof message.data.payload.scheduleId === "string"
              ? message.data.payload.scheduleId
              : null,
          scheduleName:
            typeof message.data.payload.scheduleName === "string"
              ? message.data.payload.scheduleName
              : null,
          createdAt: message.data.createdAt,
          startedAt: message.data.startedAt,
          finishedAt: message.data.finishedAt,
          updatedAt: message.data.updatedAt,
          exitCode:
            typeof message.data.result?.exitCode === "number"
              ? message.data.result.exitCode
              : null,
          lastOutput: message.data.output,
        };
        const item = buildTaskItem(
          summary,
          workspaceSlug,
          message.type === "task.created" ? "created" : "updated",
        );
        setLiveItems((current) =>
          dedupeItems([item, ...current]).slice(0, MAX_LIVE_ITEMS),
        );
      }
    });

    return unsubscribe;
  }, [tasksQuery.data, workspaceId, workspaceSlug]);

  const historyItems = useMemo(() => {
    const taskItems = (tasksQuery.data ?? []).map((task) =>
      buildTaskItem(task, workspaceSlug, "snapshot"),
    );

    return dedupeItems([
      ...(eventsQuery.data ?? []).map((event) => buildEventItem(event, workspaceSlug)),
      ...taskItems,
      ...runtimeItems,
      ...liveItems,
    ]);
  }, [eventsQuery.data, liveItems, runtimeItems, tasksQuery.data, workspaceSlug]);

  const filteredItems = useMemo(
    () =>
      historyItems.filter((item) => {
        if (activeTab === "events" && item.kind !== "event") {
          return false;
        }
        if (activeTab === "tasks" && item.category !== "task") {
          return false;
        }
        if (activeTab === "nodes" && item.category !== "node") {
          return false;
        }
        if (activeTab === "runtime" && item.kind !== "runtime") {
          return false;
        }
        if (severityFilter !== "all" && item.severity !== severityFilter) {
          return false;
        }
        return true;
      }),
    [activeTab, historyItems, severityFilter],
  );

  const unreadCount = historyItems.filter((item) => !readIds.includes(item.id)).length;
  const effectiveSelectedDeadLetterIds = selectedDeadLetterIds.filter((id) =>
    outboxMeta?.deadLetters.some((item) => item.id === id),
  );

  const requeueMutation = useMutation({
    mutationFn: (ids: string[]) => apiClient.requeueOutboxDeadLetters({ ids }),
    onSuccess: (response) => {
      toast.success(`Requeued ${response.affected} dead-letter outbox entries.`);
      queryClient.invalidateQueries({ queryKey: ["platform", "health"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "health", "ready"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to requeue outbox entries.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => apiClient.deleteOutboxDeadLetters({ ids }),
    onSuccess: (response) => {
      toast.success(`Deleted ${response.affected} dead-letter outbox entries.`);
      setSelectedDeadLetterIds([]);
      queryClient.invalidateQueries({ queryKey: ["platform", "health"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "health", "ready"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Unable to delete outbox entries.");
    },
  });

  const markItemsRead = () => {
    const nextReadIds = Array.from(
      new Set([...readIds, ...historyItems.map((item) => item.id)]),
    ).slice(-400);
    setReadIds(nextReadIds);
    writeStorageValue(storageKey, nextReadIds);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      markItemsRead();
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="relative"
        onClick={() => handleOpenChange(true)}
        aria-label="Open notification center"
      >
        {unreadCount > 0 ? (
          <BellDot className="size-4" />
        ) : (
          <Bell className="size-4" />
        )}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-tone-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-[460px] lg:max-w-[540px]">
          <div className="sticky top-0 z-10 border-b border-border/70 bg-background/96 backdrop-blur-xl">
            <SheetHeader className="gap-3 border-b border-border/60 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SheetTitle>Notifications</SheetTitle>
                    {unreadCount > 0 ? (
                      <Badge variant="secondary">{unreadCount} new</Badge>
                    ) : null}
                  </div>
                  <SheetDescription className="mt-1 max-w-[28rem] text-balance">
                    Realtime workspace activity, task updates, node state changes,
                    and platform runtime alerts.
                  </SheetDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    const next = Array.from(
                      new Set([...readIds, ...historyItems.map((item) => item.id)]),
                    ).slice(-400);
                    setReadIds(next);
                    writeStorageValue(storageKey, next);
                  }}
                >
                  <CheckCheck className="size-4" />
                  <span className="hidden sm:inline">Mark all read</span>
                  <span className="sm:hidden">Read</span>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Unread
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {unreadCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Feed
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {historyItems.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-muted/30 px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Runtime
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {runtimeItems.length}
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-3 px-4 py-4">
              <Tabs
                value={activeTab}
                onValueChange={(value) =>
                  onTabChange(value as NotificationCenterTab)
                }
              >
                <div className="overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsList className="inline-flex w-max min-w-full sm:min-w-0">
                    {NOTIFICATION_TABS.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="min-w-[88px] flex-none"
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>

              <div className="overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-2">
                  {(["all", "info", "warning", "critical"] as const).map((value) => (
                    <Button
                      key={value}
                      type="button"
                      variant={severityFilter === value ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "rounded-full px-3.5",
                        severityFilter === value &&
                          "bg-[linear-gradient(135deg,oklch(0.68_0.2_32),oklch(0.61_0.23_18))] text-white hover:bg-[linear-gradient(135deg,oklch(0.66_0.2_32),oklch(0.59_0.23_18))]",
                      )}
                      onClick={() => setSeverityFilter(value)}
                    >
                      {value === "all"
                        ? "All severities"
                        : value.charAt(0).toUpperCase() + value.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            {activeTab === "runtime" &&
            isPlatformAdmin &&
            outboxMeta &&
            outboxMeta.deadLetterCount > 0 ? (
              <div className="mb-4 rounded-[24px] border border-tone-warning/30 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--tone-warning)_8%,transparent),transparent)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Outbox remediation
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Dead-letter notifications are blocking clean runtime
                      health.
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {outboxMeta.deadLetterCount} dead letter
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                    Backlog {outboxMeta.backlogCount}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                    Due {outboxMeta.dueCount}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                    Failed {outboxMeta.failedCount}
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2.5">
                    Dead letter {outboxMeta.deadLetterCount}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {outboxMeta.deadLetters.length ? (
                    outboxMeta.deadLetters.map((item) => {
                      const selected = selectedDeadLetterIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            "w-full rounded-2xl border px-3 py-3 text-left transition",
                            selected
                              ? "border-tone-warning bg-background shadow-sm"
                              : "border-border/70 bg-background/80 hover:border-tone-warning/50",
                          )}
                          onClick={() =>
                            setSelectedDeadLetterIds((current) =>
                              current.includes(item.id)
                                ? current.filter((value) => value !== item.id)
                                : [...current, item.id],
                            )
                          }
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {item.type}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                attempts={item.attempts} · {item.id}
                              </p>
                            </div>
                            <TimeDisplay value={item.updatedAt} mode="relative" />
                          </div>
                          {item.lastError ? (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                              {item.lastError}
                            </p>
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No dead-letter preview records are currently available.
                    </p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={
                      effectiveSelectedDeadLetterIds.length === 0 ||
                      requeueMutation.isPending
                    }
                    onClick={() =>
                      requeueMutation.mutate(effectiveSelectedDeadLetterIds)
                    }
                  >
                    <RefreshCw className="size-4" />
                    Requeue selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      effectiveSelectedDeadLetterIds.length === 0 ||
                      deleteMutation.isPending
                    }
                    onClick={() =>
                      deleteMutation.mutate(effectiveSelectedDeadLetterIds)
                    }
                  >
                    <Trash2 className="size-4" />
                    Delete selected
                  </Button>
                </div>
              </div>
            ) : null}

            <ScrollArea className="h-[calc(100vh-22rem)] min-h-[22rem] pr-2 sm:h-[calc(100vh-20rem)]">
              <div className="space-y-3 pr-1">
                {filteredItems.length ? (
                  filteredItems.map((item) => {
                    const unread = !readIds.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={cn(
                          "group flex w-full items-start gap-3 rounded-[26px] border px-4 py-3.5 text-left transition hover:border-border hover:bg-muted/30",
                          unread &&
                            "border-tone-brand/25 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--tone-brand)_8%,transparent),transparent)]",
                        )}
                        onClick={() => {
                          if (item.href) {
                            router.push(item.href);
                            onOpenChange(false);
                          }
                        }}
                      >
                        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/40">
                          {item.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="max-w-full truncate text-[15px] font-semibold text-foreground">
                                  {item.title}
                                </p>
                                <Badge
                                  variant="outline"
                                  className="max-w-full shrink-0"
                                >
                                  {item.badge}
                                </Badge>
                                {unread ? (
                                  <span className="size-2 shrink-0 rounded-full bg-tone-brand" />
                                ) : null}
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                {item.message}
                              </p>
                            </div>
                            <div className="shrink-0 text-xs text-muted-foreground sm:pt-0.5">
                              <TimeDisplay value={item.timestamp} mode="relative" />
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            <span>{item.kind}</span>
                            {item.severity ? <span>{item.severity}</span> : null}
                            {item.href ? <span>Open</span> : <span>Info</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-[26px] border border-dashed px-4 py-8 text-sm text-muted-foreground">
                    No notifications matched the current filters.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
