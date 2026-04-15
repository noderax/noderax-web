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

export const ControlPlaneUpdateFreeze = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isPlatformAdmin } = useWorkspaceContext();
  const controlPlaneSummaryQuery = useControlPlaneUpdateSummary(isPlatformAdmin);
  const liveOperation = controlPlaneSummaryQuery.data?.operation ?? null;
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
  ]);

  return null;
};
