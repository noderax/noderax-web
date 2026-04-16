"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useControlPlaneUpdateSummary } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import {
  buildControlPlaneMaintenanceSnapshot,
  clearMaintenanceSnapshot,
  isMaintenanceSnapshotSuppressed,
  isControlPlaneMaintenanceStatus,
  persistMaintenanceSnapshot,
  readMaintenanceSnapshotFromBrowser,
  subscribeToMaintenanceSnapshot,
} from "@/lib/maintenance";

const CONTROL_PLANE_FREEZE_GRACE_MS = 45_000;

const isControlPlaneFreezeWindowExpired = (input: {
  operationStatus: string | null;
  startedAt: string | null;
  requestedAt: string | null;
}) => {
  if (!input.operationStatus || !isControlPlaneMaintenanceStatus(input.operationStatus)) {
    return false;
  }

  const startedAtMs = Date.parse(input.startedAt ?? input.requestedAt ?? "");
  if (!Number.isFinite(startedAtMs)) {
    return false;
  }

  return Date.now() - startedAtMs >= CONTROL_PLANE_FREEZE_GRACE_MS;
};

export const ControlPlaneUpdateFreeze = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isPlatformAdmin } = useWorkspaceContext();
  const controlPlaneSummaryQuery = useControlPlaneUpdateSummary(isPlatformAdmin);
  const liveOperation = controlPlaneSummaryQuery.data?.operation ?? null;
  const controlPlaneFreezeWindowExpired = isControlPlaneFreezeWindowExpired({
    operationStatus: liveOperation?.status ?? null,
    startedAt: liveOperation?.startedAt ?? null,
    requestedAt: liveOperation?.requestedAt ?? null,
  });
  const maintenanceSnapshot = useSyncExternalStore(
    subscribeToMaintenanceSnapshot,
    readMaintenanceSnapshotFromBrowser,
    () => null,
  );

  useEffect(() => {
    if (
      !isPlatformAdmin &&
      maintenanceSnapshot?.kind === "control_plane_update"
    ) {
      clearMaintenanceSnapshot();
    }
  }, [isPlatformAdmin, maintenanceSnapshot]);

  useEffect(() => {
    if (!isPlatformAdmin || !liveOperation) {
      return;
    }

    if (controlPlaneFreezeWindowExpired) {
      clearMaintenanceSnapshot();
      return;
    }

    const resumePath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
    const nextSnapshot = buildControlPlaneMaintenanceSnapshot(
      liveOperation,
      resumePath,
    );

    if (isControlPlaneMaintenanceStatus(liveOperation.status)) {
      if (isMaintenanceSnapshotSuppressed(nextSnapshot)) {
        clearMaintenanceSnapshot();
        return;
      }

      persistMaintenanceSnapshot(nextSnapshot);
      return;
    }

    if (
      liveOperation.status === "failed" &&
      maintenanceSnapshot?.kind === "control_plane_update"
    ) {
      persistMaintenanceSnapshot({
        ...maintenanceSnapshot,
        status: "failed",
        message:
          liveOperation.error ??
          liveOperation.message ??
          maintenanceSnapshot.message,
      });
    }
  }, [
    isPlatformAdmin,
    liveOperation,
    maintenanceSnapshot,
    pathname,
    searchParams,
    controlPlaneFreezeWindowExpired,
  ]);

  useEffect(() => {
    if (
      !isPlatformAdmin ||
      controlPlaneSummaryQuery.isPending ||
      maintenanceSnapshot?.kind !== "control_plane_update"
    ) {
      return;
    }

    if (controlPlaneFreezeWindowExpired) {
      clearMaintenanceSnapshot();
      return;
    }

    if (
      liveOperation &&
      (isControlPlaneMaintenanceStatus(liveOperation.status) ||
        liveOperation.status === "failed")
    ) {
      return;
    }

    clearMaintenanceSnapshot();
  }, [
    controlPlaneSummaryQuery.isPending,
    isPlatformAdmin,
    liveOperation,
    maintenanceSnapshot,
    controlPlaneFreezeWindowExpired,
  ]);

  return null;
};
