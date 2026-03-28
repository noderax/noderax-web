"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiClient } from "@/lib/api";
import { sessionQueryKey } from "@/lib/hooks/use-auth-session";
import { useWorkspaceContext, workspacesQueryKey } from "@/lib/hooks/use-workspace-context";
import type {
  ChangePasswordPayload,
  AddTeamMemberPayload,
  AssignableUserDto,
  AuthSession,
  CancelTaskPayload,
  CancelTaskResponse,
  CreateBatchScheduledTaskPayload,
  CreateBatchTaskPayload,
  CreateScheduledTaskPayload,
  CreateNodePayload,
  CreateTeamPayload,
  CreateTaskPayload,
  CreateUserPayload,
  CreateWorkspaceMemberPayload,
  CreateWorkspacePayload,
  DeleteUserResponse,
  DeleteWorkspaceResponse,
  EventFilters,
  FinalizeEnrollmentPayload,
  FinalizeEnrollmentResponse,
  InstallPackagesPayload,
  MetricFilters,
  NodeFilters,
  RemovePackagePayload,
  PlatformSettingsResponse,
  ResendUserInviteResponse,
  ValidateSmtpPayload,
  UpdatePlatformSettingsPayload,
  TeamMembershipDto,
  UpdateScheduledTaskPayload,
  UpdateTeamPayload,
  UpdateUserPreferencesPayload,
  UpdateWorkspaceMemberPayload,
  UpdateWorkspacePayload,
  TaskFilters,
  TaskStatus,
  UpdateUserPayload,
  WorkspaceMembershipDto,
  WorkspaceSearchResponseDto,
} from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const readMutationError = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed unexpectedly.";

const requireWorkspaceId = (workspaceId: string | null) => {
  if (!workspaceId) {
    throw new Error("Select a workspace before running this action.");
  }

  return workspaceId;
};

export const queryKeys = {
  workspaces: {
    all: workspacesQueryKey,
    detail: (workspaceId: string) => ["workspaces", "detail", workspaceId] as const,
    members: (workspaceId: string) => ["workspaces", workspaceId, "members"] as const,
    assignableUsers: (workspaceId: string) =>
      ["workspaces", workspaceId, "assignable-users"] as const,
    search: (workspaceId: string, q: string, limit: number) =>
      ["workspaces", workspaceId, "search", q, limit] as const,
    teams: (workspaceId: string) => ["workspaces", workspaceId, "teams"] as const,
    teamMembers: (workspaceId: string, teamId: string) =>
      ["workspaces", workspaceId, "teams", teamId, "members"] as const,
  },
  dashboard: {
    overview: (workspaceId: string) => ["dashboard", "overview", workspaceId] as const,
  },
  users: {
    all: ["users", "list"] as const,
  },
  platformSettings: {
    detail: ["platform-settings"] as const,
  },
  nodes: {
    all: (workspaceId: string, filters?: NodeFilters) =>
      ["nodes", workspaceId, "list", filters ?? {}] as const,
    detail: (workspaceId: string, id: string) => ["nodes", workspaceId, "detail", id] as const,
  },
  tasks: {
    all: (workspaceId: string, filters?: TaskFilters) =>
      ["tasks", workspaceId, "list", filters ?? {}] as const,
    detail: (workspaceId: string, id: string) =>
      ["tasks", workspaceId, "detail", id] as const,
    logs: (workspaceId: string, id: string, limit = 100) =>
      ["tasks", workspaceId, "logs", id, limit] as const,
  },
  scheduledTasks: {
    all: (workspaceId: string) => ["scheduled-tasks", workspaceId, "list"] as const,
  },
  events: {
    all: (workspaceId: string, filters?: EventFilters) =>
      ["events", workspaceId, "list", filters ?? {}] as const,
  },
  metrics: {
    all: (workspaceId: string, filters?: MetricFilters) =>
      ["metrics", workspaceId, "list", filters ?? {}] as const,
  },
  enrollments: {
    status: (token: string) => ["enrollments", "status", token] as const,
  },
  packages: {
    installed: (workspaceId: string, nodeId: string) =>
      ["packages", workspaceId, "installed", nodeId] as const,
    search: (workspaceId: string, nodeId: string, term: string) =>
      ["packages-search", workspaceId, nodeId, term] as const,
  },
};

const invalidateAllWorkspaceUserQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
) =>
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;

      return (
        key[0] === "workspaces" &&
        (key[2] === "members" ||
          key[2] === "assignable-users" ||
          key[2] === "search" ||
          (key[2] === "teams" && key[4] === "members"))
      );
    },
    refetchType: "active",
  });

const invalidateWorkspaceUserQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.workspaces.members(workspaceId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.workspaces.assignableUsers(workspaceId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "workspaces" &&
        query.queryKey[1] === workspaceId &&
        query.queryKey[2] === "search",
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === "workspaces" &&
        query.queryKey[1] === workspaceId &&
        query.queryKey[2] === "teams" &&
        query.queryKey[4] === "members",
      refetchType: "active",
    }),
  ]);
};

export const useDashboardOverview = () => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.dashboard.overview(workspaceId)
      : ["dashboard", "overview", "idle"],
    queryFn: () => apiClient.getDashboardOverview(workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });
};

export const useWorkspaces = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: apiClient.getWorkspaces,
    enabled,
    staleTime: 30_000,
  });

export const useUsers = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.users.all,
    queryFn: apiClient.getUsers,
    enabled,
    staleTime: 15_000,
  });

export const useWorkspaceSearch = (q: string, limit = 5, enabled = true) => {
  const { workspaceId } = useWorkspaceContext();
  const normalizedQuery = q.trim();

  return useQuery<WorkspaceSearchResponseDto>({
    queryKey:
      workspaceId && normalizedQuery
        ? queryKeys.workspaces.search(workspaceId, normalizedQuery, limit)
        : ["workspaces", "search", "idle", normalizedQuery, limit],
    queryFn: () => apiClient.searchWorkspace(workspaceId!, normalizedQuery, limit),
    enabled: enabled && Boolean(workspaceId && normalizedQuery),
    staleTime: 15_000,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { userId: string; payload: UpdateUserPayload }) =>
      apiClient.updateUser(input.userId, input.payload),
    onSuccess: async (user) => {
      const currentSession = queryClient.getQueryData<AuthSession>(sessionQueryKey);

      if (currentSession?.user.id === user.id) {
        const nextSession: AuthSession = {
          ...currentSession,
          user: {
            ...currentSession.user,
            ...user,
          },
        };

        queryClient.setQueryData(sessionQueryKey, nextSession);
        useAppStore.getState().setSession(nextSession);
      }

      toast.success("User updated", {
        description: `${user.name} was updated successfully.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.all,
          refetchType: "active",
        }),
        invalidateAllWorkspaceUserQueries(queryClient),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to update user", {
        description: readMutationError(error),
      });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.deleteUser(userId),
    onSuccess: async (result: DeleteUserResponse) => {
      toast.success("User deleted", {
        description: result.id,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.all,
          refetchType: "active",
        }),
        invalidateAllWorkspaceUserQueries(queryClient),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to delete user", {
        description: readMutationError(error),
      });
    },
  });
};

export const useResendUserInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiClient.resendUserInvite(userId),
    onSuccess: async (result: ResendUserInviteResponse) => {
      toast.success("Invitation resent", {
        description: `A fresh activation link expires at ${result.expiresAt}.`,
      });

      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
        refetchType: "active",
      });
    },
    onError: (error) => {
      toast.error("Unable to resend invitation", {
        description: readMutationError(error),
      });
    },
  });
};

export const usePlatformSettings = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.platformSettings.detail,
    queryFn: apiClient.getPlatformSettings,
    enabled,
    staleTime: 15_000,
  });

export const useValidatePlatformSmtp = () =>
  useMutation({
    mutationFn: (payload: ValidateSmtpPayload) =>
      apiClient.validatePlatformSmtp(payload),
  });

export const useWorkspaceAssignableUsers = (enabled = true) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery<AssignableUserDto[]>({
    queryKey:
      workspaceId
        ? queryKeys.workspaces.assignableUsers(workspaceId)
        : ["workspaces", "assignable-users", "idle"],
    queryFn: () => apiClient.getWorkspaceAssignableUsers(workspaceId!),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 15_000,
  });
};

export const useNodes = (filters?: NodeFilters) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.nodes.all(workspaceId, filters)
      : ["nodes", "idle", filters ?? {}],
    queryFn: () => apiClient.getNodeSummaries(filters, workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useNode = (id: string) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey:
      workspaceId && id
        ? queryKeys.nodes.detail(workspaceId, id)
        : ["nodes", "detail", "idle", id],
    queryFn: () => apiClient.getNodeDetail(id, workspaceId ?? undefined),
    enabled: Boolean(id && workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useTasks = (filters?: TaskFilters) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.tasks.all(workspaceId, filters)
      : ["tasks", "idle", filters ?? {}],
    queryFn: () => apiClient.getTaskSummaries(filters, workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useTask = (id: string) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey:
      workspaceId && id
        ? queryKeys.tasks.detail(workspaceId, id)
        : ["tasks", "detail", "idle", id],
    queryFn: () => apiClient.getTaskDetail(id, workspaceId ?? undefined),
    enabled: Boolean(id && workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useScheduledTasks = (enabled = true) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.scheduledTasks.all(workspaceId)
      : ["scheduled-tasks", "idle"],
    queryFn: () => apiClient.getScheduledTaskSummaries(workspaceId ?? undefined),
    enabled: enabled && Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useTaskLogs = (
  id: string,
  options?: {
    limit?: number;
    liveForStatus?: TaskStatus | null;
  },
) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey:
      workspaceId && id
        ? queryKeys.tasks.logs(workspaceId, id, options?.limit ?? 100)
        : ["tasks", "logs", "idle", id, options?.limit ?? 100],
    queryFn: () =>
      apiClient.getTaskLogLines(
        id,
        { limit: options?.limit ?? 100 },
        workspaceId ?? undefined,
      ),
    enabled: Boolean(id && workspaceId),
    staleTime: 2_000,
    refetchInterval: options?.liveForStatus === "running" ? 2_000 : false,
  });
};

export const useEvents = (filters?: EventFilters) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.events.all(workspaceId, filters)
      : ["events", "idle", filters ?? {}],
    queryFn: () => apiClient.getEventRecords(filters, workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useMetrics = (filters?: MetricFilters) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey: workspaceId
      ? queryKeys.metrics.all(workspaceId, filters)
      : ["metrics", "idle", filters ?? {}],
    queryFn: () => apiClient.getMetrics(filters, workspaceId ?? undefined),
    enabled: Boolean(workspaceId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
};

export const useCheckEnrollment = (token: string) => {
  const normalizedToken = token.trim();

  return useQuery({
    queryKey: queryKeys.enrollments.status(normalizedToken),
    queryFn: () => apiClient.checkEnrollmentStatus(normalizedToken),
    enabled: normalizedToken.length >= 8,
    staleTime: 5_000,
  });
};

export const useNodePackages = (nodeId: string) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey:
      workspaceId && nodeId
        ? queryKeys.packages.installed(workspaceId, nodeId)
        : ["packages", "idle", nodeId],
    queryFn: ({ signal }) =>
      apiClient.getNodePackages(nodeId, {
        signal,
        workspaceId: workspaceId ?? undefined,
      }),
    enabled: Boolean(nodeId && workspaceId),
    staleTime: 15_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useSearchPackages = (term: string, nodeId: string) => {
  const { workspaceId } = useWorkspaceContext();
  const normalizedTerm = term.trim();

  return useQuery({
    queryKey:
      workspaceId && nodeId
        ? queryKeys.packages.search(workspaceId, nodeId, normalizedTerm)
        : ["packages-search", "idle", nodeId, normalizedTerm],
    queryFn: ({ signal }) =>
      apiClient.searchPackages(normalizedTerm, nodeId, {
        signal,
        workspaceId: workspaceId ?? undefined,
      }),
    enabled: Boolean(nodeId && workspaceId) && normalizedTerm.length >= 2,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

const invalidatePackageQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  nodeId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.packages.installed(workspaceId, nodeId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: ["packages-search", workspaceId, nodeId],
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.nodes.detail(workspaceId, nodeId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: ["tasks", workspaceId, "list"],
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.overview(workspaceId),
      refetchType: "active",
    }),
  ]);
};

type FinalizeEnrollmentMutationInput = {
  token: string;
  payload: FinalizeEnrollmentPayload;
};

type CancelTaskMutationInput = {
  taskId: string;
  payload?: CancelTaskPayload;
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => apiClient.createUser(payload),
    onSuccess: async (user) => {
      toast.success("Invitation sent", {
        description: `${user.name} must activate the account before workspace assignment.`,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.all,
        refetchType: "active",
      });
    },
    onError: (error) => {
      toast.error("Unable to create user", {
        description: readMutationError(error),
      });
    },
  });
};

export const useUpdateCurrentUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserPreferencesPayload) =>
      apiClient.updateCurrentUserPreferences(payload),
    onSuccess: async (user) => {
      const currentSession = queryClient.getQueryData<AuthSession>([
        "auth",
        "session",
      ]);

      if (currentSession) {
        const nextSession: AuthSession = {
          ...currentSession,
          user: {
            ...currentSession.user,
            ...user,
          },
        };

        queryClient.setQueryData(["auth", "session"], nextSession);
        useAppStore.getState().setSession(nextSession);
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["auth", "session"],
          refetchType: "active",
        });
      }

      toast.success("Preferences updated", {
        description: `Account preferences were saved for ${user.name}.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scheduled-tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["events"] }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to update timezone", {
        description: readMutationError(error),
      });
    },
  });
};

