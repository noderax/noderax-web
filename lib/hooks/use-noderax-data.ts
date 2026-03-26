"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, apiClient } from "@/lib/api";
import type {
  AuthSession,
  CancelTaskPayload,
  CancelTaskResponse,
  CreateBatchScheduledTaskPayload,
  CreateBatchTaskPayload,
  CreateScheduledTaskPayload,
  CreateNodePayload,
  CreateTaskPayload,
  CreateUserPayload,
  EventFilters,
  FinalizeEnrollmentPayload,
  FinalizeEnrollmentResponse,
  InstallPackagesPayload,
  MetricFilters,
  NodeFilters,
  RemovePackagePayload,
  UpdateScheduledTaskPayload,
  UpdateUserPreferencesPayload,
  TaskFilters,
  TaskStatus,
} from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const readMutationError = (error: unknown) =>
  error instanceof Error ? error.message : "Request failed unexpectedly.";

export const queryKeys = {
  dashboard: {
    overview: ["dashboard", "overview"] as const,
  },
  users: {
    all: ["users", "list"] as const,
  },
  nodes: {
    all: (filters?: NodeFilters) => ["nodes", "list", filters ?? {}] as const,
    detail: (id: string) => ["nodes", "detail", id] as const,
  },
  tasks: {
    all: (filters?: TaskFilters) => ["tasks", "list", filters ?? {}] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    logs: (id: string, limit = 100) => ["tasks", "logs", id, limit] as const,
  },
  scheduledTasks: {
    all: ["scheduled-tasks", "list"] as const,
  },
  events: {
    all: (filters?: EventFilters) => ["events", "list", filters ?? {}] as const,
  },
  metrics: {
    all: (filters?: MetricFilters) =>
      ["metrics", "list", filters ?? {}] as const,
  },
  enrollments: {
    status: (token: string) => ["enrollments", "status", token] as const,
  },
  packages: {
    installed: (nodeId: string) => ["packages", "installed", nodeId] as const,
    search: (nodeId: string, term: string) =>
      ["packages-search", nodeId, term] as const,
  },
};

export const useDashboardOverview = () =>
  useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: () => apiClient.getDashboardOverview(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

export const useUsers = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.users.all,
    queryFn: apiClient.getUsers,
    enabled,
    staleTime: 15_000,
  });

