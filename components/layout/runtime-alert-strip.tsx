"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, MailWarning, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReadinessResponse } from "@/lib/types";

type RuntimeAlertStripProps = {
  readiness: ReadinessResponse | undefined;
  isPlatformAdmin: boolean;
  sessionUserId: string | null;
  onReview: () => void;
};

const buildFingerprint = (readiness: ReadinessResponse | undefined) =>
  JSON.stringify(
    Object.entries(readiness?.checks ?? {})
      .filter(([, check]) => !check.healthy)
      .map(([key, check]) => ({
        key,
        status: check.status,
        detail: check.detail,
        meta: check.meta ?? null,
      })),
  );

export const RuntimeAlertStrip = ({
  readiness,
  isPlatformAdmin,
  sessionUserId,
  onReview,
}: RuntimeAlertStripProps) => {
  const degradedChecks = useMemo(
    () =>
      Object.entries(readiness?.checks ?? {}).filter(([, check]) => !check.healthy),
    [readiness],
  );
  const fingerprint = useMemo(() => buildFingerprint(readiness), [readiness]);
  const dismissKey = `noderax.runtime-alert.dismissed:${sessionUserId ?? "anonymous"}`;
  const [dismissedFingerprint, setDismissedFingerprint] = useState<string | null>(
    () =>
      typeof window === "undefined"
        ? null
        : window.sessionStorage.getItem(dismissKey),
  );

  if (
    !isPlatformAdmin ||
    !readiness ||
    readiness.ready ||
    degradedChecks.length === 0 ||
    dismissedFingerprint === fingerprint
  ) {
    return null;
  }

  return (
    <div className="border-t border-tone-warning/30 bg-tone-warning/10">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <AlertTriangle className="size-4 shrink-0 text-tone-warning" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Runtime degraded</span>
              {degradedChecks.some(([key]) => key === "outbox") ? (
                <Badge variant="outline" className="gap-1">
                  <MailWarning className="size-3.5" />
                  Outbox attention required
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              Checks failing:{" "}
              {degradedChecks
                .map(([key, check]) => `${key} (${check.status.replace(/_/g, " ")})`)
                .join(", ")}
              .
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onReview}>
            Review
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window === "undefined") {
                return;
              }
              window.sessionStorage.setItem(dismissKey, fingerprint);
              setDismissedFingerprint(fingerprint);
            }}
          >
            <X className="size-4" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
};
