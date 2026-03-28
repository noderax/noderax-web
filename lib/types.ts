export type NodeStatus = "online" | "offline";
export type TaskStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "cancelled";
export type ScheduledTaskCadence =
  | "minutely"
  | "custom"
  | "hourly"
  | "daily"
  | "weekly";
export type EventSeverity = "info" | "warning" | "critical";
export type TaskLogLevel = "info" | "stdout" | "stderr" | "error";
export type UserRole = "platform_admin" | "user";
export type WorkspaceMembershipRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";
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
  workspaceId: string;
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
  workspaceId: string;
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

export interface ScheduledTaskDto {
  id: string;
  workspaceId: string;
  nodeId: string;
  ownerUserId: string | null;
  ownerName: string | null;
  isLegacy: boolean;
  name: string;
  command: string;
  cadence: ScheduledTaskCadence;
  minute: number;
  hour: number | null;
  dayOfWeek: number | null;
  intervalMinutes: number | null;
  timezone: string;
  timezoneSource: "workspace" | "legacy_fixed";
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastRunTaskId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PackageTaskAcceptedResponse {
  taskId: string;
  taskStatus: string;
  nodeId: string;
  operation: string;
  names: string[];
  purge: boolean | null;
  term: string | null;
}

export type PackageTaskMutationResponse = PackageTaskAcceptedResponse | TaskDto;

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
  workspaceId: string;
  nodeId: string | null;
  type: string;
  severity: EventSeverity;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface MetricDto {
  id: string;
  workspaceId: string;
  nodeId: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  temperature: number | null;
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
  timezone: string;
  inviteStatus: "pending" | "accepted" | "revoked";
  lastInvitedAt: string | null;
  activatedAt: string | null;
  criticalEventEmailsEnabled: boolean;
  enrollmentEmailsEnabled: boolean;
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

export type SetupMode = "setup" | "restart_required" | "installed" | "legacy";
export type SetupApiUrlSource = "cookie" | "env" | "missing";

export interface SetupApiConfigResponse {
  apiUrl: string | null;
  source: SetupApiUrlSource;
}

export interface UpdateSetupApiConfigPayload {
  apiUrl: string;
}

export interface SetupStateDirectoryStatus {
  path: string;
  configuredValue: string | null;
  usingCustomPath: boolean;
  writable: boolean;
  error: string | null;
}

export interface SetupStatusResponse {
  mode: SetupMode;
  installed: boolean;
  restartRequired: boolean;
  stateDirectory: SetupStateDirectoryStatus;
}

export interface ValidatePostgresSetupPayload {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
}

export interface ValidatePostgresSetupResponse {
  success: true;
  serverVersion: string;
  databaseEmpty: boolean;
}

export interface ValidateRedisSetupPayload {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export interface ValidateRedisSetupResponse {
  success: true;
}

export interface MailSettingsPayload {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  webAppUrl: string;
}

export type ValidateSmtpPayload = MailSettingsPayload;

export interface ValidateSmtpResponse {
  success: true;
}

export interface SetupInstallPayload {
  postgres: ValidatePostgresSetupPayload;
  redis: ValidateRedisSetupPayload;
  admin: {
    name: string;
    email: string;
    password: string;
  };
  workspace: {
    name: string;
    slug: string;
    defaultTimezone: string;
  };
  mail: MailSettingsPayload;
}

export interface SetupInstallResponse {
  success: true;
  restartRequired: true;
}

export interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  temperature: number | null;
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
  scheduleId: string | null;
  scheduleName: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
  exitCode: number | null;
  lastOutput: string | null;
}

export interface ScheduledTaskSummary extends ScheduledTaskDto {
  nodeName: string;
  frequencyLabel: string;
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
  architecture?: string;
  description?: string;
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
  timezone: string;
  inviteStatus: "pending" | "accepted" | "revoked";
  lastInvitedAt: string | null;
  activatedAt: string | null;
  criticalEventEmailsEnabled: boolean;
  enrollmentEmailsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  scopes: string[];
  expiresAt: string | null;
  tokenPreview: string;
}

export interface WorkspaceDto {
  id: string;
  name: string;
  slug: string;
  defaultTimezone: string;
  createdByUserId: string | null;
  isArchived: boolean;
  isDefault: boolean;
  currentUserRole?: WorkspaceMembershipRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMembershipDto {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMembershipRole;
  userName?: string | null;
  userEmail?: string | null;
  userIsActive?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMembershipDto {
  id: string;
  teamId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userIsActive?: boolean | null;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  role?: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface DeleteUserResponse {
  deleted: true;
  id: string;
}

export interface ResendUserInviteResponse {
  sent: true;
  userId: string;
  expiresAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  slug: string;
  defaultTimezone?: string;
  isArchived?: boolean;
  isDefault?: boolean;
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
  defaultTimezone?: string;
  isArchived?: boolean;
  isDefault?: boolean;
}

export interface CreateWorkspaceMemberPayload {
  userId: string;
  role: WorkspaceMembershipRole;
}

export interface UpdateWorkspaceMemberPayload {
  role: WorkspaceMembershipRole;
}

export interface CreateTeamPayload {
  name: string;
  description?: string;
}

export interface UpdateTeamPayload {
  name?: string;
  description?: string;
}

export interface AddTeamMemberPayload {
  userId: string;
}

export interface AssignableUserDto {
  id: string;
  name: string;
  email: string;
}

export interface WorkspaceSearchHitDto {
  id: string;
  title: string;
  subtitle: string | null;
}

export interface WorkspaceSearchResponseDto {
  nodes: WorkspaceSearchHitDto[];
  tasks: WorkspaceSearchHitDto[];
  scheduledTasks: WorkspaceSearchHitDto[];
  events: WorkspaceSearchHitDto[];
  members: WorkspaceSearchHitDto[];
  teams: WorkspaceSearchHitDto[];
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

export interface CreateBatchTaskPayload {
  nodeIds: string[];
  type: string;
  payload?: Record<string, unknown>;
}

export interface CreateScheduledTaskPayload {
  nodeId: string;
  name: string;
  command: string;
  cadence: ScheduledTaskCadence;
  minute: number;
  hour?: number;
  dayOfWeek?: number;
  intervalMinutes?: number;
}

export interface CreateBatchScheduledTaskPayload {
  nodeIds: string[];
  name: string;
  command: string;
  cadence: ScheduledTaskCadence;
  minute: number;
  hour?: number;
  dayOfWeek?: number;
  intervalMinutes?: number;
}

export interface UpdateScheduledTaskPayload {
  enabled: boolean;
}

export interface UpdateUserPreferencesPayload {
  timezone?: string;
  criticalEventEmailsEnabled?: boolean;
  enrollmentEmailsEnabled?: boolean;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface InvitationPreviewDto {
  email: string;
  name: string;
  expiresAt: string;
}

export interface AcceptInvitationPayload {
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface PasswordResetPreviewDto {
  email: string;
  expiresAt: string;
}

export interface ResetPasswordPayload {
  password: string;
}

export interface PlatformAppSettings {
  corsOrigin: string;
  swaggerEnabled: boolean;
  swaggerPath: string;
}

export interface PlatformDatabaseSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  ssl: boolean;
}

export interface PlatformRedisSettings {
  enabled: boolean;
  url: string;
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
}

export interface PlatformAuthSettings {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptSaltRounds: number;
}

export interface PlatformAgentSettings {
  heartbeatTimeoutSeconds: number;
  offlineCheckIntervalSeconds: number;
  realtimePingTimeoutSeconds: number;
  realtimePingCheckIntervalSeconds: number;
  taskClaimLeaseSeconds: number;
  staleTaskCheckIntervalSeconds: number;
  staleQueuedTaskTimeoutSeconds: number;
  staleRunningTaskTimeoutSeconds: number;
  enableRealtimeTaskDispatch: boolean;
  enrollmentToken: string;
  highCpuThreshold: number;
}

export interface PlatformMailSettings extends MailSettingsPayload {}

export interface PlatformSettingsValues {
  app: PlatformAppSettings;
  database: PlatformDatabaseSettings;
  redis: PlatformRedisSettings;
  auth: PlatformAuthSettings;
  mail: PlatformMailSettings;
  agents: PlatformAgentSettings;
}

export type PlatformSettingsSource = "install_state" | "process_env";

export interface PlatformSettingsResponse extends PlatformSettingsValues {
  source: PlatformSettingsSource;
  editable: boolean;
  restartRequired: boolean;
  message: string | null;
}

export type UpdatePlatformSettingsPayload = PlatformSettingsValues;

export interface CancelTaskPayload {
  reason?: string;
}

export interface CancelTaskResponse {
  id: string;
  status: TaskStatus;
  cancelRequestedAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string | null;
  output: string | null;
  result: Record<string, unknown> | null;
}

export interface InstallPackagesPayload {
  workspaceId?: string;
  nodeId: string;
  names: string[];
  purge?: boolean;
}

export interface RemovePackagePayload {
  workspaceId?: string;
  nodeId: string;
  name: string;
  purge?: boolean;
}

export interface TaskFlowDiagnostics {
  sourcePath: string;
  fetchedAt: string;
  agentCounters: Record<string, number>;
  claimCounters: Record<string, number>;
  allCounters: Record<string, number>;
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

export interface DeleteWorkspaceResponse {
  deleted: true;
  id: string;
  slug: string;
}

export interface DeleteScheduledTaskResponse {
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
