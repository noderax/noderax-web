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
export type NodeInstallStatus =
  | "pending"
  | "installing"
  | "completed"
  | "failed"
  | "expired";
export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "degraded"
  | "reconnecting"
  | "disconnected";
export type RootAccessProfile =
  | "off"
  | "operational"
  | "task"
  | "terminal"
  | "all";
export type RootAccessSyncStatus = "pending" | "applied" | "failed";
export type RootScope = "task" | "operational";

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
  teamId?: string | null;
  teamName?: string | null;
  maintenanceMode?: boolean;
  rootAccessProfile: RootAccessProfile;
  rootAccessAppliedProfile: RootAccessProfile;
  rootAccessSyncStatus: RootAccessSyncStatus;
  rootAccessUpdatedAt?: string | null;
  rootAccessUpdatedByUserId?: string | null;
  rootAccessLastAppliedAt?: string | null;
  rootAccessLastError?: string | null;
  maintenanceReason?: string | null;
  maintenanceStartedAt?: string | null;
  maintenanceByUserId?: string | null;
  agentVersion?: string | null;
  platformVersion?: string | null;
  kernelVersion?: string | null;
  lastVersionReportedAt?: string | null;
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
  targetTeamId?: string | null;
  targetTeamName?: string | null;
  templateId?: string | null;
  templateName?: string | null;
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
  nodeId: string | null;
  targetTeamId?: string | null;
  targetTeamName?: string | null;
  templateId?: string | null;
  templateName?: string | null;
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

