import {
  buildDashboardOverview,
  buildNodeDetail,
  buildTaskDetail,
  mapEventRecord,
  mapInstalledPackage,
  mapNodeSummary,
  mapPackageSearchResult,
  mapScheduledTaskSummary,
  mapTaskSummary,
} from "@/lib/noderax";
import type {
  AuthSession,
  CancelTaskPayload,
  CancelTaskResponse,
  CreateScheduledTaskPayload,
  CreateNodePayload,
  CreateTaskPayload,
  CreateUserPayload,
  DashboardOverview,
  DeleteScheduledTaskResponse,
  DeleteNodeResponse,
  EnrollmentStatusResponse,
  EventDto,
  EventFilters,
  EventRecord,
  FinalizeEnrollmentPayload,
  FinalizeEnrollmentResponse,
  InstallPackagesPayload,
  LoginPayload,
  MetricDto,
  MetricFilters,
  NodeDetail,
  NodeDto,
  NodeFilters,
  NodeSummary,
  PackageSearchResult,
  PackageTaskAcceptedResponse,
  PackageTaskMutationResponse,
  InstalledPackage,
  RemovePackagePayload,
  ScheduledTaskDto,
  ScheduledTaskSummary,
  TaskDetail,
  TaskDto,
  TaskFilters,
  TaskLogDto,
  TaskLogFilters,
  TaskFlowDiagnostics,
  TaskSummary,
  UserDto,
} from "@/lib/types";

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type PackageTaskReference = Pick<
  PackageTaskAcceptedResponse,
  "taskId" | "taskStatus"
>;

const ASYNC_PACKAGE_TASK_TIMEOUT_MS = 45_000;
const ASYNC_PACKAGE_TASK_POLL_INTERVAL_MS = 1_500;
const PACKAGE_COLLECTION_KEYS = [
  "packages",
  "installedPackages",
  "searchResults",
  "results",
  "items",
  "entries",
  "data",
] as const;

const buildQueryString = (
  params?: Record<string, string | number | undefined | null>,
) => {
  if (!params) {
    return "";
  }

  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const value = query.toString();
  return value ? `?${value}` : "";
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    return payload.message ?? payload.error ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
};

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length ? value.trim() : null;

const readRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const hasOwn = (record: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(record, key);

const isPackageTaskAcceptedResponse = (
  value: unknown,
): value is PackageTaskAcceptedResponse => {
  const record = readRecord(value);

  return (
    Boolean(record) &&
    typeof record?.taskId === "string" &&
    typeof record?.taskStatus === "string" &&
    typeof record?.nodeId === "string" &&
    typeof record?.operation === "string" &&
    Array.isArray(record?.names) &&
    record.names.every((item) => typeof item === "string") &&
    (record?.purge === null || typeof record?.purge === "boolean") &&
    (record?.term === null || typeof record?.term === "string")
  );
};

const isPackageTaskReference = (
  value: unknown,
): value is PackageTaskReference => {
  const record = readRecord(value);

  return (
    Boolean(record) &&
    typeof record?.taskId === "string" &&
    typeof record?.taskStatus === "string"
  );
};

const normalizePackageTaskMutationResponse = (
  value: unknown,
): PackageTaskMutationResponse => {
  if (isPackageTaskAcceptedResponse(value) || isTaskDtoLike(value)) {
    return value;
  }

  throw new ApiError(
    "Package task response is malformed. Missing task identifier.",
    502,
  );
};

const isTaskDtoLike = (value: unknown): value is TaskDto => {
  const record = readRecord(value);

  return (
    Boolean(record) &&
    typeof record?.id === "string" &&
    typeof record?.status === "string" &&
    typeof record?.nodeId === "string" &&
    typeof record?.type === "string"
  );
};

const isRecordArray = (value: unknown[]): value is Record<string, unknown>[] =>
  value.every((entry) => Boolean(readRecord(entry)));

const extractRecordArray = (
  value: unknown,
  candidateKeys: readonly string[],
  depth = 0,
): Record<string, unknown>[] | null => {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    return isRecordArray(value) ? value : null;
  }

  const record = readRecord(value);
  if (!record || depth >= 3) {
    return null;
  }

  for (const key of candidateKeys) {
    if (!hasOwn(record, key)) {
      continue;
    }

    const nested = extractRecordArray(record[key], candidateKeys, depth + 1);
    if (nested !== null) {
      return nested;
    }
  }

  return null;
};