export const useNodes = (filters?: NodeFilters) =>
  useQuery({
    queryKey: queryKeys.nodes.all(filters),
    queryFn: () => apiClient.getNodeSummaries(filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useNode = (id: string) =>
  useQuery({
    queryKey: queryKeys.nodes.detail(id),
    queryFn: () => apiClient.getNodeDetail(id),
    enabled: Boolean(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useTasks = (filters?: TaskFilters) =>
  useQuery({
    queryKey: queryKeys.tasks.all(filters),
    queryFn: () => apiClient.getTaskSummaries(filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => apiClient.getTaskDetail(id),
    enabled: Boolean(id),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useScheduledTasks = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.scheduledTasks.all,
    queryFn: () => apiClient.getScheduledTaskSummaries(),
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useTaskLogs = (
  id: string,
  options?: {
    limit?: number;
    liveForStatus?: TaskStatus | null;
  },
) =>
  useQuery({
    queryKey: queryKeys.tasks.logs(id, options?.limit ?? 100),
    queryFn: () =>
      apiClient.getTaskLogLines(id, { limit: options?.limit ?? 100 }),
    enabled: Boolean(id),
    staleTime: 2_000,
    refetchInterval: options?.liveForStatus === "running" ? 2_000 : false,
  });

export const useEvents = (filters?: EventFilters) =>
  useQuery({
    queryKey: queryKeys.events.all(filters),
    queryFn: () => apiClient.getEventRecords(filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useMetrics = (filters?: MetricFilters) =>
  useQuery({
    queryKey: queryKeys.metrics.all(filters),
    queryFn: () => apiClient.getMetrics(filters),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useCheckEnrollment = (token: string) => {
  const normalizedToken = token.trim();

  return useQuery({
    queryKey: queryKeys.enrollments.status(normalizedToken),
    queryFn: () => apiClient.checkEnrollmentStatus(normalizedToken),
    enabled: normalizedToken.length >= 8,
    staleTime: 5_000,
  });
};

export const useNodePackages = (nodeId: string) =>
  useQuery({
    queryKey: queryKeys.packages.installed(nodeId),
    queryFn: ({ signal }) => apiClient.getNodePackages(nodeId, { signal }),
    enabled: Boolean(nodeId),
    staleTime: 15_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

export const useSearchPackages = (term: string, nodeId: string) => {
  const normalizedTerm = term.trim();

  return useQuery({
    queryKey: queryKeys.packages.search(nodeId, normalizedTerm),
    queryFn: ({ signal }) =>
      apiClient.searchPackages(normalizedTerm, nodeId, { signal }),
    enabled: Boolean(nodeId) && normalizedTerm.length >= 2,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

const invalidatePackageQueries = async (
  queryClient: ReturnType<typeof useQueryClient>,
  nodeId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.packages.installed(nodeId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: ["packages-search", nodeId],
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.nodes.detail(nodeId),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: ["tasks", "list"],
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.dashboard.overview,
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
      toast.success("User created", {
        description: `${user.name} can now access the workspace.`,
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

      toast.success("Timezone updated", {
        description: `Absolute timestamps now render in ${user.timezone}.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.scheduledTasks.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to update timezone", {
        description: readMutationError(error),
      });
    },
  });
};

export const useCreateNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateNodePayload) => apiClient.createNode(payload),
    onSuccess: async (node) => {
      toast.success("Node added", {
        description: `${node.name} was added to the node inventory.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nodes", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
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

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteNode(id),
    onSuccess: async (_, nodeId) => {
      toast.success("Node deleted", {
        description: "The node was removed from inventory.",
      });
      queryClient.removeQueries({
        queryKey: queryKeys.nodes.detail(nodeId),
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nodes", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
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

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => apiClient.createTask(payload),
    onSuccess: async (task, payload) => {
      toast.success("Task queued", {
        description: `${task.type} was created for the selected node.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.nodes.detail(payload.nodeId),
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

  return useMutation({
    mutationFn: (payload: CreateBatchTaskPayload) =>
      apiClient.createBatchTasks(payload),
    onSuccess: async (tasks, payload) => {
      toast.success("Tasks queued", {
        description: `${tasks.length} ${tasks.length === 1 ? "task was" : "tasks were"} created across ${payload.nodeIds.length} ${payload.nodeIds.length === 1 ? "node" : "nodes"}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
          refetchType: "active",
        }),
        ...payload.nodeIds.map((nodeId) =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.nodes.detail(nodeId),
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

  return useMutation({
    mutationFn: (payload: CreateScheduledTaskPayload) =>
      apiClient.createScheduledTask(payload),
    onSuccess: async (schedule) => {
      toast.success("Scheduled task created", {
        description: `${schedule.name} will start running on its next scheduled slot in ${schedule.timezone}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.scheduledTasks.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
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

  return useMutation({
    mutationFn: (payload: CreateBatchScheduledTaskPayload) =>
      apiClient.createBatchScheduledTasks(payload),
    onSuccess: async (schedules, payload) => {
      const timezone = schedules[0]?.timezone;

      toast.success("Scheduled tasks created", {
        description: `${schedules.length} ${schedules.length === 1 ? "schedule was" : "schedules were"} created across ${payload.nodeIds.length} ${payload.nodeIds.length === 1 ? "node" : "nodes"}${timezone ? ` in ${timezone}` : ""}.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.scheduledTasks.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
          refetchType: "active",
        }),
        ...payload.nodeIds.map((nodeId) =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.nodes.detail(nodeId),
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

  return useMutation({
    mutationFn: (input: { id: string; payload: UpdateScheduledTaskPayload }) =>
      apiClient.updateScheduledTask(input.id, input.payload),
    onSuccess: async (schedule) => {
      toast.success(
        schedule.enabled ? "Scheduled task enabled" : "Scheduled task disabled",
        {
          description: schedule.name,
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.scheduledTasks.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
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

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteScheduledTask(id),
    onSuccess: async () => {
      toast.success("Scheduled task deleted");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.scheduledTasks.all,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: ["events", "list"],
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

  return useMutation<CancelTaskResponse, unknown, CancelTaskMutationInput>({
    mutationFn: ({ taskId, payload }) => apiClient.cancelTask(taskId, payload),
    onSuccess: async (task, variables) => {
      if (task.status === "cancelled") {
        toast.success("Task stopped.");
      } else {
        toast.info("Stop request sent. Task is shutting down safely.");
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["tasks", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.tasks.detail(variables.taskId),
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
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

  return useMutation({
    mutationFn: ({ token, payload }: FinalizeEnrollmentMutationInput) =>
      apiClient.finalizeNodeEnrollment(token, payload),
    onSuccess: async (
      enrollment: FinalizeEnrollmentResponse,
      variables: FinalizeEnrollmentMutationInput,
    ) => {
      toast.success("Node enrolled", {
        description: `${variables.payload.nodeName} was added to the control plane inventory.`,
      });

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nodes", "list"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.dashboard.overview,
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.nodes.detail(enrollment.nodeId),
          refetchType: "active",
        }),
      ]);

      return enrollment;
    },
  });
};

export const useInstallPackages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: InstallPackagesPayload) =>
      apiClient.installPackages(payload),
    onSuccess: async (task, payload) => {
      const packageLabel =
        payload.names.length === 1
          ? payload.names[0]
          : `${payload.names.length} packages`;

      toast.success("Package install task queued", {
        description: `${packageLabel} will be installed asynchronously on the selected node.`,
      });

      await invalidatePackageQueries(queryClient, payload.nodeId);
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

  return useMutation({
    mutationFn: (payload: RemovePackagePayload) =>
      apiClient.removeNodePackage(payload),
    onSuccess: async (_, payload) => {
      toast.success("Package removal task queued", {
        description: payload.purge
          ? `${payload.name} and its configuration files will be removed asynchronously.`
          : `${payload.name} will be removed asynchronously on the selected node.`,
      });

      await invalidatePackageQueries(queryClient, payload.nodeId);
    },
    onError: (error) => {
      toast.error("Unable to queue package removal", {
        description: readMutationError(error),
      });
    },
  });
};
