export type NodeStatus = "online" | "offline";
export type TaskStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled";
export type EventSeverity = "info" | "warning" | "critical";
export type TaskLogLevel = "info" | "stdout" | "stderr" | "error";
export type UserRole = "admin" | "user";
export type EnrollmentStatus = "pending" | "approved" | "revoked";
export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "degraded"
  | "reconnecting"
  | "disconnected";

export interface RealtimeEventMeta {
  sequence?: number | null;
  sourceInstance?: string | null;
}

export interface RealtimeHealthSnapshot {
  status: RealtimeStatus;
  lastEventAt: string | null;
  lastHeartbeatAt: string | null;
  eventAgeMs: number | null;
  degradedReason: string | null;
}

export interface RealtimeCounters {
  reconnectAttempts: number;
  reconnectSuccesses: number;
  droppedStaleEvents: number;
  droppedDuplicateEvents: number;
  metricQueueDepth: number;
  metricQueueHighWaterMark: number;
  metricFlushCount: number;
  metricDroppedFrames: number;
}

export interface NodeDto {
  id: string;
  name: string;
  hostname: string;
  os: string;
  arch: string;
  status: NodeStatus;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDto {
  id: string;
  nodeId: string;
  type: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  result: Record<string, unknown> | null;
  output: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskLogDto {
  id: string;
  taskId: string;
  level: TaskLogLevel;
  message: string;
  timestamp: string | null;
  createdAt: string;
}

export interface EventDto {
  id: string;
  nodeId: string | null;
  type: string;
  severity: EventSeverity;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MetricDto {
  id: string;
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkStats: Record<string, unknown>;
  recordedAt: string;
  sequence?: number;
  sourceInstance?: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseDto {
  accessToken?: string;
  token?: string;
  expiresIn?: string;
  expiresAt?: string;
  user?: UserDto;
}

export interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
}

export interface NodeSummary {
  id: string;
  name: string;
  hostname: string;
  status: NodeStatus;
  lastSeenAt: string | null;
  os: string;
  arch: string;
  createdAt: string;
  updatedAt: string;
  latestMetric: MetricPoint | null;
}

export interface NodeDetail extends NodeSummary {
  metrics: MetricPoint[];
  recentEvents: EventRecord[];
  runningTasks: TaskSummary[];
  networkStats: Record<string, unknown> | null;
}

export interface TaskSummary {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  nodeId: string;
  nodeName: string;
  command: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
  exitCode: number | null;
  lastOutput: string | null;
}

export interface TaskLogLine {
  id: string;
  taskId: string;
  timestamp: string;
  level: TaskLogLevel;
  message: string;
}

export interface TaskDetail extends TaskSummary {
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  node: NodeSummary | null;
  logs: TaskLogLine[];
  relatedEvents: EventRecord[];
}

export interface InstalledPackage {
  name: string;
  version: string;
  status: string;
}

export interface PackageSearchResult {
  name: string;
  version: string;
  description: string;
}

export interface EventRecord {
  id: string;
  type: string;
  severity: EventSeverity;
  title: string;
  message: string;
  createdAt: string;
  sourceLabel: string;
  entityType: "node" | "task" | "system";
  entityId?: string;
  nodeId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  scopes: string[];
  expiresAt: string | null;
  tokenPreview: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface CreateNodePayload {
  name?: string;
  hostname: string;
  os: string;
  arch: string;
}

export interface CreateTaskPayload {
  nodeId: string;
  type: string;
  payload?: Record<string, unknown>;
}

export interface InstallPackagesPayload {
  nodeId: string;
  names: string[];
  purge?: boolean;
}

export interface RemovePackagePayload {
  nodeId: string;
  name: string;
  purge?: boolean;
}

export interface FinalizeEnrollmentPayload {
  email: string;
  nodeName: string;
  description?: string;
}

export interface FinalizeEnrollmentResponse {
  nodeId: string;
  agentToken: string;
}

export interface EnrollmentStatusResponse {
  status: EnrollmentStatus;
  nodeId?: string | null;
  agentToken?: string | null;
  expiresAt?: string | null;
}

export interface DeleteNodeResponse {
  deleted: true;
  id: string;
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

export interface NodeFilters {
  status?: NodeStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TaskFilters {
  nodeId?: string;
  status?: TaskStatus;
  limit?: number;
  offset?: number;
}

export interface TaskLogFilters {
  limit?: number;
}

export interface EventFilters {
  nodeId?: string;
  type?: string;
  severity?: EventSeverity | "all";
  limit?: number;
  query?: string;
}

export interface MetricFilters {
  nodeId?: string;
  limit?: number;
}