const parseJsonValue = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const normalizeCancelTaskResponse = (
  taskId: string,
  value: unknown,
): CancelTaskResponse => {
  const record = readRecord(value);
  const rawStatus = readString(record?.status)?.toLowerCase();

  if (
    rawStatus !== "queued" &&
    rawStatus !== "running" &&
    rawStatus !== "success" &&
    rawStatus !== "failed" &&
    rawStatus !== "cancelled"
  ) {
    throw new ApiError("Cancel task response is malformed.", 502);
  }

  return {
    id: readString(record?.id) ?? taskId,
    status: rawStatus,
    cancelRequestedAt: readString(record?.cancelRequestedAt),
    startedAt: readString(record?.startedAt),
    finishedAt: readString(record?.finishedAt),
    updatedAt: readString(record?.updatedAt),
    output: readString(record?.output),
    result: readRecord(record?.result),
  };
};

const normalizeCounterKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .replace(/[\s_\-:/]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^\.|\.$/g, "");

const flattenNumericCounters = (
  input: unknown,
  prefix = "",
  output: Record<string, number> = {},
  depth = 0,
) => {
  if (depth > 8 || input === null || input === undefined) {
    return output;
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    const key = normalizeCounterKey(prefix || "value");
    output[key] = input;
    return output;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => {
      flattenNumericCounters(item, `${prefix}[${index}]`, output, depth + 1);
    });

    return output;
  }

  const record = readRecord(input);
  if (!record) {
    return output;
  }

  Object.entries(record).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenNumericCounters(value, nextPrefix, output, depth + 1);
  });

  return output;
};

const findCounterValue = (counters: Record<string, number>, target: string) => {
  const normalizedTarget = normalizeCounterKey(target);
  const exact = counters[normalizedTarget];
  if (typeof exact === "number") {
    return exact;
  }

  const normalizedTargetTokens = normalizedTarget.split(".").filter(Boolean);

  const fallbackEntry = Object.entries(counters).find(([key]) => {
    const normalizedKey = normalizeCounterKey(key);
    const normalizedKeyTokens = normalizedKey.split(".").filter(Boolean);

    return normalizedTargetTokens.every((token) =>
      normalizedKeyTokens.includes(token),
    );
  });

  return fallbackEntry?.[1];
};

const normalizeTaskFlowDiagnostics = (
  payload: unknown,
  sourcePath: string,
): TaskFlowDiagnostics => {
  const allCounters = flattenNumericCounters(payload);
  const agentCounters: Record<string, number> = {};
  const claimCounters: Record<string, number> = {};

  const metricsIngested = findCounterValue(allCounters, "metrics.ingested");
  if (typeof metricsIngested === "number") {
    agentCounters["metrics.ingested"] = metricsIngested;
  }

  const connectionOpened = findCounterValue(allCounters, "connection.opened");
  if (typeof connectionOpened === "number") {
    agentCounters["connection.opened"] = connectionOpened;
  }

  Object.entries(allCounters).forEach(([key, value]) => {
    if (/(^|\.)claim(s|ed|ing)?(\.|$)/i.test(key)) {
      claimCounters[key] = value;
    }
  });

  return {
    sourcePath,
    fetchedAt: new Date().toISOString(),
    agentCounters,
    claimCounters,
    allCounters,
  };
};

const extractTaskFailureMessage = (task: TaskDto) => {
  const result = readRecord(task.result);

  return (
    readString(result?.message) ??
    readString(result?.error) ??
    readString(result?.detail) ??
    readString(result?.reason) ??
    readString(task.output) ??
    `Task ${task.id} finished with status ${task.status}.`
  );
};

const createAbortError = () => {
  const error = new Error("Request was aborted.");
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};

const sleep = (durationMs: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const handleAbort = () => {
      globalThis.clearTimeout(timeoutId);
      reject(createAbortError());
    };

    const timeoutId = globalThis.setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, durationMs);

    signal?.addEventListener("abort", handleAbort, { once: true });
  });

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

const getTaskDto = (id: string, signal?: AbortSignal) =>
  request<TaskDto>(`/api/proxy/tasks/${id}`, {
    signal,
  });

