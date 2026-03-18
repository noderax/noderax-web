"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import type { LoginPayload } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export const sessionQueryKey = ["auth", "session"] as const;

const isAccountScopedQuery = (query: Query) => query.queryKey[0] !== "auth";

const refreshAccountQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: isAccountScopedQuery,
    refetchType: "active",
  });

export const useAuthSession = () => {
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);
  const clearSession = useAppStore((state) => state.clearSession);
  const storedSession = useAppStore((state) => state.session);

  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: apiClient.getSession,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      if (storedSession?.user.id && storedSession.user.id !== query.data.user.id) {
        void refreshAccountQueries(queryClient);
      }

      setSession(query.data);
    }
  }, [query.data, queryClient, setSession, storedSession?.user.id]);

  useEffect(() => {
    if (query.error) {
      clearSession();
    }
  }, [query.error, clearSession]);

  return {
    ...query,
    session: query.data ?? storedSession,
  };
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => apiClient.login(payload),
    onSuccess: (session) => {
      setSession(session);
      queryClient.setQueryData(sessionQueryKey, session);
      void refreshAccountQueries(queryClient);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const clearSession = useAppStore((state) => state.clearSession);

  return useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => {
      clearSession();
      queryClient.clear();
    },
  });
};
