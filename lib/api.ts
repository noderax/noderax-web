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
  AcceptInvitationPayload,
  AddTeamMemberPayload,
  AgentRelease,
  AgentUpdateRollout,
  AgentUpdateSummary,
  AuditLogDto,
  AuditLogFilters,
  AuthProviderOption,
  AssignableUserDto,
  AuthSession,
  CancelTaskPayload,
  CancelTaskResponse,
  ChangePasswordPayload,
  CreateBatchScheduledTaskPayload,
  CreateBatchTaskPayload,
  CreateAgentUpdateRolloutPayload,
  CreateNodeInstallPayload,
  CreateNodeInstallResponse,
  CreateScheduledTaskPayload,
  CreateNodePayload,
  CreateOidcProviderPayload,
  CreateTeamPayload,
  CreateTeamTaskPayload,
  CreateTerminalSessionPayload,
  CreateTaskPayload,
  CreateTaskTemplatePayload,
  CreateUserPayload,
  CreateWorkspaceMemberPayload,
  CreateWorkspacePayload,
  DeleteNodeResponse,
  DeleteUserResponse,
  DashboardOverview,
  DeleteWorkspaceResponse,
  DeleteScheduledTaskResponse,
  DeleteMfaPayload,
  EnrollmentStatusResponse,
  EventDto,
  EventFilters,
  EventRecord,
  FinalizeEnrollmentPayload,
  FinalizeEnrollmentResponse,
  ForgotPasswordPayload,
  HealthResponse,
  IncidentAnalysisDto,
  IncidentAnalysisRequestPayload,
  IncidentDto,
  IncidentFilters,
  InvitationPreviewDto,
  InstallPackagesPayload,
  LogMonitorRuleDto,
  LogPreviewResponseDto,
  LogSourcePresetDto,
  LoginPayload,
  LoginResponseDto,
  MfaSetupResponse,
  MfaStatusResponse,
  MetricDto,
  MetricFilters,
  NodeDetail,
  NodeDto,
  NodeFilters,
  NodeInstallDto,
  OidcProviderDto,
  NodeSummary,
  PlatformSettingsResponse,
  PlatformApiRestartResponse,
  UpdatePlatformSettingsPayload,
  PackageSearchResult,
  PackageTaskAcceptedResponse,
  PackageTaskMutationResponse,
  InstalledPackage,
  ValidateSmtpPayload,
  ValidateSmtpResponse,
  RemovePackagePayload,
  ScheduledTaskDto,
  ScheduledTaskSummary,
  SetupInstallPayload,
  SetupInstallResponse,
  SetupApiConfigResponse,
  SetupStatusResponse,
  TeamDto,
  TeamMembershipDto,
  TaskDetail,
  TaskDto,
  TaskFilters,
  TaskLogDto,
  TaskLogFilters,
  TaskFlowDiagnostics,
  TaskSummary,
  UpdateLogMonitorRulePayload,
  UpdateUserPayload,
  UpdateUserPreferencesPayload,
  UpdateSetupApiConfigPayload,
  UpdateTeamPayload,
  UpdateWorkspaceMemberPayload,
  UpdateWorkspacePayload,
  UserDto,
  ResendUserInviteResponse,
  ResetPasswordPayload,
  CreateLogMonitorRulePayload,
  CreateLogPreviewPayload,
  RegenerateMfaRecoveryCodesPayload,
  ValidatePostgresSetupPayload,
  ValidatePostgresSetupResponse,
  ValidateRedisSetupPayload,
  ValidateRedisSetupResponse,
  PasswordResetPreviewDto,
  TaskTemplateDto,
  TestOidcProviderPayload,
  TestOidcProviderResponse,
  UpdateNodeTeamPayload,
  UpdateNodeNotificationsPayload,
  UpdateNodeRootAccessPayload,
  UpdateOidcProviderPayload,
  UpdateTaskTemplatePayload,
  VerifyMfaChallengePayload,
  VerifyMfaRecoveryPayload,
  WorkspaceDto,
  WorkspaceMembershipDto,
  WorkspaceSearchResponseDto,
  EnableNodeMaintenancePayload,
  TerminalSession,
  TerminalTranscriptChunk,
  TerminateTerminalSessionPayload,
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

