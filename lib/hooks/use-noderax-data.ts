"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import type { EventFilters, MetricFilters, NodeFilters, TaskFilters, TaskStatus } from "@/lib/types";

export const queryKeys = {
  dashboard: {
    overview: ["dashboard", "overview"] as const,
  },
  nodes: {
    all: (filters?: NodeFilters) => ["nodes", "list", filters ?? {}] as const,
    detail: (id: string) => ["nodes", "detail", id] as const,
  },
  tasks: {
    all: (filters?: TaskFilters) => ["tasks", "list", filters ?? {}] as const,
    detail: (id: string) => ["tasks", "detail", id] as const,
    logs: (id: string, limit = 200) => ["tasks", "logs", id, limit] as const,
  },
  events: {
    all: (filters?: EventFilters) => ["events", "list", filters ?? {}] as const,
  },
  metrics: {
    all: (filters?: MetricFilters) => ["metrics", "list", filters ?? {}] as const,
  },
};

export const useDashboardOverview = () =>
  useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: apiClient.getDashboardOverview,
    staleTime: 15_000,
  });

export const useNodes = (filters?: NodeFilters) =>
  useQuery({
    queryKey: queryKeys.nodes.all(filters),
    queryFn: () => apiClient.getNodeSummaries(filters),
    staleTime: 15_000,
  });

export const useNode = (id: string) =>
  useQuery({
    queryKey: queryKeys.nodes.detail(id),
    queryFn: () => apiClient.getNodeDetail(id),
    enabled: Boolean(id),
    staleTime: 15_000,
  });

export const useTasks = (filters?: TaskFilters) =>
  useQuery({
    queryKey: queryKeys.tasks.all(filters),
    queryFn: () => apiClient.getTaskSummaries(filters),
    staleTime: 15_000,
  });

export const useTask = (id: string) =>
  useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => apiClient.getTaskDetail(id),
    enabled: Boolean(id),
    staleTime: 10_000,
  });

export const useTaskLogs = (
  id: string,
  options?: {
    limit?: number;
    liveForStatus?: TaskStatus | null;
  },
) =>
  useQuery({
    queryKey: queryKeys.tasks.logs(id, options?.limit ?? 200),
    queryFn: () => apiClient.getTaskLogLines(id, { limit: options?.limit ?? 200 }),
    enabled: Boolean(id),
    staleTime: 2_000,
    refetchInterval:
      options?.liveForStatus === "running" ? 2_000 : false,
  });

export const useEvents = (filters?: EventFilters) =>
  useQuery({
    queryKey: queryKeys.events.all(filters),
    queryFn: () => apiClient.getEventRecords(filters),
    staleTime: 10_000,
  });

export const useMetrics = (filters?: MetricFilters) =>
  useQuery({
    queryKey: queryKeys.metrics.all(filters),
    queryFn: () => apiClient.getMetrics(filters),
    staleTime: 10_000,
  });
