"use client";

import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";

import type {
  AuthSession,
  EventSeverity,
  RealtimeCounters,
  RealtimeHealthSnapshot,
  RealtimeStatus,
} from "@/lib/types";

const initialRealtimeCounters: RealtimeCounters = {
  reconnectAttempts: 0,
  reconnectSuccesses: 0,
  droppedStaleEvents: 0,
  droppedDuplicateEvents: 0,
  metricQueueDepth: 0,
  metricQueueHighWaterMark: 0,
  metricFlushCount: 0,
  metricDroppedFrames: 0,
};

const initialRealtimeHealth: RealtimeHealthSnapshot = {
  status: "idle",
  lastEventAt: null,
  lastHeartbeatAt: null,
  eventAgeMs: null,
  degradedReason: null,
};

interface AppState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  searchQuery: string;
  eventSeverityFilter: EventSeverity | "all";
  realtimeStatus: RealtimeStatus;
  realtimeHealth: RealtimeHealthSnapshot;
  realtimeCounters: RealtimeCounters;
  session: AuthSession | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setEventSeverityFilter: (severity: EventSeverity | "all") => void;
  setRealtimeStatus: (status: RealtimeStatus) => void;
  patchRealtimeHealth: (patch: Partial<RealtimeHealthSnapshot>) => void;
  bumpRealtimeCounter: (key: keyof RealtimeCounters, value?: number) => void;
  setRealtimeCounter: (key: keyof RealtimeCounters, value: number) => void;
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
        realtimeHealth: initialRealtimeHealth,
        realtimeCounters: initialRealtimeCounters,
        session: null,
        setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
        toggleSidebar: () =>
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
        setEventSeverityFilter: (eventSeverityFilter) =>
          set({ eventSeverityFilter }),
        setRealtimeStatus: (realtimeStatus) =>
          set((state) => ({
            realtimeStatus,
            realtimeHealth: {
              ...state.realtimeHealth,
              status: realtimeStatus,
            },
          })),
        patchRealtimeHealth: (patch) =>
          set((state) => ({
            realtimeHealth: {
              ...state.realtimeHealth,
              ...patch,
            },
          })),
        bumpRealtimeCounter: (key, value = 1) =>
          set((state) => ({
            realtimeCounters: {
              ...state.realtimeCounters,
              [key]: state.realtimeCounters[key] + value,
            },
          })),
        setRealtimeCounter: (key, value) =>
          set((state) => ({
            realtimeCounters: {
              ...state.realtimeCounters,
              [key]: value,
            },
          })),
        setSession: (session) => set({ session }),
        clearSession: () =>
          set({
            session: null,
            searchQuery: "",
            eventSeverityFilter: "all",
            realtimeStatus: "idle",
            realtimeHealth: initialRealtimeHealth,
            realtimeCounters: initialRealtimeCounters,
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
