import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  AUTH_TOKEN_COOKIE,
  fetchApiWithFallback,
} from "@/lib/auth";
import {
  getMaintenanceSnapshotFromCookies,
  isControlPlaneMaintenanceStatus,
} from "@/lib/maintenance";
import type {
  ControlPlaneUpdateSummary,
  HealthResponse,
  ReadinessResponse,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const createTimeoutSignal = (ms: number) => AbortSignal.timeout(ms);

const getJsonResponse = async <T,>(response: Response) => {
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
};

const isRecoveredControlPlaneApplySummary = (
  summary: ControlPlaneUpdateSummary | null,
) => {
  const operation = summary?.operation ?? null;
  const currentReleaseId = summary?.currentRelease?.releaseId ?? null;
  const preparedReleaseId = summary?.preparedRelease?.releaseId ?? null;
  const latestReleaseId = summary?.latestRelease?.releaseId ?? null;

  return Boolean(
    operation?.operation === "apply" &&
      operation.status &&
      isControlPlaneMaintenanceStatus(operation.status) &&
      currentReleaseId &&
      summary?.updateAvailable === false &&
      (preparedReleaseId === currentReleaseId ||
        latestReleaseId === currentReleaseId)
  );
};

export async function GET() {
  const cookieStore = await cookies();
  const snapshot = getMaintenanceSnapshotFromCookies(cookieStore);

  if (!snapshot) {
    return NextResponse.json({ status: "inactive" as const });
  }

  if (snapshot.kind === "platform_api_restart") {
    try {
      const response = await fetchApiWithFallback("/health", {
        cache: "no-store",
        signal: createTimeoutSignal(2_000),
      });
      const health = await getJsonResponse<HealthResponse>(response);

      if (!health) {
        return NextResponse.json({
          status: "waiting" as const,
          kind: snapshot.kind,
          message: "Waiting for the restarted API process to report healthy.",
        });
      }

      if (snapshot.previousBootId) {
        if (health.bootId !== snapshot.previousBootId) {
          return NextResponse.json({
            status: "ready" as const,
            kind: snapshot.kind,
          });
        }

        return NextResponse.json({
          status: "waiting" as const,
          kind: snapshot.kind,
          message: "The previous API process is still reporting the same boot id.",
        });
      }

      if (snapshot.observedDowntime) {
        return NextResponse.json({
          status: "ready" as const,
          kind: snapshot.kind,
        });
      }

      return NextResponse.json({
        status: "waiting" as const,
        kind: snapshot.kind,
        message: "Waiting for the API restart window to become observable.",
      });
    } catch {
      return NextResponse.json({
        status: "waiting" as const,
        kind: snapshot.kind,
        observedDowntime: true,
        message: "The API is currently unavailable. Waiting for it to come back.",
      });
    }
  }

  try {
    const readinessResponse = await fetchApiWithFallback("/health/ready", {
      cache: "no-store",
      signal: createTimeoutSignal(2_500),
    });
    const readiness = await getJsonResponse<ReadinessResponse>(readinessResponse);

    if (!readiness?.ready) {
      return NextResponse.json({
        status: "waiting" as const,
        kind: snapshot.kind,
        message: "Waiting for API readiness checks to settle on the new control-plane build.",
      });
    }
  } catch {
    return NextResponse.json({
      status: "waiting" as const,
      kind: snapshot.kind,
      message: "The API is still restarting against the prepared control-plane release.",
    });
  }

  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  if (token) {
    try {
      const summaryResponse = await fetchApiWithFallback(
        "/control-plane-updates/summary",
        {
          cache: "no-store",
          signal: createTimeoutSignal(2_500),
          headers: {
            authorization: `Bearer ${token}`,
          },
        },
      );
      const summary = await getJsonResponse<ControlPlaneUpdateSummary>(
        summaryResponse,
      );
      const operation = summary?.operation ?? null;

      if (operation?.status === "failed") {
        return NextResponse.json({
          status: "failed" as const,
          kind: snapshot.kind,
          message:
            operation.error ??
            operation.message ??
            "The control-plane update reported a failed state.",
        });
      }

      if (summary && isRecoveredControlPlaneApplySummary(summary)) {
        return NextResponse.json({
          status: "ready" as const,
          kind: snapshot.kind,
        });
      }

      if (operation && isControlPlaneMaintenanceStatus(operation.status)) {
        return NextResponse.json({
          status: "waiting" as const,
          kind: snapshot.kind,
          message:
            operation.message ??
            "The control-plane supervisor is still recreating services.",
        });
      }
    } catch {
      // Health already recovered; treat summary probe failure as non-blocking.
    }
  }

  return NextResponse.json({
    status: "ready" as const,
    kind: snapshot.kind,
  });
}
