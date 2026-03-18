"use client";

import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import type { AuthSession, EventSeverity, RealtimeStatus } from "@/lib/types";

interface AppState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  searchQuery: string;
  eventSeverityFilter: EventSeverity | "all";
  realtimeStatus: RealtimeStatus;
  session: AuthSession | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setEventSeverityFilter: (severity: EventSeverity | "all") => void;
  setRealtimeStatus: (status: RealtimeStatus) => void;
  setSession: (session: AuthSession | null) => void;
  clearSession: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        mobileSidebarOpen: false,
        searchQuery: "",
        eventSeverityFilter: "all",
        realtimeStatus: "idle",
        session: null,
        setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
        toggleSidebar: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
        setEventSeverityFilter: (eventSeverityFilter) =>
          set({ eventSeverityFilter }),
        setRealtimeStatus: (realtimeStatus) => set({ realtimeStatus }),
        setSession: (session) => set({ session }),
        clearSession: () =>
          set({
            session: null,
            searchQuery: "",
            eventSeverityFilter: "all",
          }),
      }),
      {
        name: "noderax-ui-store",
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          eventSeverityFilter: state.eventSeverityFilter,
        }),
      },
    ),
  ),
);
