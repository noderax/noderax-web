"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export const sessionQueryKey = ["auth", "session"] as const;

export const useAuthSession = () => {
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
      setSession(query.data);
    }
  }, [query.data, setSession]);

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
