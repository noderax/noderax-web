"use client";

import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { SectionPanel } from "@/components/ui/section-panel";
import { Separator } from "@/components/ui/separator";
import { TimeDisplay } from "@/components/ui/time-display";
import { apiClient } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const formatCounterLabel = (key: string) =>
  key
    .replace(/\[[0-9]+\]/g, "")
    .split(/[._-]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatCounterValue = (value: number | undefined) =>
  typeof value === "number" ? value.toLocaleString() : "N/A";

export const TaskFlowDiagnostics = () => {
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);
  const realtimeCounters = useAppStore((state) => state.realtimeCounters);

  const diagnosticsQuery = useQuery({
    queryKey: ["diagnostics", "task-flow"],
    queryFn: () => apiClient.getTaskFlowDiagnostics(),
    staleTime: 5_000,
    refetchInterval: 10_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const backendAgentCounters = diagnosticsQuery.data?.agentCounters ?? {};
  const backendClaimEntries = Object.entries(
    diagnosticsQuery.data?.claimCounters ?? {},
  ).sort((left, right) => right[1] - left[1]);

  return (
    <SectionPanel
      eyebrow="Diagnostics"
      title="Agent task flow"
      description="Backend counters for realtime ingestion and task claim health. Useful when agents appear online but tasks remain queued."
      contentClassName="space-y-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="surface-subtle rounded-[16px] border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Backend metrics.ingested
          </p>
          <p className="mt-2 text-xl font-semibold">
            {diagnosticsQuery.isPending
              ? "Loading..."
              : formatCounterValue(backendAgentCounters["metrics.ingested"])}
          </p>
        </div>
        <div className="surface-subtle rounded-[16px] border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Backend connection.opened
          </p>
          <p className="mt-2 text-xl font-semibold">
            {diagnosticsQuery.isPending
              ? "Loading..."
              : formatCounterValue(backendAgentCounters["connection.opened"])}
          </p>
        </div>
      </div>

      <div className="surface-subtle rounded-[16px] border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Realtime bridge status
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
            <Activity className="size-3.5" />
            {realtimeStatus}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
            Metric flushes: {realtimeCounters.metricFlushCount.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
            Reconnects: {realtimeCounters.reconnectAttempts.toLocaleString()}
          </span>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Task claim counters
        </p>

        {diagnosticsQuery.isError ? (
          <div className="flex items-start gap-2 rounded-[14px] border border-tone-warning/40 bg-tone-warning/10 px-3 py-2 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tone-warning" />
            <p>
              Task flow diagnostics endpoint is unavailable. Realtime task
              updates remain active, but backend claim counters could not be
              loaded.
            </p>
          </div>
        ) : backendClaimEntries.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {backendClaimEntries.slice(0, 9).map(([key, value]) => (
              <div
                key={key}
                className="surface-subtle rounded-[14px] border px-3 py-2"
              >
                <p className="text-xs text-muted-foreground">
                  {formatCounterLabel(key)}
                </p>
                <p className="mt-1 font-semibold">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : diagnosticsQuery.isPending ? (
          <div className="rounded-[14px] border px-3 py-2 text-sm text-muted-foreground">
            Loading claim counters...
          </div>
        ) : (
          <div className="rounded-[14px] border px-3 py-2 text-sm text-muted-foreground">
            No task claim counters were returned by the backend payload.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {diagnosticsQuery.isError ? (
            <AlertTriangle className="size-3.5 text-tone-warning" />
          ) : (
            <CheckCircle2 className="size-3.5 text-tone-success" />
          )}
          Source: {diagnosticsQuery.data?.sourcePath ?? "unavailable"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5" />
          Last refresh:{" "}
          <TimeDisplay
            value={diagnosticsQuery.data?.fetchedAt ?? null}
            mode="relative"
            emptyLabel="never"
          />
        </span>
      </div>
    </SectionPanel>
  );
};
