export type NodeStatus = "online" | "offline";
export type TaskStatus = "pending" | "running" | "success" | "failed";
export type EventSeverity = "info" | "warning" | "critical";
export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

export interface NodeSummary {
  id: string;
  name: string;
  status: NodeStatus;
  lastHeartbeat: string;
  os: string;
  arch: string;
  region: string;
  version: string;
  uptimeHours: number;
  agentCount: number;
  avgCpuLoad: number;
}

export interface NodeDetail extends NodeSummary {
  hostname: string;
  kernel: string;
  ipAddress: string;
  tags: string[];
  metrics: MetricPoint[];
  runningTasks: TaskSummary[];
  events: EventRecord[];
}

export interface TaskSummary {
  id: string;
  name: string;
  status: TaskStatus;
  nodeId: string;
  nodeName: string;
  command: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  exitCode?: number | null;
  progress: number;
}

export interface TaskLogLine {
  id: string;
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
}

export interface TaskDetail extends TaskSummary {
  operator: string;
  image: string;
  retries: number;
  workingDirectory: string;
  logs: TaskLogLine[];
  events: EventRecord[];
}

export interface EventRecord {
  id: string;
  type: string;
  severity: EventSeverity;
  title: string;
  message: string;
  createdAt: string;
  source: string;
  entityType: "node" | "task" | "system";
  entityId?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface AuthSession {
  user: AuthUser;
  scopes: string[];
  expiresAt: string;
  tokenPreview: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export interface DashboardOverview {
  totals: {
    totalNodes: number;
    onlineNodes: number;
    runningTasks: number;
    failedTasks: number;
  };
  metricSeries: MetricPoint[];
  recentEvents: EventRecord[];
  nodes: NodeSummary[];
  tasks: TaskSummary[];
}
