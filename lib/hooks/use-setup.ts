"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";

export const setupStatusQueryKey = ["setup", "status"] as const;
export const setupApiConfigQueryKey = ["setup", "api-config"] as const;
export const setupRuntimePresetQueryKey = ["setup", "runtime-preset"] as const;

export const useSetupStatus = () =>
  useQuery({
    queryKey: setupStatusQueryKey,
    queryFn: apiClient.getSetupStatus,
    retry: false,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

export const useSetupApiConfig = () =>
  useQuery({
    queryKey: setupApiConfigQueryKey,
    queryFn: apiClient.getSetupApiConfig,
    retry: false,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });

export const useSetupRuntimePreset = () =>
  useQuery({
    queryKey: setupRuntimePresetQueryKey,
    queryFn: apiClient.getSetupRuntimePreset,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

export const useValidateSetupPostgres = () =>
  useMutation({
    mutationFn: apiClient.validateSetupPostgres,
  });

export const useValidateSetupRedis = () =>
  useMutation({
    mutationFn: apiClient.validateSetupRedis,
  });

export const useValidateSetupSmtp = () =>
  useMutation({
    mutationFn: apiClient.validateSetupSmtp,
  });

export const useInstallSetup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.installSetup,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: setupStatusQueryKey,
      });
    },
  });
};

export const useUpdateSetupApiConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.updateSetupApiConfig,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: setupApiConfigQueryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: setupStatusQueryKey,
        }),
      ]);
    },
  });
};
