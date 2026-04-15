"use client";

import { useEffect } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";

import { ApiError, apiClient } from "@/lib/api";
import { clearPersistedWorkspaceSlug } from "@/lib/workspace";
import type {
  AuthSession,
  LoginPayload,
  VerifyMfaChallengePayload,
  VerifyMfaRecoveryPayload,
} from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export const sessionQueryKey = ["auth", "session"] as const;

const isAuthSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.tokenPreview === "string" &&
    Array.isArray(record.scopes) &&
    !!record.user
  );
};

const isAccountScopedQuery = (query: Query) => query.queryKey[0] !== "auth";

const refreshAccountQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({
    predicate: isAccountScopedQuery,
    refetchType: "active",
  });

export const useAuthSession = () => {
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);
  const setActiveWorkspaceSlug = useAppStore(
    (state) => state.setActiveWorkspaceSlug,
  );
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
        setActiveWorkspaceSlug(null);
        clearPersistedWorkspaceSlug();
        void refreshAccountQueries(queryClient);
      }

      setSession(query.data);
    }
  }, [
    query.data,
    queryClient,
    setActiveWorkspaceSlug,
    setSession,
    storedSession?.user.id,
  ]);

  useEffect(() => {
    if (query.error instanceof ApiError && query.error.status === 401) {
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
    onSuccess: (sessionOrChallenge) => {
      if (!isAuthSession(sessionOrChallenge)) {
        return;
      }

      setSession(sessionOrChallenge);
      queryClient.setQueryData(sessionQueryKey, sessionOrChallenge);
      void refreshAccountQueries(queryClient);
    },
  });
};

export const useVerifyMfaChallenge = () => {
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: VerifyMfaChallengePayload) =>
      apiClient.verifyMfaChallenge(payload),
    onSuccess: (session) => {
      setSession(session);
      queryClient.setQueryData(sessionQueryKey, session);
      void refreshAccountQueries(queryClient);
    },
  });
};

export const useVerifyMfaRecovery = () => {
  const queryClient = useQueryClient();
  const setSession = useAppStore((state) => state.setSession);

  return useMutation({
    mutationFn: (payload: VerifyMfaRecoveryPayload) =>
      apiClient.verifyMfaRecovery(payload),
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