const waitForTaskCompletion = async (taskId: string, signal?: AbortSignal) => {
  const startedAt = Date.now();

  while (true) {
    throwIfAborted(signal);

    const task = await getTaskDto(taskId, signal);
    if (task.status !== "queued" && task.status !== "running") {
      return task;
    }

    if (Date.now() - startedAt >= ASYNC_PACKAGE_TASK_TIMEOUT_MS) {
      throw new ApiError(
        "Timed out while waiting for the package task to finish.",
        504,
      );
    }

    await sleep(ASYNC_PACKAGE_TASK_POLL_INTERVAL_MS, signal);
  }
};

const resolvePackageCollection = async (
  response: unknown,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> => {
  const directRecords = extractRecordArray(response, PACKAGE_COLLECTION_KEYS);
  if (directRecords !== null) {
    return directRecords;
  }

  const task = isPackageTaskReference(response)
    ? await waitForTaskCompletion(response.taskId, signal)
    : isTaskDtoLike(response)
      ? await waitForTaskCompletion(response.id, signal)
      : null;

  if (!task) {
    throw new ApiError(
      "Package request did not return a supported response shape.",
      502,
    );
  }

  if (task.status !== "success") {
    throw new ApiError(extractTaskFailureMessage(task), 502);
  }

  const taskResultRecords =
    extractRecordArray(task.result, PACKAGE_COLLECTION_KEYS) ??
    extractRecordArray(parseJsonValue(task.output), PACKAGE_COLLECTION_KEYS);

  if (taskResultRecords === null) {
    throw new ApiError(
      "Package task completed without returning package data.",
      502,
    );
  }

  return taskResultRecords;
};

const createNodeLookup = (nodes: NodeDto[]) =>
  new Map(nodes.map((node) => [node.id, node] as const));

const createNodeSummaryLookup = (nodes: NodeSummary[]) =>
  new Map(nodes.map((node) => [node.id, node] as const));

const createMetricsByNodeId = (metrics: MetricDto[]) => {
  const map = new Map<string, MetricDto[]>();

  metrics.forEach((metric) => {
    const current = map.get(metric.nodeId) ?? [];
    current.push(metric);
    current.sort((left, right) =>
      right.recordedAt.localeCompare(left.recordedAt),
    );
    map.set(metric.nodeId, current);
  });

  return map;
};

const filterEventsByQuery = (events: EventRecord[], query?: string) => {
  if (!query?.trim()) {
    return events;
  }

  const normalizedQuery = query.trim().toLowerCase();

  return events.filter((event) =>
    [event.title, event.message, event.sourceLabel, event.type]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
};

export const apiClient = {
  login(payload: LoginPayload) {
    return request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  logout() {
    return request<{ success: true }>("/api/auth/logout", {
      method: "POST",
    });
  },
  getSession() {
    return request<AuthSession>("/api/auth/session");
  },
  getRealtimeToken() {
    return request<{ token: string }>("/api/auth/realtime-token");
  },
  async getTaskFlowDiagnostics(): Promise<TaskFlowDiagnostics> {
    const candidatePaths = [
      "/api/proxy/agent-realtime/stats",
      "/api/proxy/agent-realtime.stats",
      "/api/proxy/diagnostics/agent-realtime",
      "/api/proxy/diagnostics/task-flow",
    ] as const;

    let lastError: unknown = null;

    for (const path of candidatePaths) {
      try {
        const payload = await request<unknown>(path);
        return normalizeTaskFlowDiagnostics(payload, path);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new ApiError("Diagnostics endpoint was not found.", 404);
  },
  getCurrentUser() {
    return request<UserDto>("/api/proxy/users/me");
  },
  getUsers() {
    return request<UserDto[]>("/api/proxy/users");
  },
  createUser(payload: CreateUserPayload) {
    return request<UserDto>("/api/proxy/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getNodes(filters?: NodeFilters) {
    return request<NodeDto[]>(
      `/api/proxy/nodes${buildQueryString({
        status: filters?.status,
        search: filters?.search,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  createNode(payload: CreateNodePayload) {
    return request<NodeDto>("/api/proxy/nodes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getScheduledTasks() {
    return request<ScheduledTaskDto[]>("/api/proxy/scheduled-tasks");
  },
  createScheduledTask(payload: CreateScheduledTaskPayload) {
    return request<ScheduledTaskDto>("/api/proxy/scheduled-tasks", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        timezone: payload.timezone ?? "UTC",
      }),
    });
  },
  updateScheduledTask(id: string, payload: { enabled: boolean }) {
    return request<ScheduledTaskDto>(`/api/proxy/scheduled-tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteScheduledTask(id: string) {
    return request<DeleteScheduledTaskResponse>(
      `/api/proxy/scheduled-tasks/${id}`,
      {
        method: "DELETE",
      },
    );
  },
  finalizeNodeEnrollment(token: string, payload: FinalizeEnrollmentPayload) {
    return request<FinalizeEnrollmentResponse>(
      `/api/proxy/enrollments/${encodeURIComponent(token)}/finalize`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  checkEnrollmentStatus(token: string) {
    return request<EnrollmentStatusResponse>(
      `/api/proxy/enrollments/${encodeURIComponent(token)}`,
    );
  },
  getNode(id: string) {
    return request<NodeDto>(`/api/proxy/nodes/${id}`);
  },
  async getNodePackages(
    nodeId: string,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<InstalledPackage[]> {
    const response = await request<unknown>(
      `/api/proxy/nodes/${nodeId}/packages`,
      {
        signal: options?.signal,
      },
    );
    const packages = await resolvePackageCollection(response, options?.signal);

    return packages.map(mapInstalledPackage);
  },
  async searchPackages(
    term: string,
    nodeId: string,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<PackageSearchResult[]> {
    const response = await request<unknown>(
      `/api/proxy/packages/search${buildQueryString({
        term,
        nodeId,
      })}`,
      {
        signal: options?.signal,
      },
    );
    const packages = await resolvePackageCollection(response, options?.signal);

    return packages.map(mapPackageSearchResult);
  },
  async installPackages({
    nodeId,
    names,
    purge,
  }: InstallPackagesPayload): Promise<PackageTaskMutationResponse> {
    const response = await request<unknown>(
      `/api/proxy/nodes/${nodeId}/packages`,
      {
        method: "POST",
        body: JSON.stringify({
          names,
          ...(purge !== undefined ? { purge } : {}),
        }),
      },
    );

    return normalizePackageTaskMutationResponse(response);
  },
  async removeNodePackage({
    nodeId,
    name,
    purge,
  }: RemovePackagePayload): Promise<PackageTaskMutationResponse> {
    const response = await request<unknown>(
      `/api/proxy/nodes/${nodeId}/packages/${encodeURIComponent(name)}${buildQueryString(
        {
          purge: purge !== undefined ? String(purge) : undefined,
        },
      )}`,
      {
        method: "DELETE",
      },
    );

    return normalizePackageTaskMutationResponse(response);
  },
  deleteNode(id: string) {
    return request<DeleteNodeResponse>(`/api/proxy/nodes/${id}`, {
      method: "DELETE",
    });
  },
  getTasks(filters?: TaskFilters) {
    return request<TaskDto[]>(
      `/api/proxy/tasks${buildQueryString({
        nodeId: filters?.nodeId,
        status: filters?.status,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  createTask(payload: CreateTaskPayload) {
    return request<TaskDto>("/api/proxy/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async cancelTask(
    taskId: string,
    payload?: CancelTaskPayload,
  ): Promise<CancelTaskResponse> {
    const response = await request<unknown>(
      `/api/proxy/tasks/${taskId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: payload?.reason?.trim() ?? "",
        }),
      },
    );

    return normalizeCancelTaskResponse(taskId, response);
  },
  getTask(id: string) {
    return getTaskDto(id);
  },
  getTaskLogs(id: string, filters?: TaskLogFilters) {
    return request<TaskLogDto[]>(
      `/api/proxy/tasks/${id}/logs${buildQueryString({
        limit: filters?.limit,
      })}`,
    );
  },
  getEvents(filters?: EventFilters) {
    return request<EventDto[]>(
      `/api/proxy/events${buildQueryString({
        nodeId: filters?.nodeId,
        type: filters?.type,
        severity: filters?.severity === "all" ? undefined : filters?.severity,
        limit: filters?.limit,
      })}`,
    );
  },
  getMetrics(filters?: MetricFilters) {
    return request<MetricDto[]>(
      `/api/proxy/metrics${buildQueryString({
        nodeId: filters?.nodeId,
        limit: filters?.limit,
      })}`,
    );
  },
  async getDashboardOverview(): Promise<DashboardOverview> {
    const [nodes, tasks, events, metrics] = await Promise.all([
      this.getNodes({ limit: 100 }),
      this.getTasks({ limit: 100 }),
      this.getEvents({ limit: 12 }),
      this.getMetrics({ limit: 100 }),
    ]);

    const metricsByNodeId = createMetricsByNodeId(metrics);
    const nodeSummaries = nodes.map((node) =>
      mapNodeSummary(node, metricsByNodeId),
    );
    const nodeLookup = createNodeLookup(nodes);
    const taskSummaries = tasks.map((task) => mapTaskSummary(task, nodeLookup));
    const eventRecords = events.map(mapEventRecord);

    return buildDashboardOverview({
      nodes: nodeSummaries,
      tasks: taskSummaries,
      events: eventRecords,
      metrics,
    });
  },
  async getNodeSummaries(filters?: NodeFilters): Promise<NodeSummary[]> {
    const [nodes, metrics] = await Promise.all([
      this.getNodes(filters),
      this.getMetrics({ limit: 100 }),
    ]);

    const metricsByNodeId = createMetricsByNodeId(metrics);
    return nodes.map((node) => mapNodeSummary(node, metricsByNodeId));
  },
  async getNodeDetail(id: string): Promise<NodeDetail> {
    const [node, metrics, tasks, events] = await Promise.all([
      this.getNode(id),
      this.getMetrics({ nodeId: id, limit: 24 }),
      this.getTasks({ nodeId: id, limit: 50 }),
      this.getEvents({ nodeId: id, limit: 20 }),
    ]);

    const runningTasks = tasks.filter(
      (task) => task.status.toLowerCase() === "running",
    );

    const nodeSummary = mapNodeSummary(node, createMetricsByNodeId(metrics));
    const nodeLookup = createNodeSummaryLookup([nodeSummary]);

    return buildNodeDetail({
      node: nodeSummary,
      metrics,
      events,
      tasks: runningTasks,
      nodeLookup,
    });
  },
  async getTaskSummaries(filters?: TaskFilters): Promise<TaskSummary[]> {
    const [tasks, nodes] = await Promise.all([
      this.getTasks(filters),
      this.getNodes({ limit: 100 }),
    ]);

    const nodeLookup = createNodeLookup(nodes);
    return tasks.map((task) => mapTaskSummary(task, nodeLookup));
  },
  async getScheduledTaskSummaries(): Promise<ScheduledTaskSummary[]> {
    const [scheduledTasks, nodes] = await Promise.all([
      this.getScheduledTasks(),
      this.getNodes({ limit: 100 }),
    ]);

    const nodeLookup = createNodeLookup(nodes);
    return scheduledTasks.map((task) => mapScheduledTaskSummary(task, nodeLookup));
  },
  async getTaskDetail(id: string): Promise<TaskDetail> {
    const task = await this.getTask(id);

    const [node, metrics, logs, events] = await Promise.all([
      this.getNode(task.nodeId),
      this.getMetrics({ nodeId: task.nodeId, limit: 1 }),
      this.getTaskLogs(id, { limit: 100 }),
      this.getEvents({ nodeId: task.nodeId, limit: 50 }),
    ]);

    const nodeSummary = mapNodeSummary(node, createMetricsByNodeId(metrics));
    const nodeLookup = createNodeSummaryLookup([nodeSummary]);

    return buildTaskDetail({
      task,
      node: nodeSummary,
      logs,
      events,
      nodeLookup,
    });
  },
  async getTaskLogLines(id: string, filters?: TaskLogFilters) {
    return (await this.getTaskLogs(id, filters)).map((log) => ({
      id: log.id,
      taskId: log.taskId,
      timestamp: log.timestamp ?? log.createdAt,
      level: log.level,
      message: log.message,
    }));
  },
  async getEventRecords(filters?: EventFilters) {
    const events = await this.getEvents(filters);
    return filterEventsByQuery(events.map(mapEventRecord), filters?.query);
  },
};

export { ApiError };