const buildWorkspaceApiPath = (workspaceId: string, path = "") =>
  `/api/proxy/workspaces/${workspaceId}${path}`;

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
    return request<AuthSession | LoginResponseDto>("/api/auth/login", {
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
  getAuthProviders() {
    return request<AuthProviderOption[]>("/api/auth/providers");
  },
  verifyMfaChallenge(payload: VerifyMfaChallengePayload) {
    return request<AuthSession>("/api/auth/mfa/challenge/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  verifyMfaRecovery(payload: VerifyMfaRecoveryPayload) {
    return request<AuthSession>("/api/auth/mfa/recovery/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getSetupStatus() {
    return request<SetupStatusResponse>("/api/setup/status");
  },
  getSetupApiConfig() {
    return request<SetupApiConfigResponse>("/api/setup/config");
  },
  updateSetupApiConfig(payload: UpdateSetupApiConfigPayload) {
    return request<SetupApiConfigResponse & { success: true }>("/api/setup/config", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  validateSetupPostgres(payload: ValidatePostgresSetupPayload) {
    return request<ValidatePostgresSetupResponse>(
      "/api/setup/validate/postgres",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  validateSetupRedis(payload: ValidateRedisSetupPayload) {
    return request<ValidateRedisSetupResponse>("/api/setup/validate/redis", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  validateSetupSmtp(payload: ValidateSmtpPayload) {
    return request<ValidateSmtpResponse>("/api/setup/validate/smtp", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  installSetup(payload: SetupInstallPayload) {
    return request<SetupInstallResponse>("/api/setup/install", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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
  getWorkspaces() {
    return request<WorkspaceDto[]>("/api/proxy/workspaces");
  },
  createWorkspace(payload: CreateWorkspacePayload) {
    return request<WorkspaceDto>("/api/proxy/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getWorkspace(workspaceId: string) {
    return request<WorkspaceDto>(buildWorkspaceApiPath(workspaceId));
  },
  updateWorkspace(workspaceId: string, payload: UpdateWorkspacePayload) {
    return request<WorkspaceDto>(buildWorkspaceApiPath(workspaceId), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteWorkspace(workspaceId: string) {
    return request<DeleteWorkspaceResponse>(buildWorkspaceApiPath(workspaceId), {
      method: "DELETE",
    });
  },
  getWorkspaceMembers(workspaceId: string) {
    return request<WorkspaceMembershipDto[]>(
      buildWorkspaceApiPath(workspaceId, "/members"),
    );
  },
  getWorkspaceAssignableUsers(workspaceId: string) {
    return request<AssignableUserDto[]>(
      buildWorkspaceApiPath(workspaceId, "/assignable-users"),
    );
  },
  searchWorkspace(workspaceId: string, q: string, limit = 5) {
    return request<WorkspaceSearchResponseDto>(
      `${buildWorkspaceApiPath(workspaceId, "/search")}${buildQueryString({
        q,
        limit,
      })}`,
    );
  },
  createWorkspaceMember(
    workspaceId: string,
    payload: CreateWorkspaceMemberPayload,
  ) {
    return request<WorkspaceMembershipDto>(
      buildWorkspaceApiPath(workspaceId, "/members"),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  updateWorkspaceMember(
    workspaceId: string,
    membershipId: string,
    payload: UpdateWorkspaceMemberPayload,
  ) {
    return request<WorkspaceMembershipDto>(
      buildWorkspaceApiPath(workspaceId, `/members/${membershipId}`),
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
  deleteWorkspaceMember(workspaceId: string, membershipId: string) {
    return request<{ deleted: true; id: string }>(
      buildWorkspaceApiPath(workspaceId, `/members/${membershipId}`),
      {
        method: "DELETE",
      },
    );
  },
  getWorkspaceTeams(workspaceId: string) {
    return request<TeamDto[]>(buildWorkspaceApiPath(workspaceId, "/teams"));
  },
  createWorkspaceTeam(workspaceId: string, payload: CreateTeamPayload) {
    return request<TeamDto>(buildWorkspaceApiPath(workspaceId, "/teams"), {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateWorkspaceTeam(
    workspaceId: string,
    teamId: string,
    payload: UpdateTeamPayload,
  ) {
    return request<TeamDto>(buildWorkspaceApiPath(workspaceId, `/teams/${teamId}`), {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteWorkspaceTeam(workspaceId: string, teamId: string) {
    return request<{ deleted: true; id: string }>(
      buildWorkspaceApiPath(workspaceId, `/teams/${teamId}`),
      {
        method: "DELETE",
      },
    );
  },
  getWorkspaceTeamMembers(workspaceId: string, teamId: string) {
    return request<TeamMembershipDto[]>(
      buildWorkspaceApiPath(workspaceId, `/teams/${teamId}/members`),
    );
  },
  addWorkspaceTeamMember(
    workspaceId: string,
    teamId: string,
    payload: AddTeamMemberPayload,
  ) {
    return request<TeamMembershipDto>(
      buildWorkspaceApiPath(workspaceId, `/teams/${teamId}/members`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  deleteWorkspaceTeamMember(workspaceId: string, teamId: string, userId: string) {
    return request<{ deleted: true; userId: string }>(
      buildWorkspaceApiPath(workspaceId, `/teams/${teamId}/members/${userId}`),
      {
        method: "DELETE",
      },
    );
  },
  getUsers() {
    return request<UserDto[]>("/api/proxy/users");
  },
  getPlatformSettings() {
    return request<PlatformSettingsResponse>("/api/proxy/platform-settings");
  },
  getAgentUpdateSummary() {
    return request<AgentUpdateSummary>("/api/proxy/agent-updates/summary");
  },
  getAgentUpdateReleases() {
    return request<AgentRelease[]>("/api/proxy/agent-updates/releases");
  },
  getAgentUpdateRollouts() {
    return request<AgentUpdateRollout[]>("/api/proxy/agent-updates/rollouts");
  },
  getAgentUpdateRollout(rolloutId: string) {
    return request<AgentUpdateRollout>(
      `/api/proxy/agent-updates/rollouts/${rolloutId}`,
    );
  },
  createAgentUpdateRollout(payload: CreateAgentUpdateRolloutPayload) {
    return request<AgentUpdateRollout>("/api/proxy/agent-updates/rollouts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  resumeAgentUpdateRollout(rolloutId: string) {
    return request<AgentUpdateRollout>(
      `/api/proxy/agent-updates/rollouts/${rolloutId}/resume`,
      {
        method: "POST",
      },
    );
  },
  cancelAgentUpdateRollout(rolloutId: string) {
    return request<AgentUpdateRollout>(
      `/api/proxy/agent-updates/rollouts/${rolloutId}/cancel`,
      {
        method: "POST",
      },
    );
  },
  retryAgentUpdateRolloutTarget(rolloutId: string, targetId: string) {
    return request<AgentUpdateRollout>(
      `/api/proxy/agent-updates/rollouts/${rolloutId}/targets/${targetId}/retry`,
      {
        method: "POST",
      },
    );
  },
  skipAgentUpdateRolloutTarget(rolloutId: string, targetId: string) {
    return request<AgentUpdateRollout>(
      `/api/proxy/agent-updates/rollouts/${rolloutId}/targets/${targetId}/skip`,
      {
        method: "POST",
      },
    );
  },
  updatePlatformSettings(payload: UpdatePlatformSettingsPayload) {
    return request<PlatformSettingsResponse>("/api/proxy/platform-settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  restartPlatformApi() {
    return request<PlatformApiRestartResponse>("/api/proxy/platform-settings/restart", {
      method: "POST",
    });
  },
  validatePlatformSmtp(payload: ValidateSmtpPayload) {
    return request<ValidateSmtpResponse>(
      "/api/proxy/platform-settings/validate/smtp",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getHealth(signal?: AbortSignal) {
    return request<HealthResponse>("/api/proxy/health", {
      signal,
    });
  },
  updateCurrentUserPreferences(payload: UpdateUserPreferencesPayload) {
    return request<UserDto>("/api/proxy/users/me/preferences", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  initiateMfaSetup() {
    return request<MfaSetupResponse>("/api/proxy/auth/mfa/setup/initiate", {
      method: "POST",
    });
  },
  confirmMfaSetup(token: string) {
    return request<MfaStatusResponse>("/api/proxy/auth/mfa/setup/confirm", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  },
  regenerateMfaRecoveryCodes(payload: RegenerateMfaRecoveryCodesPayload) {
    return request<MfaStatusResponse>(
      "/api/proxy/auth/mfa/recovery/regenerate",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  disableMfa(payload: DeleteMfaPayload) {
    return request<{ success: true }>("/api/proxy/auth/mfa", {
      method: "DELETE",
      body: JSON.stringify(payload),
    });
  },
  createUser(payload: CreateUserPayload) {
    return request<UserDto>("/api/proxy/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  resendUserInvite(userId: string) {
    return request<ResendUserInviteResponse>(
      `/api/proxy/users/${userId}/resend-invite`,
      {
        method: "POST",
      },
    );
  },
  updateUser(userId: string, payload: UpdateUserPayload) {
    return request<UserDto>(`/api/proxy/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteUser(userId: string) {
    return request<DeleteUserResponse>(`/api/proxy/users/${userId}`, {
      method: "DELETE",
    });
  },
  changeCurrentUserPassword(payload: ChangePasswordPayload) {
    return request<{ success: true }>("/api/proxy/users/me/password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getOidcProviders() {
    return request<OidcProviderDto[]>("/api/proxy/auth/providers/admin");
  },
  createOidcProvider(payload: CreateOidcProviderPayload) {
    return request<OidcProviderDto>("/api/proxy/auth/providers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateOidcProvider(providerId: string, payload: UpdateOidcProviderPayload) {
    return request<OidcProviderDto>(`/api/proxy/auth/providers/${providerId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteOidcProvider(providerId: string) {
    return request<{ deleted: true; id: string }>(
      `/api/proxy/auth/providers/${providerId}`,
      {
        method: "DELETE",
      },
    );
  },
  testOidcProvider(payload: TestOidcProviderPayload) {
    return request<TestOidcProviderResponse>("/api/proxy/auth/providers/test", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getInvitationPreview(token: string) {
    return request<InvitationPreviewDto>(
      `/api/auth/invitations/${encodeURIComponent(token)}`,
    );
  },
  acceptInvitation(token: string, payload: AcceptInvitationPayload) {
    return request<{ success: true }>(
      `/api/auth/invitations/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  requestPasswordReset(payload: ForgotPasswordPayload) {
    return request<{ success: true }>("/api/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getPasswordResetPreview(token: string) {
    return request<PasswordResetPreviewDto>(
      `/api/auth/password/reset/${encodeURIComponent(token)}`,
    );
  },
  resetPassword(token: string, payload: ResetPasswordPayload) {
    return request<{ success: true }>(
      `/api/auth/password/reset/${encodeURIComponent(token)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getNodes(filters?: NodeFilters, workspaceId?: string) {
    return request<NodeDto[]>(
      `${workspaceId ? buildWorkspaceApiPath(workspaceId, "/nodes") : "/api/proxy/nodes"}${buildQueryString({
        status: filters?.status,
        search: filters?.search,
        teamId: filters?.teamId,
        maintenanceMode:
          typeof filters?.maintenanceMode === "boolean"
            ? String(filters.maintenanceMode)
            : undefined,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  createNode(payload: CreateNodePayload, workspaceId?: string) {
    return request<NodeDto>(
      workspaceId ? buildWorkspaceApiPath(workspaceId, "/nodes") : "/api/proxy/nodes",
      {
      method: "POST",
      body: JSON.stringify(payload),
      },
    );
  },
  updateNodeTeam(
    nodeId: string,
    payload: UpdateNodeTeamPayload,
    workspaceId?: string,
  ) {
    return request<NodeDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/team`)
        : `/api/proxy/nodes/${nodeId}/team`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  updateNodeRootAccess(
    nodeId: string,
    payload: UpdateNodeRootAccessPayload,
    workspaceId?: string,
  ) {
    return request<NodeDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/root-access`)
        : `/api/proxy/nodes/${nodeId}/root-access`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  updateNodeNotifications(
    nodeId: string,
    payload: UpdateNodeNotificationsPayload,
    workspaceId?: string,
  ) {
    return request<NodeDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/notifications`)
        : `/api/proxy/nodes/${nodeId}/notifications`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  enableNodeMaintenance(
    nodeId: string,
    payload: EnableNodeMaintenancePayload,
    workspaceId?: string,
  ) {
    return request<NodeDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/maintenance/enable`)
        : `/api/proxy/nodes/${nodeId}/maintenance/enable`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  disableNodeMaintenance(nodeId: string, workspaceId?: string) {
    return request<NodeDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/maintenance/disable`)
        : `/api/proxy/nodes/${nodeId}/maintenance/disable`,
      {
        method: "POST",
      },
    );
  },
  createTerminalSession(
    nodeId: string,
    payload: CreateTerminalSessionPayload,
    workspaceId: string,
  ) {
    return request<TerminalSession>(
      buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/terminal-sessions`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getNodeTerminalSessions(
    nodeId: string,
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    return request<TerminalSession[]>(
      `${buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/terminal-sessions`)}${buildQueryString({
        limit: options?.limit,
        offset: options?.offset,
      })}`,
    );
  },
  getTerminalSession(sessionId: string, workspaceId: string) {
    return request<TerminalSession>(
      buildWorkspaceApiPath(workspaceId, `/terminal-sessions/${sessionId}`),
    );
  },
  getTerminalSessionChunks(
    sessionId: string,
    workspaceId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ) {
    return request<TerminalTranscriptChunk[]>(
      `${buildWorkspaceApiPath(workspaceId, `/terminal-sessions/${sessionId}/chunks`)}${buildQueryString({
        limit: options?.limit,
        offset: options?.offset,
      })}`,
    );
  },
  terminateTerminalSession(
    sessionId: string,
    payload: TerminateTerminalSessionPayload,
    workspaceId: string,
  ) {
    return request<TerminalSession>(
      buildWorkspaceApiPath(workspaceId, `/terminal-sessions/${sessionId}/terminate`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getScheduledTasks(workspaceId?: string) {
    return request<ScheduledTaskDto[]>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, "/scheduled-tasks")
        : "/api/proxy/scheduled-tasks",
    );
  },
  createScheduledTask(payload: CreateScheduledTaskPayload, workspaceId?: string) {
    return request<ScheduledTaskDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, "/scheduled-tasks")
        : "/api/proxy/scheduled-tasks",
      {
      method: "POST",
      body: JSON.stringify(payload),
      },
    );
  },
  createBatchScheduledTasks(
    payload: CreateBatchScheduledTaskPayload,
    workspaceId?: string,
  ) {
    return request<ScheduledTaskDto[]>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, "/scheduled-tasks/batch")
        : "/api/proxy/scheduled-tasks/batch",
      {
      method: "POST",
      body: JSON.stringify(payload),
      },
    );
  },
  updateScheduledTask(
    id: string,
    payload: { enabled: boolean },
    workspaceId?: string,
  ) {
    return request<ScheduledTaskDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/scheduled-tasks/${id}`)
        : `/api/proxy/scheduled-tasks/${id}`,
      {
      method: "PATCH",
      body: JSON.stringify(payload),
      },
    );
  },
  deleteScheduledTask(id: string, workspaceId?: string) {
    return request<DeleteScheduledTaskResponse>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/scheduled-tasks/${id}`)
        : `/api/proxy/scheduled-tasks/${id}`,
      {
        method: "DELETE",
      },
    );
  },
  finalizeNodeEnrollment(
    token: string,
    payload: FinalizeEnrollmentPayload,
    workspaceId?: string,
  ) {
    return request<FinalizeEnrollmentResponse>(
      workspaceId
        ? buildWorkspaceApiPath(
            workspaceId,
            `/enrollments/${encodeURIComponent(token)}/finalize`,
          )
        : `/api/proxy/enrollments/${encodeURIComponent(token)}/finalize`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  createNodeInstall(payload: CreateNodeInstallPayload, workspaceId: string) {
    return request<CreateNodeInstallResponse>(
      buildWorkspaceApiPath(workspaceId, "/node-installs"),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getNodeInstallStatus(installId: string, workspaceId: string) {
    return request<NodeInstallDto>(
      buildWorkspaceApiPath(
        workspaceId,
        `/node-installs/${encodeURIComponent(installId)}`,
      ),
    );
  },
  checkEnrollmentStatus(token: string) {
    return request<EnrollmentStatusResponse>(
      `/api/proxy/enrollments/${encodeURIComponent(token)}`,
    );
  },
  getNode(id: string, workspaceId?: string) {
    return request<NodeDto>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${id}`)
        : `/api/proxy/nodes/${id}`,
    );
  },
  getNodeLogPresets(nodeId: string, workspaceId: string) {
    return request<LogSourcePresetDto[]>(
      buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/log-presets`),
    );
  },
  previewNodeLogs(
    nodeId: string,
    payload: CreateLogPreviewPayload,
    workspaceId: string,
  ) {
    return request<LogPreviewResponseDto>(
      buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/log-preview`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getNodeLogMonitorRules(nodeId: string, workspaceId: string) {
    return request<LogMonitorRuleDto[]>(
      buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/log-monitor-rules`),
    );
  },
  createNodeLogMonitorRule(
    nodeId: string,
    payload: CreateLogMonitorRulePayload,
    workspaceId: string,
  ) {
    return request<LogMonitorRuleDto>(
      buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/log-monitor-rules`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  updateNodeLogMonitorRule(
    nodeId: string,
    ruleId: string,
    payload: UpdateLogMonitorRulePayload,
    workspaceId: string,
  ) {
    return request<LogMonitorRuleDto>(
      buildWorkspaceApiPath(
        workspaceId,
        `/nodes/${nodeId}/log-monitor-rules/${ruleId}`,
      ),
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
  deleteNodeLogMonitorRule(nodeId: string, ruleId: string, workspaceId: string) {
    return request<{ deleted: true; id: string }>(
      buildWorkspaceApiPath(
        workspaceId,
        `/nodes/${nodeId}/log-monitor-rules/${ruleId}`,
      ),
      {
        method: "DELETE",
      },
    );
  },
  async getNodePackages(
    nodeId: string,
    options?: {
      workspaceId?: string;
      signal?: AbortSignal;
    },
  ): Promise<InstalledPackage[]> {
    const response = await request<unknown>(
      options?.workspaceId
        ? buildWorkspaceApiPath(options.workspaceId, `/nodes/${nodeId}/packages`)
        : `/api/proxy/nodes/${nodeId}/packages`,
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
      workspaceId?: string;
      signal?: AbortSignal;
    },
  ): Promise<PackageSearchResult[]> {
    const response = await request<unknown>(
      `${options?.workspaceId ? buildWorkspaceApiPath(options.workspaceId, "/packages/search") : "/api/proxy/packages/search"}${buildQueryString({
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
    workspaceId,
  }: InstallPackagesPayload): Promise<PackageTaskMutationResponse> {
    const response = await request<unknown>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/packages`)
        : `/api/proxy/nodes/${nodeId}/packages`,
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
    workspaceId,
  }: RemovePackagePayload): Promise<PackageTaskMutationResponse> {
    const response = await request<unknown>(
      `${workspaceId ? buildWorkspaceApiPath(workspaceId, `/nodes/${nodeId}/packages/${encodeURIComponent(name)}`) : `/api/proxy/nodes/${nodeId}/packages/${encodeURIComponent(name)}`}${buildQueryString(
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
  deleteNode(id: string, workspaceId?: string) {
    return request<DeleteNodeResponse>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/nodes/${id}`)
        : `/api/proxy/nodes/${id}`,
      {
      method: "DELETE",
      },
    );
  },
  getTasks(filters?: TaskFilters, workspaceId?: string) {
    return request<TaskDto[]>(
      `${workspaceId ? buildWorkspaceApiPath(workspaceId, "/tasks") : "/api/proxy/tasks"}${buildQueryString({
        nodeId: filters?.nodeId,
        teamId: filters?.teamId,
        status: filters?.status,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  createTask(payload: CreateTaskPayload, workspaceId?: string) {
    return request<TaskDto>(
      workspaceId ? buildWorkspaceApiPath(workspaceId, "/tasks") : "/api/proxy/tasks",
      {
      method: "POST",
      body: JSON.stringify(payload),
      },
    );
  },
  createTeamTask(teamId: string, payload: CreateTeamTaskPayload, workspaceId: string) {
    return request<TaskDto[]>(
      buildWorkspaceApiPath(workspaceId, `/tasks/teams/${teamId}`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  createBatchTasks(payload: CreateBatchTaskPayload, workspaceId?: string) {
    return request<TaskDto[]>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, "/tasks/batch")
        : "/api/proxy/tasks/batch",
      {
      method: "POST",
      body: JSON.stringify(payload),
      },
    );
  },
  getTaskTemplates(workspaceId: string) {
    return request<TaskTemplateDto[]>(
      buildWorkspaceApiPath(workspaceId, "/task-templates"),
    );
  },
  createTaskTemplate(workspaceId: string, payload: CreateTaskTemplatePayload) {
    return request<TaskTemplateDto>(
      buildWorkspaceApiPath(workspaceId, "/task-templates"),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  updateTaskTemplate(
    workspaceId: string,
    templateId: string,
    payload: UpdateTaskTemplatePayload,
  ) {
    return request<TaskTemplateDto>(
      buildWorkspaceApiPath(workspaceId, `/task-templates/${templateId}`),
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },
  deleteTaskTemplate(workspaceId: string, templateId: string) {
    return request<{ deleted: true; id: string }>(
      buildWorkspaceApiPath(workspaceId, `/task-templates/${templateId}`),
      {
        method: "DELETE",
      },
    );
  },
  getWorkspaceAuditLogs(workspaceId: string, filters?: AuditLogFilters) {
    return request<AuditLogDto[]>(
      `${buildWorkspaceApiPath(workspaceId, "/audit-logs")}${buildQueryString({
        actor: filters?.actor,
        action: filters?.action,
        targetType: filters?.targetType,
        from: filters?.from,
        to: filters?.to,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  getPlatformAuditLogs(filters?: AuditLogFilters) {
    return request<AuditLogDto[]>(
      `/api/proxy/audit-logs${buildQueryString({
        actor: filters?.actor,
        action: filters?.action,
        targetType: filters?.targetType,
        from: filters?.from,
        to: filters?.to,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  async cancelTask(
    taskId: string,
    payload?: CancelTaskPayload,
    workspaceId?: string,
  ): Promise<CancelTaskResponse> {
    const response = await request<unknown>(
      workspaceId
        ? buildWorkspaceApiPath(workspaceId, `/tasks/${taskId}/cancel`)
        : `/api/proxy/tasks/${taskId}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({
          reason: payload?.reason?.trim() ?? "",
        }),
      },
    );

    return normalizeCancelTaskResponse(taskId, response);
  },
  getTask(id: string, workspaceId?: string) {
    return workspaceId
      ? request<TaskDto>(buildWorkspaceApiPath(workspaceId, `/tasks/${id}`))
      : getTaskDto(id);
  },
  getTaskLogs(id: string, filters?: TaskLogFilters, workspaceId?: string) {
    return request<TaskLogDto[]>(
      `${workspaceId ? buildWorkspaceApiPath(workspaceId, `/tasks/${id}/logs`) : `/api/proxy/tasks/${id}/logs`}${buildQueryString({
        limit: filters?.limit,
      })}`,
    );
  },
  getEvents(filters?: EventFilters, workspaceId?: string) {
    return request<EventDto[]>(
      `${workspaceId ? buildWorkspaceApiPath(workspaceId, "/events") : "/api/proxy/events"}${buildQueryString({
        nodeId: filters?.nodeId,
        type: filters?.type,
        severity: filters?.severity === "all" ? undefined : filters?.severity,
        limit: filters?.limit,
      })}`,
    );
  },
  getIncidents(filters: IncidentFilters | undefined, workspaceId: string) {
    return request<IncidentDto[]>(
      `${buildWorkspaceApiPath(workspaceId, "/incidents")}${buildQueryString({
        status: filters?.status === "all" ? undefined : filters?.status,
        severity: filters?.severity === "all" ? undefined : filters?.severity,
        nodeId: filters?.nodeId,
        ruleId: filters?.ruleId,
        sourcePresetId: filters?.sourcePresetId,
        limit: filters?.limit,
        offset: filters?.offset,
      })}`,
    );
  },
  acknowledgeIncident(incidentId: string, workspaceId: string) {
    return request<IncidentDto>(
      buildWorkspaceApiPath(workspaceId, `/incidents/${incidentId}/ack`),
      {
        method: "POST",
      },
    );
  },
  resolveIncident(incidentId: string, workspaceId: string) {
    return request<IncidentDto>(
      buildWorkspaceApiPath(workspaceId, `/incidents/${incidentId}/resolve`),
      {
        method: "POST",
      },
    );
  },
  analyzeIncident(
    incidentId: string,
    payload: IncidentAnalysisRequestPayload,
    workspaceId: string,
  ) {
    return request<IncidentAnalysisDto>(
      buildWorkspaceApiPath(workspaceId, `/incidents/${incidentId}/analyze`),
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  getMetrics(filters?: MetricFilters, workspaceId?: string) {
    return request<MetricDto[]>(
      `${workspaceId ? buildWorkspaceApiPath(workspaceId, "/metrics") : "/api/proxy/metrics"}${buildQueryString({
        nodeId: filters?.nodeId,
        limit: filters?.limit,
      })}`,
    );
  },
  async getDashboardOverview(workspaceId?: string): Promise<DashboardOverview> {
    const [nodes, tasks, events, metrics] = await Promise.all([
      this.getNodes({ limit: 100 }, workspaceId),
      this.getTasks({ limit: 100 }, workspaceId),
      this.getEvents({ limit: 12 }, workspaceId),
      this.getMetrics({ limit: 100 }, workspaceId),
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
  async getNodeSummaries(
    filters?: NodeFilters,
    workspaceId?: string,
  ): Promise<NodeSummary[]> {
    const [nodes, metrics] = await Promise.all([
      this.getNodes(filters, workspaceId),
      this.getMetrics({ limit: 100 }, workspaceId),
    ]);

    const metricsByNodeId = createMetricsByNodeId(metrics);
    return nodes.map((node) => mapNodeSummary(node, metricsByNodeId));
  },
  async getNodeDetail(id: string, workspaceId?: string): Promise<NodeDetail> {
    const [node, metrics, tasks, events] = await Promise.all([
      this.getNode(id, workspaceId),
      this.getMetrics({ nodeId: id, limit: 24 }, workspaceId),
      this.getTasks({ nodeId: id, limit: 50 }, workspaceId),
      this.getEvents({ nodeId: id, limit: 20 }, workspaceId),
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
  async getTaskSummaries(
    filters?: TaskFilters,
    workspaceId?: string,
  ): Promise<TaskSummary[]> {
    const [tasks, nodes] = await Promise.all([
      this.getTasks(filters, workspaceId),
      this.getNodes({ limit: 100 }, workspaceId),
    ]);

    const nodeLookup = createNodeLookup(nodes);
    return tasks.map((task) => mapTaskSummary(task, nodeLookup));
  },
  async getScheduledTaskSummaries(
    workspaceId?: string,
  ): Promise<ScheduledTaskSummary[]> {
    const [scheduledTasks, nodes] = await Promise.all([
      this.getScheduledTasks(workspaceId),
      this.getNodes({ limit: 100 }, workspaceId),
    ]);

    const nodeLookup = createNodeLookup(nodes);
    return scheduledTasks.map((task) => mapScheduledTaskSummary(task, nodeLookup));
  },
  async getTaskDetail(id: string, workspaceId?: string): Promise<TaskDetail> {
    const task = await this.getTask(id, workspaceId);

    const [node, metrics, logs, events] = await Promise.all([
      this.getNode(task.nodeId, workspaceId),
      this.getMetrics({ nodeId: task.nodeId, limit: 1 }, workspaceId),
      this.getTaskLogs(id, { limit: 100 }, workspaceId),
      this.getEvents({ nodeId: task.nodeId, limit: 50 }, workspaceId),
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
  async getTaskLogLines(id: string, filters?: TaskLogFilters, workspaceId?: string) {
    return (await this.getTaskLogs(id, filters, workspaceId)).map((log) => ({
      id: log.id,
      taskId: log.taskId,
      timestamp: log.timestamp ?? log.createdAt,
      level: log.level,
      message: log.message,
    }));
  },
  async getEventRecords(filters?: EventFilters, workspaceId?: string) {
    const events = await this.getEvents(filters, workspaceId);
    return filterEventsByQuery(events.map(mapEventRecord), filters?.query);
  },
};

export { ApiError };