export const useChangeCurrentUserPassword = () => {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) =>
      apiClient.changeCurrentUserPassword(payload),
  });
};

export const useUpdatePlatformSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlatformSettingsPayload) =>
      apiClient.updatePlatformSettings(payload),
    onSuccess: async (settings: PlatformSettingsResponse) => {
      toast.success("Platform settings saved", {
        description:
          settings.message ??
          "Restart the API container to apply the updated platform configuration.",
      });

      queryClient.setQueryData(queryKeys.platformSettings.detail, settings);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.platformSettings.detail,
        refetchType: "active",
      });
    },
    onError: (error) => {
      toast.error("Unable to update platform settings", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateNode = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateNodePayload) =>
      apiClient.createNode(payload, requireWorkspaceId(workspaceId)),
    onSuccess: async (node) => {
      toast.success("Node added", {
        description: `${node.name} was added to the node inventory.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nodes", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to add node", {
        description: readMutationError(error),
      });
    },
  });
};

export const useDeleteNode = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.deleteNode(id, requireWorkspaceId(workspaceId)),
    onSuccess: async (_, nodeId) => {
      toast.success("Node deleted", {
        description: "The node was removed from inventory.",
      });
      queryClient.removeQueries({
        queryKey: workspaceId ? queryKeys.nodes.detail(workspaceId, nodeId) : ["nodes", "detail", nodeId],
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nodes", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to delete node", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      apiClient.createTask(payload, requireWorkspaceId(workspaceId)),
    onSuccess: async (task, payload) => {
      toast.success("Task queued", {
        description: `${task.type} was created for the selected node.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey:
            workspaceId
              ? queryKeys.nodes.detail(workspaceId, payload.nodeId)
              : ["nodes", "detail", payload.nodeId],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to create task", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateBatchTasks = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateBatchTaskPayload) =>
      apiClient.createBatchTasks(payload, requireWorkspaceId(workspaceId)),
    onSuccess: async (tasks, payload) => {
      toast.success("Tasks queued", {
        description: `${tasks.length} ${tasks.length === 1 ? "task was" : "tasks were"} created across ${payload.nodeIds.length} ${payload.nodeIds.length === 1 ? "node" : "nodes"}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
        ...payload.nodeIds.map((nodeId) =>
          queryClient.invalidateQueries({
            queryKey:
              workspaceId
                ? queryKeys.nodes.detail(workspaceId, nodeId)
                : ["nodes", "detail", nodeId],
            refetchType: "active",
          }),
        ),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to create tasks", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateScheduledTask = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateScheduledTaskPayload) =>
      apiClient.createScheduledTask(payload, requireWorkspaceId(workspaceId)),
    onSuccess: async (schedule) => {
      toast.success("Scheduled task created", {
        description: `${schedule.name} will start running on its next scheduled slot in ${schedule.timezone}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            workspaceId ? queryKeys.scheduledTasks.all(workspaceId) : ["scheduled-tasks"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to create scheduled task", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateBatchScheduledTasks = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateBatchScheduledTaskPayload) =>
      apiClient.createBatchScheduledTasks(payload, requireWorkspaceId(workspaceId)),
    onSuccess: async (schedules, payload) => {
      const timezone = schedules[0]?.timezone;

      toast.success("Scheduled tasks created", {
        description: `${schedules.length} ${schedules.length === 1 ? "schedule was" : "schedules were"} created across ${payload.nodeIds.length} ${payload.nodeIds.length === 1 ? "node" : "nodes"}${timezone ? ` in ${timezone}` : ""}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            workspaceId ? queryKeys.scheduledTasks.all(workspaceId) : ["scheduled-tasks"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
        ...payload.nodeIds.map((nodeId) =>
          queryClient.invalidateQueries({
            queryKey:
              workspaceId
                ? queryKeys.nodes.detail(workspaceId, nodeId)
                : ["nodes", "detail", nodeId],
            refetchType: "active",
          }),
        ),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to create scheduled tasks", {
        description: readMutationError(error),
      });
    },
  });
};

export const useUpdateScheduledTask = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (input: { id: string; payload: UpdateScheduledTaskPayload }) =>
      apiClient.updateScheduledTask(
        input.id,
        input.payload,
        requireWorkspaceId(workspaceId),
      ),
    onSuccess: async (schedule) => {
      toast.success(
        schedule.enabled ? "Scheduled task enabled" : "Scheduled task disabled",
        {
          description: schedule.name,
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            workspaceId ? queryKeys.scheduledTasks.all(workspaceId) : ["scheduled-tasks"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to update scheduled task", {
        description: readMutationError(error),
      });
    },
  });
};

export const useDeleteScheduledTask = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.deleteScheduledTask(id, requireWorkspaceId(workspaceId)),
    onSuccess: async () => {
      toast.success("Scheduled task deleted");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey:
            workspaceId ? queryKeys.scheduledTasks.all(workspaceId) : ["scheduled-tasks"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", workspaceId],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to delete scheduled task", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCancelTask = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation<CancelTaskResponse, unknown, CancelTaskMutationInput>({
    mutationFn: ({ taskId, payload }) =>
      apiClient.cancelTask(taskId, payload, requireWorkspaceId(workspaceId)),
    onSuccess: async (task, variables) => {
      if (task.status === "cancelled") {
        toast.success("Task stopped.");
      } else {
        toast.info("Stop request sent. Task is shutting down safely.");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey:
            workspaceId
              ? queryKeys.tasks.detail(workspaceId, variables.taskId)
              : ["tasks", "detail", variables.taskId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          toast.error("Session expired. Please sign in again.");
          return;
        }

        if (error.status === 403) {
          toast.error("Admin permission is required to stop this task.");
          return;
        }
      }

      toast.error("Failed to send stop request. Please try again.");
    },
  });
};

export const useFinalizeEnrollment = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: ({ token, payload }: FinalizeEnrollmentMutationInput) =>
      apiClient.finalizeNodeEnrollment(
        token,
        payload,
        requireWorkspaceId(workspaceId),
      ),
    onSuccess: async (
      enrollment: FinalizeEnrollmentResponse,
      variables: FinalizeEnrollmentMutationInput,
    ) => {
      toast.success("Node enrolled", {
        description: `${variables.payload.nodeName} was added to the control plane inventory.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nodes", workspaceId],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: workspaceId ? queryKeys.dashboard.overview(workspaceId) : ["dashboard"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey:
            workspaceId
              ? queryKeys.nodes.detail(workspaceId, enrollment.nodeId)
              : ["nodes", "detail", enrollment.nodeId],
          refetchType: "active",
        }),
      ]);

      return enrollment;
    },
  });
};

export const useInstallPackages = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: InstallPackagesPayload) =>
      apiClient.installPackages({
        ...payload,
        workspaceId: requireWorkspaceId(workspaceId),
      }),
    onSuccess: async (task, payload) => {
      const packageLabel =
        payload.names.length === 1
          ? payload.names[0]
          : `${payload.names.length} packages`;

      toast.success("Package install task queued", {
        description: `${packageLabel} will be installed asynchronously on the selected node.`,
      });

      await invalidatePackageQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
        payload.nodeId,
      );
      return task;
    },
    onError: (error) => {
      toast.error("Unable to queue package install", {
        description: readMutationError(error),
      });
    },
  });
};

