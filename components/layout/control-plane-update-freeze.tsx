"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useControlPlaneUpdateSummary } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import {
  buildControlPlaneMaintenanceSnapshot,
  clearMaintenanceSnapshot,
  isControlPlaneMaintenanceStatus,
  persistMaintenanceSnapshot,
  readMaintenanceSnapshotFromBrowser,
  subscribeToMaintenanceSnapshot,
} from "@/lib/maintenance";

const isStaleNoopApplySummary = (input: {
  currentReleaseId: string | null;
  preparedReleaseId: string | null;
  updateAvailable: boolean;
  operationStatus: string | null;
  operationType: string | null;
}) =>
  Boolean(
    input.operationType === "apply" &&
      input.operationStatus &&
      isControlPlaneMaintenanceStatus(input.operationStatus) &&
      input.currentReleaseId &&
      input.currentReleaseId === input.preparedReleaseId &&
      input.updateAvailable === false,
  );

export const ControlPlaneUpdateFreeze = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isPlatformAdmin } = useWorkspaceContext();
  const controlPlaneSummaryQuery = useControlPlaneUpdateSummary(isPlatformAdmin);
  const controlPlaneSummary = controlPlaneSummaryQuery.data ?? null;
  const liveOperation = controlPlaneSummaryQuery.data?.operation ?? null;
  const staleNoopApplySummary = isStaleNoopApplySummary({
    currentReleaseId: controlPlaneSummary?.currentRelease?.releaseId ?? null,
    preparedReleaseId: controlPlaneSummary?.preparedRelease?.releaseId ?? null,
    updateAvailable: controlPlaneSummary?.updateAvailable ?? false,
    operationStatus: liveOperation?.status ?? null,
    operationType: liveOperation?.operation ?? null,
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

    if (staleNoopApplySummary) {
      clearMaintenanceSnapshot();
      return;
    }

    const resumePath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

    if (isControlPlaneMaintenanceStatus(liveOperation.status)) {
      persistMaintenanceSnapshot(
        buildControlPlaneMaintenanceSnapshot(liveOperation, resumePath),
      );
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
    staleNoopApplySummary,
  ]);

  useEffect(() => {
    if (
      !isPlatformAdmin ||
      controlPlaneSummaryQuery.isPending ||
      maintenanceSnapshot?.kind !== "control_plane_update"
    ) {
      return;
    }

    if (staleNoopApplySummary) {
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
    staleNoopApplySummary,
  ]);

  return null;
};
