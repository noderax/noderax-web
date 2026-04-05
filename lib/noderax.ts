import type {
  AuthSession,
  AuthUser,
  DashboardOverview,
  EventDto,
  EventRecord,
  EventSeverity,
  InstalledPackage,
  MetricDto,
  MetricPoint,
  NodeDetail,
  NodeDto,
  NodeSummary,
  PackageSearchResult,
  ScheduledTaskDto,
  ScheduledTaskSummary,
  TaskDetail,
  TaskDto,
  TaskLogDto,
  TaskLogLine,
  TaskStatus,
  TaskSummary,
  UserDto,
} from "@/lib/types";

const DEFAULT_NODE_NOTIFICATION_LEVELS: EventSeverity[] = [
  "info",
  "warning",
  "critical",
];

const titleCase = (value: string) =>
  value
    .split(/[\s._-]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length ? value.trim() : null;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeEventSeverities = (value: EventSeverity[] | null | undefined) =>
  DEFAULT_NODE_NOTIFICATION_LEVELS.filter((severity) => value?.includes(severity));

const readFirstString = (
  record: Record<string, unknown> | null,
  keys: string[],
) => {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = readString(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

export const maskToken = (token: string) => {
  if (token.length <= 14) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};

export const deriveScopesFromRole = (role: string) => {
  const normalizedRole = role.toLowerCase();

  if (normalizedRole === "platform_admin") {
    return [
      "workspaces:read",
      "workspaces:write",
      "nodes:read",
      "nodes:write",
      "tasks:read",
      "tasks:write",
      "events:read",
      "metrics:read",
      "users:read",
    ];
  }

  return ["nodes:read", "tasks:read", "events:read", "metrics:read"];
};

export const toAuthUser = (user: UserDto): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  timezone: user.timezone,
  inviteStatus: user.inviteStatus,
  lastInvitedAt: user.lastInvitedAt,
  activatedAt: user.activatedAt,
  criticalEventEmailsEnabled: user.criticalEventEmailsEnabled,
  enrollmentEmailsEnabled: user.enrollmentEmailsEnabled,
  mfaEnabled: user.mfaEnabled,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const buildAuthSession = (input: {
  token: string;
  user: UserDto;
  expiresAt: string | null;
}): AuthSession => ({
  user: toAuthUser(input.user),
  scopes: deriveScopesFromRole(input.user.role),
  expiresAt: input.expiresAt,
  tokenPreview: maskToken(input.token),
});

export const formatTaskType = (type: string) => titleCase(type);

export const getTaskCommand = (payload: Record<string, unknown>) =>
  readFirstString(payload, ["command", "cmd", "script", "operation", "target"]);

export const getTaskScheduleId = (payload: Record<string, unknown>) =>
  readFirstString(payload, ["scheduleId"]);

export const getTaskScheduleName = (payload: Record<string, unknown>) =>
  getTaskScheduleId(payload)
    ? readFirstString(payload, ["scheduleName", "title", "name"])
    : null;

export const getTaskDisplayName = (task: Pick<TaskDto, "type" | "payload">) =>
  readFirstString(task.payload, ["title", "name", "label"]) ??
  getTaskCommand(task.payload) ??
  formatTaskType(task.type);

export const getTaskExitCode = (task: Pick<TaskDto, "result">) => {
  const result = readRecord(task.result);
  if (!result) {
    return null;
  }

  return readNumber(result.exitCode);
};

export const isTaskActive = (status: TaskStatus) =>
  status === "queued" || status === "running";

export const mapMetricDtoToPoint = (metric: MetricDto): MetricPoint => ({
  timestamp: metric.recordedAt,
  cpu: Math.round(metric.cpuUsage),
  memory: Math.round(metric.memoryUsage),
  disk: Math.round(metric.diskUsage),
  temperature:
    metric.temperature !== null && metric.temperature !== undefined
      ? Number(metric.temperature.toFixed(1))
      : null,
});

export const aggregateMetricSeries = (metrics: MetricDto[]) => {
  const buckets = new Map<
    string,
    {
      timestamp: string;
      cpu: number[];
      memory: number[];
      disk: number[];
      temperature: number[];
    }
  >();

  metrics.forEach((metric) => {
    const key = metric.recordedAt.slice(0, 16);
    const bucket = buckets.get(key) ?? {
      timestamp: new Date(`${key}:00.000Z`).toISOString(),
      cpu: [],
      memory: [],
      disk: [],
      temperature: [],
    };

    bucket.cpu.push(metric.cpuUsage);
    bucket.memory.push(metric.memoryUsage);
    bucket.disk.push(metric.diskUsage);
    if (metric.temperature !== null && metric.temperature !== undefined) {
      bucket.temperature.push(metric.temperature);
    }
    buckets.set(key, bucket);
  });

  return Array.from(buckets.values())
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
    .map((bucket) => ({
      timestamp: bucket.timestamp,
      cpu: Math.round(bucket.cpu.reduce((sum, value) => sum + value, 0) / bucket.cpu.length),
      memory: Math.round(
        bucket.memory.reduce((sum, value) => sum + value, 0) / bucket.memory.length,
      ),
      disk: Math.round(bucket.disk.reduce((sum, value) => sum + value, 0) / bucket.disk.length),
      temperature: bucket.temperature.length
        ? Number(
            (
              bucket.temperature.reduce((sum, value) => sum + value, 0) / bucket.temperature.length
            ).toFixed(1),
          )
        : null,
    }));
};

export const mapNodeSummary = (
  node: NodeDto,
  metricsByNodeId: Map<string, MetricDto[]>,
): NodeSummary => {
  const metrics = metricsByNodeId.get(node.id) ?? [];

  return {
    id: node.id,
    workspaceId: node.workspaceId,
    name: node.name,
    hostname: node.hostname,
    status: node.status,
    teamId: node.teamId ?? null,
    teamName: node.teamName ?? null,
    maintenanceMode: node.maintenanceMode ?? false,
    notificationEmailEnabled: node.notificationEmailEnabled ?? true,
    notificationEmailLevels: normalizeEventSeverities(
      node.notificationEmailLevels,
    ),
    notificationTelegramEnabled: node.notificationTelegramEnabled ?? true,
    notificationTelegramLevels: normalizeEventSeverities(
      node.notificationTelegramLevels,
    ),
    rootAccessProfile: node.rootAccessProfile ?? "off",
    rootAccessAppliedProfile: node.rootAccessAppliedProfile ?? "off",
    rootAccessSyncStatus: node.rootAccessSyncStatus ?? "pending",
    rootAccessUpdatedAt: node.rootAccessUpdatedAt ?? null,
    rootAccessUpdatedByUserId: node.rootAccessUpdatedByUserId ?? null,
    rootAccessLastAppliedAt: node.rootAccessLastAppliedAt ?? null,
    rootAccessLastError: node.rootAccessLastError ?? null,
    maintenanceReason: node.maintenanceReason ?? null,
    agentVersion: node.agentVersion ?? null,
    platformVersion: node.platformVersion ?? null,
    kernelVersion: node.kernelVersion ?? null,
    lastVersionReportedAt: node.lastVersionReportedAt ?? null,
    lastSeenAt: node.lastSeenAt,
    os: node.os,
    arch: node.arch,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    latestMetric: metrics[0] ? mapMetricDtoToPoint(metrics[0]) : null,
  };
};

export const mapTaskSummary = (
  task: TaskDto,
  nodeLookup: Map<string, NodeDto | NodeSummary>,
): TaskSummary => {
  const node = nodeLookup.get(task.nodeId);

  return {
    id: task.id,
    name: getTaskDisplayName(task),
    type: task.type,
    status: task.status,
    nodeId: task.nodeId,
    targetTeamId: task.targetTeamId ?? null,
    targetTeamName: task.targetTeamName ?? null,
    templateId: task.templateId ?? null,
    templateName: task.templateName ?? null,
    nodeName: node?.name ?? node?.hostname ?? task.targetTeamName ?? "Unknown node",
    command: getTaskCommand(task.payload),
    scheduleId: getTaskScheduleId(task.payload),
    scheduleName: getTaskScheduleName(task.payload),
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    finishedAt: task.finishedAt,
    updatedAt: task.updatedAt,
    exitCode: getTaskExitCode(task),
    lastOutput: task.output,
  };
};

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const formatScheduledTaskFrequency = (
  task: Pick<
    ScheduledTaskDto,
    "cadence" | "minute" | "hour" | "dayOfWeek" | "intervalMinutes" | "timezone"
  >,
) => {
  const minute = task.minute.toString().padStart(2, "0");

  switch (task.cadence) {
    case "minutely":
      return `Every minute (${task.timezone})`;
    case "custom":
      return `Every ${task.intervalMinutes ?? 1} minutes (${task.timezone})`;
    case "hourly":
      return `Every hour at :${minute} (${task.timezone})`;
    case "daily":
      return `Every day at ${(task.hour ?? 0).toString().padStart(2, "0")}:${minute} (${task.timezone})`;
    case "weekly":
      return `Every ${WEEKDAY_LABELS[task.dayOfWeek ?? 0]} at ${(task.hour ?? 0)
        .toString()
        .padStart(2, "0")}:${minute} (${task.timezone})`;
    default:
      return "Scheduled task";
  }
};

export const mapScheduledTaskSummary = (
  task: ScheduledTaskDto,
  nodeLookup: Map<string, NodeDto | NodeSummary>,
): ScheduledTaskSummary => {
  const node = task.nodeId ? nodeLookup.get(task.nodeId) : null;

  return {
    ...task,
    nodeName: task.targetTeamName ?? node?.name ?? node?.hostname ?? "Broadcast target",
    frequencyLabel: formatScheduledTaskFrequency(task),
  };
};

export const mapInstalledPackage = (input: Record<string, unknown>): InstalledPackage => {
  const record = readRecord(input);

  return {
    name: readFirstString(record, ["name", "package", "packageName"]) ?? "Unknown package",
    version:
      readFirstString(record, ["version", "installedVersion", "candidateVersion"]) ??
      "Unknown version",
    status: readFirstString(record, ["status", "state"]) ?? "unknown",
  };
};

export const mapPackageSearchResult = (
  input: Record<string, unknown>,
): PackageSearchResult => {
  const record = readRecord(input);

  return {
    name: readFirstString(record, ["name", "package", "packageName"]) ?? "Unknown package",
    version:
      readFirstString(record, ["version", "candidateVersion", "installedVersion"]) ??
      "Unknown version",
    description:
      readFirstString(record, ["description", "summary", "shortDescription"]) ??
      "No description available.",
  };
};

const resolveEventEntity = (event: EventDto): Pick<EventRecord, "entityType" | "entityId"> => {
  const metadata = readRecord(event.metadata);
  const taskId = readString(metadata?.taskId);

  if (taskId) {
    return {
      entityType: "task",
      entityId: taskId,
    };
  }

  if (event.nodeId) {
    return {
      entityType: "node",
      entityId: event.nodeId,
    };
  }

  return {
    entityType: "system",
  };
};

const resolveEventSourceLabel = (event: EventDto) => {
  if (event.type.startsWith("task.")) {
    return "Task engine";
  }

  if (event.type.startsWith("node.")) {
    return "Node monitor";
  }

  if (event.type.includes("cpu") || event.type.includes("memory") || event.type.includes("disk")) {
    return "Metrics pipeline";
  }

  return "Control plane";
};

export const mapEventRecord = (event: EventDto): EventRecord => {
  const entity = resolveEventEntity(event);

  return {
    id: event.id,
    type: event.type,
    severity: event.severity,
    title: titleCase(event.type),
    message: event.message,
    createdAt: event.createdAt,
    sourceLabel: resolveEventSourceLabel(event),
    entityType: entity.entityType,
    entityId: entity.entityId,
    nodeId: event.nodeId,
    metadata: event.metadata,
  };
};

export const mapTaskLogLine = (log: TaskLogDto): TaskLogLine => ({
  id: log.id,
  taskId: log.taskId,
  timestamp: log.timestamp ?? log.createdAt,
  level: log.level,
  message: log.message,
});

export const filterTaskEvents = (events: EventDto[], taskId: string) =>
  events.filter((event) => {
    const metadata = readRecord(event.metadata);
    return metadata?.taskId === taskId;
  });

export const buildDashboardOverview = (input: {
  nodes: NodeSummary[];
  tasks: TaskSummary[];
  events: EventRecord[];
  metrics: MetricDto[];
}): DashboardOverview => ({
  totals: {
    totalNodes: input.nodes.length,
    onlineNodes: input.nodes.filter((node) => node.status === "online").length,
    runningTasks: input.tasks.filter((task) => task.status === "running").length,
    failedTasks: input.tasks.filter((task) => task.status === "failed").length,
  },
  metricSeries: aggregateMetricSeries(input.metrics).slice(-24),
  recentEvents: input.events.slice(0, 6),
  nodes: input.nodes,
  tasks: input.tasks,
});

export const buildNodeDetail = (input: {
  node: NodeSummary;
  metrics: MetricDto[];
  events: EventDto[];
  tasks: TaskDto[];
  nodeLookup: Map<string, NodeSummary>;
}): NodeDetail => ({
  ...input.node,
  metrics: input.metrics
    .slice()
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
    .map(mapMetricDtoToPoint),
  recentEvents: input.events.map(mapEventRecord),
  runningTasks: input.tasks.map((task) => mapTaskSummary(task, input.nodeLookup)),
  networkStats: input.metrics[0]?.networkStats ?? null,
});

export const buildTaskDetail = (input: {
  task: TaskDto;
  node: NodeSummary | null;
  logs: TaskLogDto[];
  events: EventDto[];
  nodeLookup: Map<string, NodeSummary>;
}): TaskDetail => ({
  ...mapTaskSummary(input.task, input.nodeLookup),
  payload: input.task.payload,
  result: input.task.result,
  node: input.node,
  logs: input.logs.map(mapTaskLogLine),
  relatedEvents: filterTaskEvents(input.events, input.task.id).map(mapEventRecord),
});

export const severityOrder: Record<EventSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};