export const useRemovePackage = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: RemovePackagePayload) =>
      apiClient.removeNodePackage({
        ...payload,
        workspaceId: requireWorkspaceId(workspaceId),
      }),
    onSuccess: async (_, payload) => {
      toast.success("Package removal task queued", {
        description: payload.purge
          ? `${payload.name} and its configuration files will be removed asynchronously.`
          : `${payload.name} will be removed asynchronously on the selected node.`,
      });

      await invalidatePackageQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
        payload.nodeId,
      );
    },
    onError: (error) => {
      toast.error("Unable to queue package removal", {
        description: readMutationError(error),
      });
    },
  });
};

export const useWorkspaceMembers = (enabled = true) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey:
      workspaceId
        ? queryKeys.workspaces.members(workspaceId)
        : ["workspaces", "members", "idle"],
    queryFn: () => apiClient.getWorkspaceMembers(workspaceId!),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 15_000,
  });
};

export const useWorkspaceTeams = (enabled = true) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery({
    queryKey:
      workspaceId
        ? queryKeys.workspaces.teams(workspaceId)
        : ["workspaces", "teams", "idle"],
    queryFn: () => apiClient.getWorkspaceTeams(workspaceId!),
    enabled: enabled && Boolean(workspaceId),
    staleTime: 15_000,
  });
};

