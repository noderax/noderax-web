"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  LoaderCircle,
  RefreshCcw,
  ServerCog,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { useControlPlaneUpdateSummary } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type {
  ControlPlaneUpdateOperation,
  ControlPlaneUpdateStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const BLOCKING_STATUSES = new Set<ControlPlaneUpdateStatus>([
  "applying",
  "recreating_services",
]);
const STORAGE_KEY = "noderax.control-plane-apply-snapshot";
const SNAPSHOT_EVENT = "noderax:control-plane-apply-snapshot";
const STAGE_ESTIMATES: Record<ControlPlaneUpdateStatus, number> = {
  queued: 20,
  downloading: 90,
  verifying: 45,
  extracting: 60,
  loading_images: 75,
  prepared: 15,
  applying: 180,
  recreating_services: 150,
  completed: 0,
  failed: 0,
};

type StoredSnapshot = {
  operation: ControlPlaneUpdateOperation;
  savedAt: string;
};

const readStoredSnapshot = (): ControlPlaneUpdateOperation | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredSnapshot;
    if (!parsed?.operation || !BLOCKING_STATUSES.has(parsed.operation.status)) {
      return null;
    }

    return parsed.operation;
  } catch {
    return null;
  }
};

const persistSnapshot = (operation: ControlPlaneUpdateOperation) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      operation,
      savedAt: new Date().toISOString(),
    } satisfies StoredSnapshot),
  );
};

const clearSnapshot = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
};

const emitSnapshotChange = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(SNAPSHOT_EVENT));
};

const subscribeToSnapshot = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => callback();
  window.addEventListener(SNAPSHOT_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(SNAPSHOT_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
};

const formatRemaining = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
};

const getOperationHeadline = (status: ControlPlaneUpdateStatus) => {
  switch (status) {
    case "recreating_services":
      return "Restarting runtime services";
    case "applying":
      return "Applying prepared control-plane update";
    default:
      return "Control-plane update in progress";
  }
};

const getOperationDescription = (
  operation: ControlPlaneUpdateOperation,
  isUsingStoredSnapshot: boolean,
) => {
  if (isUsingStoredSnapshot) {
    return "The control plane is still recovering from a runtime restart. Keep this page idle until the API and web containers answer again.";
  }

  return (
    operation.message ??
    "API, web, and nginx are being recycled against the prepared bundle. Interactive surfaces are locked until the runtime health checks settle."
  );
};

export const ControlPlaneUpdateFreeze = () => {
  const { isPlatformAdmin } = useWorkspaceContext();
  const controlPlaneSummaryQuery = useControlPlaneUpdateSummary(isPlatformAdmin);
  const liveOperation = controlPlaneSummaryQuery.data?.operation ?? null;
  const [tick, setTick] = useState(() => Date.now());
  const storedOperation = useSyncExternalStore(
    subscribeToSnapshot,
    readStoredSnapshot,
    () => null,
  );

  useEffect(() => {
    if (!isPlatformAdmin) {
      clearSnapshot();
      emitSnapshotChange();
      return;
    }
  }, [isPlatformAdmin]);

  useEffect(() => {
    if (!isPlatformAdmin) {
      return;
    }

    if (liveOperation && BLOCKING_STATUSES.has(liveOperation.status)) {
      persistSnapshot(liveOperation);
      emitSnapshotChange();
      return;
    }

    if (controlPlaneSummaryQuery.data) {
      clearSnapshot();
      emitSnapshotChange();
    }
  }, [controlPlaneSummaryQuery.data, isPlatformAdmin, liveOperation]);

  const blockingOperation =
    liveOperation && BLOCKING_STATUSES.has(liveOperation.status)
      ? liveOperation
      : storedOperation;
  const isUsingStoredSnapshot = Boolean(
    blockingOperation &&
      (!liveOperation || !BLOCKING_STATUSES.has(liveOperation.status)),
  );

  useEffect(() => {
    if (!blockingOperation) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [blockingOperation]);

  useEffect(() => {
    if (!blockingOperation) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [blockingOperation]);

  const progressState = useMemo(() => {
    if (!blockingOperation) {
      return null;
    }

    const startedAt =
      Date.parse(blockingOperation.startedAt ?? blockingOperation.requestedAt) ||
      tick;
    const estimateSeconds = STAGE_ESTIMATES[blockingOperation.status] ?? 120;
    const elapsedSeconds = Math.max(0, Math.floor((tick - startedAt) / 1000));
    const remainingSeconds = Math.max(0, estimateSeconds - elapsedSeconds);
    const progressValue =
      estimateSeconds > 0
        ? Math.min(96, Math.round((elapsedSeconds / estimateSeconds) * 100))
        : 100;

    return {
      progressValue,
      remainingSeconds,
    };
  }, [blockingOperation, tick]);

  if (!isPlatformAdmin || !blockingOperation || !progressState) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/72 px-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[28px] border border-border/80 bg-[var(--surface-dialog)] p-6 shadow-[var(--shadow-dashboard-hover)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-tone-warning/30 bg-tone-warning/10 text-tone-warning">
              {isUsingStoredSnapshot ? (
                <ShieldAlert className="size-5" />
              ) : (
                <LoaderCircle className="size-5 animate-spin" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Control-plane maintenance window
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {getOperationHeadline(blockingOperation.status)}
              </h2>
            </div>
          </div>

          <div
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              isUsingStoredSnapshot ? "tone-warning" : "tone-brand",
            )}
          >
            {isUsingStoredSnapshot ? "Waiting for services" : "Live tracking"}
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {getOperationDescription(blockingOperation, isUsingStoredSnapshot)}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
            <p className="text-xs text-muted-foreground">Current stage</p>
            <p className="mt-2 font-semibold capitalize">
              {blockingOperation.status.replaceAll("_", " ")}
            </p>
          </div>
          <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
            <p className="text-xs text-muted-foreground">Estimated remaining</p>
            <p className="mt-2 font-mono text-lg font-semibold">
              {formatRemaining(progressState.remainingSeconds)}
            </p>
          </div>
          <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
            <p className="text-xs text-muted-foreground">Operator action</p>
            <p className="mt-2 text-sm font-medium">
              Do not trigger new changes until the runtime reports healthy.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-border/70 bg-background/82 p-4">
          <Progress value={progressState.progressValue}>
            <ProgressLabel>Estimated recovery window</ProgressLabel>
            <ProgressValue>
              {(_, value) => `${value ?? progressState.progressValue}%`}
            </ProgressValue>
          </Progress>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            This countdown is intentionally approximate. The host supervisor
            will clear the lock once API, web, and nginx health checks settle
            on the new control-plane build.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              window.location.reload();
            }}
          >
            <RefreshCcw className="size-4" />
            Refresh now
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void controlPlaneSummaryQuery.refetch();
            }}
          >
            <ServerCog className="size-4" />
            Retry status probe
          </Button>
        </div>
      </div>
    </div>
  );
};
