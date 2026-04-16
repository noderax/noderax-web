"use client";

import {
  LoaderCircle,
  RefreshCcw,
  ServerCog,
  ShieldAlert,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  clearMaintenanceSnapshot,
  consumeMaintenanceCompletion,
  type MaintenanceKind,
  type MaintenanceRecoveryStatus,
  type MaintenanceSnapshot,
  persistMaintenanceCompletion,
  persistMaintenanceSnapshot,
  readMaintenanceSnapshotFromBrowser,
  subscribeToMaintenanceSnapshot,
} from "@/lib/maintenance";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 2_500;
const STAGE_ESTIMATES_SECONDS: Record<string, number> = {
  polling: 90,
  queued: 20,
  downloading: 90,
  verifying: 45,
  extracting: 60,
  loading_images: 75,
  prepared: 15,
  applying: 180,
  recreating_services: 150,
  failed: 0,
};
const TIMEOUT_SECONDS_BY_KIND: Record<MaintenanceKind, number> = {
  control_plane_update: 360,
  platform_api_restart: 120,
};

type RecoveryProbeResponse = {
  status: MaintenanceRecoveryStatus;
  kind?: MaintenanceKind;
  message?: string | null;
  observedDowntime?: boolean;
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

const getHeadline = (snapshot: MaintenanceSnapshot) => {
  if (snapshot.kind === "platform_api_restart") {
    return "Restarting platform API";
  }

  switch (snapshot.status) {
    case "recreating_services":
      return "Restarting runtime services";
    case "applying":
      return "Applying prepared control-plane update";
    case "failed":
      return "Control-plane update failed";
    default:
      return "Control-plane maintenance in progress";
  }
};

const getDescription = (
  snapshot: MaintenanceSnapshot,
  status: MaintenanceRecoveryStatus,
  message?: string | null,
) => {
  if (status === "failed") {
    return (
      message ??
      snapshot.message ??
      "The backend is reachable again, but the maintenance operation reported a failure. Keep the page idle, verify the host-side state, and retry the status probe."
    );
  }

  if (snapshot.kind === "platform_api_restart") {
    return (
      message ??
      snapshot.message ??
      "The API process is cycling. This page is intentionally frozen until the new process reports healthy again."
    );
  }

  return (
    message ??
    snapshot.message ??
    "API, web, and nginx are being recycled against the prepared bundle. This page will reload automatically once the new runtime reports healthy."
  );
};

const getCompletion = (snapshot: MaintenanceSnapshot) => {
  if (snapshot.kind === "platform_api_restart") {
    return {
      title: "API restart complete",
      description: "The platform API reported healthy again. Reloading the page.",
    };
  }

  return {
    title: "Control-plane update complete",
    description:
      "The updated control plane is healthy again. Reloading the page.",
  };
};

export const GlobalMaintenanceGate = ({
  initialSnapshot,
}: {
  initialSnapshot: MaintenanceSnapshot | null;
}) => {
  const seededInitialSnapshotRef = useRef(false);
  const maintenanceSnapshot = useSyncExternalStore(
    subscribeToMaintenanceSnapshot,
    readMaintenanceSnapshotFromBrowser,
    () => initialSnapshot,
  );

  useEffect(() => {
    const completion = consumeMaintenanceCompletion();
    if (!completion) {
      return;
    }

    toast.success(completion.title, {
      description: completion.description,
    });
  }, []);

  useEffect(() => {
    if (
      seededInitialSnapshotRef.current ||
      !initialSnapshot ||
      maintenanceSnapshot
    ) {
      return;
    }

    seededInitialSnapshotRef.current = true;
    persistMaintenanceSnapshot(initialSnapshot);
  }, [initialSnapshot, maintenanceSnapshot]);

  if (!maintenanceSnapshot) {
    return null;
  }

  const snapshotKey = [
    maintenanceSnapshot.kind,
    maintenanceSnapshot.status,
    maintenanceSnapshot.startedAt,
    maintenanceSnapshot.requestedAt ?? "",
  ].join(":");

  return (
    <ActiveMaintenanceOverlay
      key={snapshotKey}
      snapshot={maintenanceSnapshot}
    />
  );
};

const ActiveMaintenanceOverlay = ({
  snapshot,
}: {
  snapshot: MaintenanceSnapshot;
}) => {
  const [tick, setTick] = useState(() => Date.now());
  const [probeStatus, setProbeStatus] =
    useState<MaintenanceRecoveryStatus>("waiting");
  const [probeMessage, setProbeMessage] = useState<string | null>(
    snapshot.message ?? null,
  );
  const reloadScheduledRef = useRef(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    const poll = async () => {
      try {
        const response = await fetch("/api/internal/maintenance/recovery", {
          cache: "no-store",
          credentials: "include",
        });
        const payload = (await response.json()) as RecoveryProbeResponse;

        if (cancelled) {
          return;
        }

        setProbeStatus(payload.status);
        setProbeMessage(payload.message ?? snapshot.message ?? null);

        if (
          payload.observedDowntime &&
          snapshot.kind === "platform_api_restart" &&
          !snapshot.observedDowntime
        ) {
          persistMaintenanceSnapshot({
            ...snapshot,
            observedDowntime: true,
          });
        }

        if (payload.status === "inactive") {
          clearMaintenanceSnapshot();
          return;
        }

        if (payload.status === "failed") {
          toast.error(
            snapshot.kind === "control_plane_update"
              ? "Control-plane update failed"
              : "Maintenance operation failed",
            {
              description:
                payload.message ??
                snapshot.message ??
                "The backend recovered, but the maintenance operation did not complete cleanly.",
            },
          );
          clearMaintenanceSnapshot();
          return;
        }

        if (payload.status === "ready" && !reloadScheduledRef.current) {
          reloadScheduledRef.current = true;
          persistMaintenanceCompletion({
            kind: snapshot.kind,
            ...getCompletion(snapshot),
            completedAt: new Date().toISOString(),
          });
          clearMaintenanceSnapshot();
          window.location.reload();
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }

        setProbeStatus("waiting");
      }

      timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
    };

    timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [snapshot]);

  const progressState = useMemo(() => {
    const startedAt = Date.parse(snapshot.startedAt) || tick;
    const stageEstimateSeconds =
      STAGE_ESTIMATES_SECONDS[snapshot.status] ??
      TIMEOUT_SECONDS_BY_KIND[snapshot.kind];
    const timeoutSeconds = TIMEOUT_SECONDS_BY_KIND[snapshot.kind];
    const elapsedSeconds = Math.max(0, Math.floor((tick - startedAt) / 1_000));
    const remainingSeconds = Math.max(0, stageEstimateSeconds - elapsedSeconds);
    const progressValue =
      stageEstimateSeconds > 0
        ? elapsedSeconds >= stageEstimateSeconds
          ? 99
          : Math.min(
              96,
              Math.round((elapsedSeconds / stageEstimateSeconds) * 100),
            )
        : 100;

    return {
      elapsedSeconds,
      remainingSeconds,
      progressValue,
      timedOut: elapsedSeconds >= timeoutSeconds,
    };
  }, [snapshot, tick]);

  const isFailed = probeStatus === "failed" || snapshot.status === "failed";
  const isOverStageEstimate = progressState.remainingSeconds === 0;
  const showManualActions =
    isFailed || progressState.timedOut || isOverStageEstimate;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/76 px-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-[28px] border border-border/80 bg-[var(--surface-dialog)] p-6 shadow-[var(--shadow-dashboard-hover)] sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-tone-warning/30 bg-tone-warning/10 text-tone-warning">
              {isFailed ? (
                <ShieldAlert className="size-5" />
              ) : (
                <LoaderCircle className="size-5 animate-spin" />
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Maintenance window
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {getHeadline(snapshot)}
              </h2>
            </div>
          </div>

          <div
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              isFailed || progressState.timedOut ? "tone-warning" : "tone-brand",
            )}
          >
            {isFailed
              ? "Needs operator review"
              : progressState.timedOut || isOverStageEstimate
                ? "Still recovering"
                : "Waiting for backend health"}
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {getDescription(snapshot, probeStatus, probeMessage)}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-border/70 bg-background/82 p-4">
            <p className="text-xs text-muted-foreground">Current stage</p>
            <p className="mt-2 font-semibold capitalize">
              {snapshot.status.replaceAll("_", " ")}
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
              {showManualActions
                ? "Review the host-side state, then retry the probe or manually reload."
                : "No action required. This page will reload automatically once recovery completes."}
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
            The countdown is approximate. Recovery completes only after the API
            answers again and the maintenance probe confirms the restart window
            is over.
          </p>
        </div>

        {showManualActions ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProbeStatus("waiting");
                setProbeMessage(snapshot.message ?? null);
              }}
            >
              <ServerCog className="size-4" />
              Retry status probe
            </Button>
            <Button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCcw className="size-4" />
              Reload page
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