export const useWorkspaceTeamMembers = (teamId: string, enabled = true) => {
  const { workspaceId } = useWorkspaceContext();

  return useQuery<TeamMembershipDto[]>({
    queryKey:
      workspaceId && teamId
        ? queryKeys.workspaces.teamMembers(workspaceId, teamId)
        : ["workspaces", "team-members", "idle", teamId],
    queryFn: () => apiClient.getWorkspaceTeamMembers(workspaceId!, teamId),
    enabled: enabled && Boolean(workspaceId && teamId),
    staleTime: 15_000,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateWorkspacePayload) => apiClient.createWorkspace(payload),
    onSuccess: async (workspace) => {
      toast.success("Workspace created", {
        description: workspace.name,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.all,
        refetchType: "active",
      });
    },
    onError: (error) => {
      toast.error("Unable to create workspace", {
        description: readMutationError(error),
      });
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) =>
      apiClient.updateWorkspace(requireWorkspaceId(workspaceId), payload),
    onSuccess: async (workspace) => {
      toast.success("Workspace updated", {
        description: workspace.name,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.detail(workspace.id),
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to update workspace", {
        description: readMutationError(error),
      });
    },
  });
};

export const useUpdateWorkspaceRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { workspaceId: string; payload: UpdateWorkspacePayload }) =>
      apiClient.updateWorkspace(input.workspaceId, input.payload),
    onSuccess: async (workspace) => {
      toast.success("Workspace updated", {
        description: workspace.name,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.detail(workspace.id),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "workspaces" &&
            query.queryKey[1] === workspace.id &&
            query.queryKey[2] === "search",
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to update workspace", {
        description: readMutationError(error),
      });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: () =>
      apiClient.deleteWorkspace(requireWorkspaceId(workspaceId)),
    onSuccess: async (result: DeleteWorkspaceResponse) => {
      toast.success("Workspace deleted", {
        description: result.slug,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.detail(result.id),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["nodes", result.id],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", result.id],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard", "overview", result.id],
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to delete workspace", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateWorkspaceMemberPayload) =>
      apiClient.createWorkspaceMember(requireWorkspaceId(workspaceId), payload),
    onSuccess: async (membership: WorkspaceMembershipDto) => {
      toast.success("Member added", {
        description: membership.userEmail ?? membership.userName ?? "Workspace member added.",
      });
      await invalidateWorkspaceUserQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
      );
    },
    onError: (error) => {
      toast.error("Unable to add member", {
        description: readMutationError(error),
      });
    },
  });
};