export interface NodeInstallDto {
  installId: string;
  workspaceId: string;
  teamId?: string | null;
  nodeName: string;
  description?: string | null;
  hostname?: string | null;
  nodeId?: string | null;
  status: NodeInstallStatus;
  stage: string;
  progressPercent: number;
  statusMessage?: string | null;
  startedAt?: string | null;
  consumedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MetricDto {
  id: string;
  workspaceId: string;
  nodeId: string;
  agentVersion?: string | null;
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
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseDto {
  accessToken?: string;
  token?: string;
  expiresIn?: string;
  expiresAt?: string;
  user?: UserDto;
  requiresMfa?: boolean;
  mfaChallengeToken?: string;
  redirectPath?: string | null;
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
  workspaceId: string;
  name: string;
  hostname: string;
  status: NodeStatus;
  teamId?: string | null;
  teamName?: string | null;
  maintenanceMode?: boolean;
  rootAccessProfile: RootAccessProfile;
  rootAccessAppliedProfile: RootAccessProfile;
  rootAccessSyncStatus: RootAccessSyncStatus;
  rootAccessUpdatedAt?: string | null;
  rootAccessUpdatedByUserId?: string | null;
  rootAccessLastAppliedAt?: string | null;
  rootAccessLastError?: string | null;
  maintenanceReason?: string | null;
  agentVersion?: string | null;
  platformVersion?: string | null;
  kernelVersion?: string | null;
  lastVersionReportedAt?: string | null;
  lastSeenAt: string | null;
  os: string;
  arch: string;
  createdAt: string;
  updatedAt: string;
  latestMetric: MetricPoint | null;
}

export type AgentReleaseChannel = "tag";

export interface AgentReleaseArtifact {
  binaryUrl: string;
  sha256: string;
}

export interface AgentReleaseArtifacts {
  amd64?: AgentReleaseArtifact;
  arm64?: AgentReleaseArtifact;
}

export interface AgentReleaseNotesSection {
  title: string;
  items: string[];
}

export interface AgentRelease {
  version: string;
  publishedAt: string;
  commit: string;
  channel: AgentReleaseChannel;
  notes: AgentReleaseNotesSection[];
  artifacts: AgentReleaseArtifacts;
}

export type AgentUpdateRolloutStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export type AgentUpdateTargetStatus =
  | "pending"
  | "dispatched"
  | "downloading"
  | "verifying"
  | "installing"
  | "restarting"
  | "waiting_for_reconnect"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

export interface AgentUpdateRolloutTarget {
  id: string;
  rolloutId: string;
  nodeId: string;
  workspaceId: string;
  teamId: string | null;
  nodeNameSnapshot: string;
  previousVersion: string | null;
  targetVersion: string;
  status: AgentUpdateTargetStatus;
  progressPercent: number;
  statusMessage: string | null;
  taskId: string | null;
  sequence: number;
  dispatchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentUpdateRolloutCounts {
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  active: number;
  pending: number;
}

export interface AgentUpdateRollout {
  id: string;
  targetVersion: string;
  status: AgentUpdateRolloutStatus;
  rollback: boolean;
  requestedByUserId: string | null;
  requestedByEmailSnapshot: string | null;
  statusMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  counts: AgentUpdateRolloutCounts;
  targets: AgentUpdateRolloutTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentUpdateSummary {
  latestRelease: AgentRelease | null;
  outdatedNodeCount: number;
  eligibleOutdatedNodeCount: number;
  activeRollout: AgentUpdateRollout | null;
  releaseCheckedAt: string | null;
}

export interface CreateAgentUpdateRolloutPayload {
  nodeIds: string[];
  version?: string;
  rollback?: boolean;
}

export interface NodeDetail extends NodeSummary {
  metrics: MetricPoint[];
  recentEvents: EventRecord[];
  runningTasks: TaskSummary[];
  networkStats: Record<string, unknown> | null;
}

export type TerminalSessionStatus =
  | "pending"
  | "open"
  | "closed"
  | "failed"
  | "terminating";

export type TerminalTranscriptDirection =
  | "stdin"
  | "stdout"
  | "stderr"
  | "system";

export interface TerminalSession {
  id: string;
  workspaceId: string;
  nodeId: string;
  createdByUserId: string | null;
  createdByEmailSnapshot: string | null;
  status: TerminalSessionStatus;
  openedAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
  exitCode: number | null;
  cols: number;
  rows: number;
  runAsRoot: boolean;
  retentionExpiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TerminalTranscriptChunk {
  id: string;
  sessionId: string;
  direction: TerminalTranscriptDirection;
  encoding: string;
  payload: string;
  seq: number;
  sourceTimestamp?: string | null;
  createdAt: string;
}

export interface CreateTerminalSessionPayload {
  cols?: number;
  rows?: number;
  runAsRoot?: boolean;
}

export interface TerminateTerminalSessionPayload {
  reason?: string;
}

export interface TaskSummary {
  id: string;
  name: string;
  type: string;
  status: TaskStatus;
  nodeId: string;
  targetTeamId?: string | null;
  targetTeamName?: string | null;
  templateId?: string | null;
  templateName?: string | null;
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
  mfaEnabled: boolean;
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
  automationEmailEnabled: boolean;
  automationTelegramEnabled: boolean;
  automationTelegramBotToken: string | null;
  automationTelegramChatId: string | null;
  automationEmailLevels: EventSeverity[];
  automationTelegramLevels: EventSeverity[];
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

export interface VerifyMfaChallengePayload {
  challengeToken: string;
  token: string;
  remember?: boolean;
}

export interface VerifyMfaRecoveryPayload {
  challengeToken: string;
  recoveryCode: string;
  remember?: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  otpauthUrl: string;
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
  recoveryCodes?: string[] | null;
}

export interface DeleteMfaPayload {
  token: string;
}

export interface RegenerateMfaRecoveryCodesPayload {
  token: string;
}

export interface AuthProviderOption {
  slug: string;
  name: string;
  preset: string | null;
}

export interface OidcProviderDto {
  id: string;
  slug: string;
  name: string;
  preset: string | null;
  issuer: string;
  clientId: string;
  discoveryUrl: string;
  scopes: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOidcProviderPayload {
  slug: string;
  name: string;
  preset?: "google" | "microsoft";
  issuer: string;
  clientId: string;
  clientSecret?: string;
  discoveryUrl: string;
  scopes?: string[];
  enabled?: boolean;
}

export type UpdateOidcProviderPayload = Partial<CreateOidcProviderPayload>;

export interface TestOidcProviderPayload {
  preset?: "google" | "microsoft";
  issuer: string;
  clientId: string;
  clientSecret?: string;
  discoveryUrl: string;
  scopes?: string[];
  enabled?: boolean;
}

export interface TestOidcProviderResponse {
  success: true;
  issuer: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string | null;
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
  automationEmailEnabled?: boolean;
  automationTelegramEnabled?: boolean;
  automationTelegramBotToken?: string;
  automationTelegramChatId?: string;
  automationEmailLevels?: EventSeverity[];
  automationTelegramLevels?: EventSeverity[];
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
  defaultTimezone?: string;
  isArchived?: boolean;
  isDefault?: boolean;
  automationEmailEnabled?: boolean;
  automationTelegramEnabled?: boolean;
  automationTelegramBotToken?: string;
  automationTelegramChatId?: string;
  automationEmailLevels?: EventSeverity[];
  automationTelegramLevels?: EventSeverity[];
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
  teamId?: string;
}

export interface CreateTaskPayload {
  nodeId?: string;
  type: string;
  payload?: Record<string, unknown>;
  templateId?: string;
}

export interface CreateBatchTaskPayload {
  nodeIds: string[];
  type: string;
  payload?: Record<string, unknown>;
  templateId?: string;
}

export interface CreateTeamTaskPayload {
  type: string;
  payload?: Record<string, unknown>;
  templateId?: string;
}

export interface TaskTemplateDto {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  taskType: string;
  payloadTemplate: Record<string, unknown>;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskTemplatePayload {
  name: string;
  description?: string;
  taskType: string;
  payloadTemplate?: Record<string, unknown>;
}

export interface UpdateTaskTemplatePayload {
  name?: string;
  description?: string;
  taskType?: string;
  payloadTemplate?: Record<string, unknown>;
  archivedAt?: string | null;
}

export interface CreateScheduledTaskPayload {
  nodeId?: string;
  teamId?: string;
  templateId?: string;
  name: string;
  command: string;
  runAsRoot?: boolean;
  cadence: ScheduledTaskCadence;
  minute: number;
  hour?: number;
  dayOfWeek?: number;
  intervalMinutes?: number;
}

export interface CreateBatchScheduledTaskPayload {
  nodeIds: string[];
  templateId?: string;
  name: string;
  command: string;
  runAsRoot?: boolean;
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

export interface EnableNodeMaintenancePayload {
  reason?: string;
}

export interface UpdateNodeTeamPayload {
  teamId?: string;
}

export interface UpdateNodeRootAccessPayload {
  profile: RootAccessProfile;
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

export type PlatformMailSettings = MailSettingsPayload;

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

export interface PlatformApiRestartResponse {
  accepted: true;
  requestedAt: string;
  message: string;
}

export interface HealthResponse {
  service: string;
  status: string;
  timestamp: string;
  startedAt: string;
  bootId: string;
}

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

export interface CreateNodeInstallPayload {
  nodeName: string;
  description?: string;
  teamId?: string;
}

export interface CreateNodeInstallResponse extends NodeInstallDto {
  installCommand: string;
  scriptUrl: string;
  apiUrl: string;
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

export interface AuditLogDto {
  id: string;
  scope: "platform" | "workspace";
  workspaceId: string | null;
  actorType: "user" | "system";
  actorUserId: string | null;
  actorEmailSnapshot: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetLabel: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AuditLogFilters {
  actor?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
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
  teamId?: string;
  maintenanceMode?: boolean;
  limit?: number;
  offset?: number;
}

export interface TaskFilters {
  nodeId?: string;
  teamId?: string;
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
