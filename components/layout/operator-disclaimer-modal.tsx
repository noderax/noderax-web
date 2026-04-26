"use client";

import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuthSession } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export const OPERATOR_DISCLAIMER_VERSION = "v1";

export const buildOperatorDisclaimerStorageKey = (userId: string) =>
  `noderax:operator-disclaimer:${OPERATOR_DISCLAIMER_VERSION}:${userId}`;

export const buildOperatorDisclaimerSessionStorageKey = (
  userId: string,
  tokenPreview: string,
) =>
  `noderax:operator-disclaimer:session:${OPERATOR_DISCLAIMER_VERSION}:${userId}:${tokenPreview}`;

const hasStoredFlag = (key: string) => {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const storeFlag = (key: string) => {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
};

const getStorageKeys = (session: AuthSession | null) => {
  if (!session?.user.id || !session.tokenPreview) {
    return null;
  }

  return {
    permanentKey: buildOperatorDisclaimerStorageKey(session.user.id),
    sessionKey: buildOperatorDisclaimerSessionStorageKey(
      session.user.id,
      session.tokenPreview,
    ),
  };
};

const EMPTY_FLAGS_SNAPSHOT = "0:0";

const subscribeToStorageSnapshot = () => () => {};

const getServerStorageSnapshot = () => EMPTY_FLAGS_SNAPSHOT;

const readStorageSnapshot = (
  storageKeys: ReturnType<typeof getStorageKeys>,
) => {
  if (!storageKeys) {
    return EMPTY_FLAGS_SNAPSHOT;
  }

  return `${hasStoredFlag(storageKeys.permanentKey) ? "1" : "0"}:${
    hasStoredFlag(storageKeys.sessionKey) ? "1" : "0"
  }`;
};

export const OperatorDisclaimerModal = () => {
  const checkboxId = useId();
  const session = useAppStore((state) => state.session);
  const [dismissedSessionKey, setDismissedSessionKey] = useState<string | null>(
    null,
  );
  const [checkboxState, setCheckboxState] = useState<{
    sessionKey: string | null;
    checked: boolean;
  }>({
    sessionKey: null,
    checked: false,
  });
  const storageKeys = useMemo(() => getStorageKeys(session), [session]);
  const storageSnapshot = useSyncExternalStore(
    subscribeToStorageSnapshot,
    () => readStorageSnapshot(storageKeys),
    getServerStorageSnapshot,
  );
  const [hasPermanentAcknowledgement, hasSessionAcknowledgement] =
    storageSnapshot.split(":").map((value) => value === "1");
  const doNotShowAgain =
    Boolean(storageKeys) &&
    checkboxState.sessionKey === storageKeys?.sessionKey &&
    checkboxState.checked;

  const isOpen = Boolean(
    storageKeys &&
      !hasPermanentAcknowledgement &&
      !hasSessionAcknowledgement &&
      dismissedSessionKey !== storageKeys.sessionKey,
  );

  const acknowledge = () => {
    if (storageKeys) {
      storeFlag(storageKeys.sessionKey);

      if (doNotShowAgain) {
        storeFlag(storageKeys.permanentKey);
      }

      setDismissedSessionKey(storageKeys.sessionKey);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl">
        <DialogHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-tone-warning/30 bg-tone-warning/10 text-tone-warning">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle>Operational Use Disclaimer</DialogTitle>
            <DialogDescription>
              Noderax provides operational controls for infrastructure tasks,
              telemetry, package actions, terminal access, and automation.
              Actions initiated from this dashboard may affect connected nodes,
              running services, data availability, security posture, or costs.
              You are responsible for verifying commands, permissions, targets,
              and change windows before use. Noderax is not responsible for
              outages, data loss, misconfiguration, unauthorized actions, or
              other issues resulting from dashboard usage, integrations,
              credentials, or operator decisions.
            </DialogDescription>
          </div>
        </DialogHeader>

        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/80 bg-muted/35 p-3 text-sm text-foreground"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={doNotShowAgain}
            onChange={(event) =>
              setCheckboxState({
                sessionKey: storageKeys?.sessionKey ?? null,
                checked: event.target.checked,
              })
            }
            className="mt-0.5 size-4 rounded border-border accent-primary"
          />
          <span>Don&apos;t show this again on this browser.</span>
        </label>

        <DialogFooter>
          <Button type="button" onClick={acknowledge}>
            I acknowledge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