export const useUpdateWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (input: { membershipId: string; payload: UpdateWorkspaceMemberPayload }) =>
      apiClient.updateWorkspaceMember(
        requireWorkspaceId(workspaceId),
        input.membershipId,
        input.payload,
      ),
    onSuccess: async () => {
      await invalidateWorkspaceUserQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
      );
    },
  });
};

export const useDeleteWorkspaceMember = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (membershipId: string) =>
      apiClient.deleteWorkspaceMember(
        requireWorkspaceId(workspaceId),
        membershipId,
      ),
    onSuccess: async () => {
      toast.success("Member removed");
      await invalidateWorkspaceUserQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
      );
    },
  });
};

export const useCreateWorkspaceTeam = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: CreateTeamPayload) =>
      apiClient.createWorkspaceTeam(requireWorkspaceId(workspaceId), payload),
    onSuccess: async (team) => {
      toast.success("Team created", {
        description: team.name,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.teams(requireWorkspaceId(workspaceId)),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "workspaces" &&
            query.queryKey[1] === requireWorkspaceId(workspaceId) &&
            query.queryKey[2] === "search",
          refetchType: "active",
        }),
      ]);
    },
  });
};

export const useUpdateWorkspaceTeam = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (input: { teamId: string; payload: UpdateTeamPayload }) =>
      apiClient.updateWorkspaceTeam(
        requireWorkspaceId(workspaceId),
        input.teamId,
        input.payload,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.teams(requireWorkspaceId(workspaceId)),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "workspaces" &&
            query.queryKey[1] === requireWorkspaceId(workspaceId) &&
            query.queryKey[2] === "search",
          refetchType: "active",
        }),
      ]);
    },
  });
};

export const useDeleteWorkspaceTeam = () => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (teamId: string) =>
      apiClient.deleteWorkspaceTeam(requireWorkspaceId(workspaceId), teamId),
    onSuccess: async () => {
      toast.success("Team deleted");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaces.teams(requireWorkspaceId(workspaceId)),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "workspaces" &&
            query.queryKey[1] === requireWorkspaceId(workspaceId) &&
            query.queryKey[2] === "search",
          refetchType: "active",
        }),
      ]);
    },
  });
};

export const useAddWorkspaceTeamMember = (teamId: string) => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (payload: AddTeamMemberPayload) =>
      apiClient.addWorkspaceTeamMember(
        requireWorkspaceId(workspaceId),
        teamId,
        payload,
      ),
    onSuccess: async () => {
      await invalidateWorkspaceUserQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
      );
    },
  });
};

export const useDeleteWorkspaceTeamMember = (teamId: string) => {
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspaceContext();

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.deleteWorkspaceTeamMember(
        requireWorkspaceId(workspaceId),
        teamId,
        userId,
      ),
    onSuccess: async () => {
      await invalidateWorkspaceUserQueries(
        queryClient,
        requireWorkspaceId(workspaceId),
      );
    },
  });
};
