import type { ControlPlaneUpdateOperation } from "@/lib/types";

export const MAINTENANCE_SNAPSHOT_COOKIE = "noderax_maintenance";
export const MAINTENANCE_SNAPSHOT_STORAGE_KEY =
  "noderax.maintenance-snapshot";
export const MAINTENANCE_COMPLETION_STORAGE_KEY =
  "noderax.maintenance-completion";
export const MAINTENANCE_SNAPSHOT_EVENT = "noderax:maintenance-snapshot";
export const MAINTENANCE_COOKIE_MAX_AGE_SECONDS = 60 * 30;

export type MaintenanceKind =
  | "control_plane_update"
  | "platform_api_restart";

export type MaintenanceRecoveryStatus =
  | "inactive"
  | "waiting"
  | "ready"
  | "failed";

export type MaintenanceSnapshot = {
  kind: MaintenanceKind;
  status: string;
  startedAt: string;
  message?: string | null;
  resumePath: string;
  requestedAt?: string | null;
  previousBootId?: string | null;
  observedDowntime?: boolean;
};

export type MaintenanceCompletion = {
  kind: MaintenanceKind;
  title: string;
  description: string;
  completedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJson = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const normalizeString = (value: unknown) =>
  typeof value === "string" && value.trim().length ? value.trim() : null;

const encodeCookieValue = (value: string) => encodeURIComponent(value);
const decodeCookieValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

export const isMaintenanceKind = (value: unknown): value is MaintenanceKind =>
  value === "control_plane_update" || value === "platform_api_restart";

export const parseMaintenanceSnapshot = (
  value: unknown,
): MaintenanceSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }

  const kind = value.kind;
  const status = normalizeString(value.status);
  const startedAt = normalizeString(value.startedAt);
  const resumePath = normalizeString(value.resumePath);

  if (!isMaintenanceKind(kind) || !status || !startedAt || !resumePath) {
    return null;
  }

  return {
    kind,
    status,
    startedAt,
    resumePath,
    message: normalizeString(value.message),
    requestedAt: normalizeString(value.requestedAt),
    previousBootId: normalizeString(value.previousBootId),
    observedDowntime: value.observedDowntime === true,
  };
};

export const parseMaintenanceSnapshotValue = (
  value?: string | null,
): MaintenanceSnapshot | null => {
  const decoded = decodeCookieValue(value);
  if (!decoded) {
    return null;
  }

  return parseMaintenanceSnapshot(parseJson(decoded));
};

export const serializeMaintenanceSnapshot = (snapshot: MaintenanceSnapshot) =>
  encodeCookieValue(JSON.stringify(snapshot));

export const getMaintenanceSnapshotFromCookies = (
  cookieStore: {
    get(name: string): { value: string } | undefined;
  },
) => parseMaintenanceSnapshotValue(cookieStore.get(MAINTENANCE_SNAPSHOT_COOKIE)?.value);

const emitSnapshotChange = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(MAINTENANCE_SNAPSHOT_EVENT));
};

const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
};

const clearCookie = (name: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export const readMaintenanceSnapshotFromBrowser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const storageValue = window.sessionStorage.getItem(
    MAINTENANCE_SNAPSHOT_STORAGE_KEY,
  );
  const parsedFromStorage = parseMaintenanceSnapshot(parseJson(storageValue));
  if (parsedFromStorage) {
    return parsedFromStorage;
  }

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MAINTENANCE_SNAPSHOT_COOKIE}=`));

  return parseMaintenanceSnapshotValue(cookieMatch?.split("=").slice(1).join("="));
};

export const persistMaintenanceSnapshot = (snapshot: MaintenanceSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    MAINTENANCE_SNAPSHOT_STORAGE_KEY,
    JSON.stringify(snapshot),
  );
  setCookie(
    MAINTENANCE_SNAPSHOT_COOKIE,
    serializeMaintenanceSnapshot(snapshot),
    MAINTENANCE_COOKIE_MAX_AGE_SECONDS,
  );
  emitSnapshotChange();
};

export const clearMaintenanceSnapshot = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(MAINTENANCE_SNAPSHOT_STORAGE_KEY);
  clearCookie(MAINTENANCE_SNAPSHOT_COOKIE);
  emitSnapshotChange();
};

export const subscribeToMaintenanceSnapshot = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => callback();
  window.addEventListener(MAINTENANCE_SNAPSHOT_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(MAINTENANCE_SNAPSHOT_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
};

export const persistMaintenanceCompletion = (completion: MaintenanceCompletion) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    MAINTENANCE_COMPLETION_STORAGE_KEY,
    JSON.stringify(completion),
  );
};

export const consumeMaintenanceCompletion = (): MaintenanceCompletion | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(
    MAINTENANCE_COMPLETION_STORAGE_KEY,
  );
  if (!rawValue) {
    return null;
  }

  window.sessionStorage.removeItem(MAINTENANCE_COMPLETION_STORAGE_KEY);
  const parsed = parseJson(rawValue);
  if (!isRecord(parsed) || !isMaintenanceKind(parsed.kind)) {
    return null;
  }

  const title = normalizeString(parsed.title);
  const description = normalizeString(parsed.description);
  const completedAt = normalizeString(parsed.completedAt);
  if (!title || !description || !completedAt) {
    return null;
  }

  return {
    kind: parsed.kind,
    title,
    description,
    completedAt,
  };
};

export const isControlPlaneMaintenanceStatus = (status: string) =>
  status === "applying" || status === "recreating_services";

export const buildControlPlaneMaintenanceSnapshot = (
  operation: ControlPlaneUpdateOperation,
  resumePath: string,
): MaintenanceSnapshot => ({
  kind: "control_plane_update",
  status: operation.status,
  startedAt: operation.startedAt ?? operation.requestedAt,
  requestedAt: operation.requestedAt,
  message: operation.error ?? operation.message,
  resumePath,
});

export const buildApiRestartMaintenanceSnapshot = (input: {
  previousBootId: string | null;
  requestedAt: string;
  message: string;
  resumePath: string;
}): MaintenanceSnapshot => ({
  kind: "platform_api_restart",
  status: "polling",
  startedAt: input.requestedAt,
  requestedAt: input.requestedAt,
  previousBootId: input.previousBootId,
  observedDowntime: false,
  message: input.message,
  resumePath: input.resumePath,
});
