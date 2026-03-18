import { mockApi } from "@/lib/mock-data";
import type {
  AuthSession,
  DashboardOverview,
  EventRecord,
  LoginPayload,
  MetricPoint,
  NodeDetail,
  NodeSummary,
  TaskDetail,
  TaskSummary,
} from "@/lib/types";

const shouldUseMockData = () =>
  process.env.NEXT_PUBLIC_NODERAX_USE_MOCKS === "true" ||
  !process.env.NEXT_PUBLIC_NODERAX_API_URL;

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

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new ApiError(payload || "Request failed", response.status);
  }

  return (await response.json()) as T;
};

const aggregateMetrics = (nodes: NodeDetail[]): MetricPoint[] => {
  if (!nodes.length) {
    return [];
  }

  return Array.from({ length: nodes[0]?.metrics.length ?? 0 }, (_, index) => {
    const current = nodes.map((node) => node.metrics[index]).filter(Boolean);

    return {
      timestamp: current[0]?.timestamp ?? new Date().toISOString(),
      cpu: Math.round(current.reduce((sum, point) => sum + point.cpu, 0) / current.length),
      memory: Math.round(
        current.reduce((sum, point) => sum + point.memory, 0) / current.length,
      ),
      disk: Math.round(current.reduce((sum, point) => sum + point.disk, 0) / current.length),
    };
  });
};

export const apiClient = {
  async login(payload: LoginPayload) {
    return request<AuthSession>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  async logout() {
    return request<{ success: true }>("/api/auth/logout", {
      method: "POST",
    });
  },
  async getSession() {
    if (shouldUseMockData()) {
      return mockApi.getSession();
    }

    return request<AuthSession>("/api/auth/session");
  },
  async getNodes() {
    if (shouldUseMockData()) {
      return mockApi.getNodes();
    }

    return request<NodeSummary[]>("/api/proxy/nodes");
  },
  async getNode(id: string) {
    if (shouldUseMockData()) {
      return mockApi.getNode(id);
    }

    return request<NodeDetail>(`/api/proxy/nodes/${id}`);
  },
  async getTasks() {
    if (shouldUseMockData()) {
      return mockApi.getTasks();
    }

    return request<TaskSummary[]>("/api/proxy/tasks");
  },
  async getTask(id: string) {
    if (shouldUseMockData()) {
      return mockApi.getTask(id);
    }

    return request<TaskDetail>(`/api/proxy/tasks/${id}`);
  },
  async getEvents(filters?: { severity?: string; query?: string }) {
    if (shouldUseMockData()) {
      const data = await mockApi.getEvents();
      return data.filter((event) => {
        const matchesSeverity =
          !filters?.severity || filters.severity === "all"
            ? true
            : event.severity === filters.severity;
        const matchesQuery = filters?.query
          ? [event.title, event.message, event.source]
              .join(" ")
              .toLowerCase()
              .includes(filters.query.toLowerCase())
          : true;

        return matchesSeverity && matchesQuery;
      });
    }

    return request<EventRecord[]>(
      `/api/proxy/events${buildQueryString({
        severity: filters?.severity,
        query: filters?.query,
      })}`,
    );
  },
  async getDashboardOverview(): Promise<DashboardOverview> {
    if (shouldUseMockData()) {
      return mockApi.getDashboardOverview();
    }

    const [nodes, tasks, events] = await Promise.all([
      this.getNodes(),
      this.getTasks(),
      this.getEvents(),
    ]);

    const detailedNodes = await Promise.all(
      nodes.slice(0, 4).map((node) => this.getNode(node.id)),
    );

    return {
      totals: {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter((node) => node.status === "online").length,
        runningTasks: tasks.filter((task) => task.status === "running").length,
        failedTasks: tasks.filter((task) => task.status === "failed").length,
      },
      metricSeries: aggregateMetrics(detailedNodes),
      recentEvents: events.slice(0, 5),
      nodes,
      tasks,
    };
  },
};

export { ApiError };
