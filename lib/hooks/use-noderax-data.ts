"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

export const queryKeys = {
  dashboard: {
    overview: ["dashboard", "overview"] as const,
  },
  nodes: {
    all: ["nodes"] as const,
    detail: (id: string) => ["nodes", id] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    detail: (id: string) => ["tasks", id] as const,
  },
  events: {
    all: (severity = "all", query = "") => ["events", severity, query] as const,
  },
};

export const useDashboardOverviewQuery = () =>
  useQuery({
    queryKey: queryKeys.dashboard.overview,
    queryFn: apiClient.getDashboardOverview,
    staleTime: 15_000,
  });

export const useNodesQuery = () =>
  useQuery({
    queryKey: queryKeys.nodes.all,
    queryFn: apiClient.getNodes,
    staleTime: 15_000,
  });

export const useNodeDetailQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.nodes.detail(id),
    queryFn: () => apiClient.getNode(id),
    enabled: Boolean(id),
    staleTime: 15_000,
  });

export const useTasksQuery = () =>
  useQuery({
    queryKey: queryKeys.tasks.all,
    queryFn: apiClient.getTasks,
    staleTime: 15_000,
  });

export const useTaskDetailQuery = (id: string) =>
  useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => apiClient.getTask(id),
    enabled: Boolean(id),
    staleTime: 15_000,
  });

export const useEventsQuery = (filters?: { severity?: string; query?: string }) =>
  useQuery({
    queryKey: queryKeys.events.all(filters?.severity, filters?.query),
    queryFn: () => apiClient.getEvents(filters),
    staleTime: 10_000,
  });
