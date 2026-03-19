import {
  buildDashboardOverview,
  buildNodeDetail,
  buildTaskDetail,
  mapEventRecord,
  mapInstalledPackage,
  mapNodeSummary,
  mapPackageSearchResult,
  mapTaskSummary,
} from "@/lib/noderax";
import type {
  AuthSession,
  CreateNodePayload,
  CreateTaskPayload,
  CreateUserPayload,
  DashboardOverview,
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
  InstalledPackage,
  RemovePackagePayload,
  TaskDetail,
  TaskDto,
  TaskFilters,
  TaskLogDto,
  TaskLogFilters,
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

const createNodeLookup = (nodes: NodeDto[]) =>
  new Map(nodes.map((node) => [node.id, node] as const));

const createNodeSummaryLookup = (nodes: NodeSummary[]) =>
  new Map(nodes.map((node) => [node.id, node] as const));

const createMetricsByNodeId = (metrics: MetricDto[]) => {
  const map = new Map<string, MetricDto[]>();

  metrics.forEach((metric) => {
    const current = map.get(metric.nodeId) ?? [];
    current.push(metric);
    current.sort((left, right) => right.recordedAt.localeCompare(left.recordedAt));
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
  async getNodePackages(nodeId: string): Promise<InstalledPackage[]> {
    const packages = await request<Record<string, unknown>[]>(
      `/api/proxy/nodes/${nodeId}/packages`,
    );

    return packages.map(mapInstalledPackage);
  },
  async searchPackages(
    term: string,
    nodeId: string,
  ): Promise<PackageSearchResult[]> {
    const packages = await request<Record<string, unknown>[]>(
      `/api/proxy/packages/search${buildQueryString({
        term,
        nodeId,
      })}`,
    );

    return packages.map(mapPackageSearchResult);
  },
  installPackages({
    nodeId,
    names,
    purge,
  }: InstallPackagesPayload) {
    return request<TaskDto>(`/api/proxy/nodes/${nodeId}/packages`, {
      method: "POST",
      body: JSON.stringify({
        names,
        ...(purge !== undefined ? { purge } : {}),
      }),
    });
  },
  removeNodePackage({
    nodeId,
    name,
    purge,
  }: RemovePackagePayload) {
    return request<TaskDto>(
      `/api/proxy/nodes/${nodeId}/packages/${encodeURIComponent(name)}${buildQueryString({
        purge: purge !== undefined ? String(purge) : undefined,
      })}`,
      {
        method: "DELETE",
      },
    );
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
  getTask(id: string) {
    return request<TaskDto>(`/api/proxy/tasks/${id}`);
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
    const nodeSummaries = nodes.map((node) => mapNodeSummary(node, metricsByNodeId));
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
      this.getTasks({ nodeId: id, status: "running", limit: 20 }),
      this.getEvents({ nodeId: id, limit: 20 }),
    ]);

    const nodeSummary = mapNodeSummary(node, createMetricsByNodeId(metrics));
    const nodeLookup = createNodeSummaryLookup([nodeSummary]);

    return buildNodeDetail({
      node: nodeSummary,
      metrics,
      events,
      tasks,
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
