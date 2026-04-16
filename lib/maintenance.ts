import type { ControlPlaneUpdateOperation } from "@/lib/types";

export const MAINTENANCE_SNAPSHOT_COOKIE = "noderax_maintenance";
export const MAINTENANCE_SNAPSHOT_STORAGE_KEY =
  "noderax.maintenance-snapshot";
export const MAINTENANCE_COMPLETION_STORAGE_KEY =
  "noderax.maintenance-completion";
export const MAINTENANCE_SUPPRESSION_STORAGE_KEY =
  "noderax.maintenance-suppression";
export const MAINTENANCE_SNAPSHOT_EVENT = "noderax:maintenance-snapshot";
export const MAINTENANCE_COOKIE_MAX_AGE_SECONDS = 60 * 30;
const MAINTENANCE_MAX_AGE_MS: Record<MaintenanceKind, number> = {
  control_plane_update: 15 * 60 * 1_000,
  platform_api_restart: 5 * 60 * 1_000,
};

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

type MaintenanceSuppression = {
  fingerprint: string;
  expiresAt: string;
};

let cachedBrowserSnapshotRaw: string | null = null;
let cachedBrowserSnapshot: MaintenanceSnapshot | null = null;

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

const getMaintenanceSnapshotReferenceTime = (snapshot: MaintenanceSnapshot) => {
  const referenceMs = Date.parse(snapshot.requestedAt ?? snapshot.startedAt);
  return Number.isFinite(referenceMs) ? referenceMs : null;
};

export const isMaintenanceSnapshotExpired = (
  snapshot: MaintenanceSnapshot,
  now = Date.now(),
) => {
  const referenceMs = getMaintenanceSnapshotReferenceTime(snapshot);
  if (referenceMs === null) {
    return false;
  }

  return now - referenceMs >= MAINTENANCE_MAX_AGE_MS[snapshot.kind];
};

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

  const snapshot = parseMaintenanceSnapshot(parseJson(decoded));
  if (!snapshot || isMaintenanceSnapshotExpired(snapshot)) {
    return null;
  }

  return snapshot;
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

const readRawMaintenanceSnapshotFromBrowser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const storageValue = window.sessionStorage.getItem(
    MAINTENANCE_SNAPSHOT_STORAGE_KEY,
  );
  if (storageValue) {
    return storageValue;
  }

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MAINTENANCE_SNAPSHOT_COOKIE}=`));

  return decodeCookieValue(cookieMatch?.split("=").slice(1).join("="));
};

const updateCachedBrowserSnapshot = (rawValue: string | null) => {
  cachedBrowserSnapshotRaw = rawValue;
  const parsedSnapshot = rawValue
    ? parseMaintenanceSnapshot(parseJson(rawValue))
    : null;
  cachedBrowserSnapshot =
    parsedSnapshot && !isMaintenanceSnapshotExpired(parsedSnapshot)
      ? parsedSnapshot
      : null;

  return cachedBrowserSnapshot;
};

const getSnapshotFingerprint = (snapshot: MaintenanceSnapshot) =>
  [
    snapshot.kind,
    snapshot.startedAt,
    snapshot.requestedAt ?? "",
    snapshot.resumePath,
  ].join(":");

const readMaintenanceSuppression = (): MaintenanceSuppression | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(
    MAINTENANCE_SUPPRESSION_STORAGE_KEY,
  );
  if (!rawValue) {
    return null;
  }

  const parsed = parseJson(rawValue);
  if (!isRecord(parsed)) {
    window.sessionStorage.removeItem(MAINTENANCE_SUPPRESSION_STORAGE_KEY);
    return null;
  }

  const fingerprint = normalizeString(parsed.fingerprint);
  const expiresAt = normalizeString(parsed.expiresAt);
  if (!fingerprint || !expiresAt) {
    window.sessionStorage.removeItem(MAINTENANCE_SUPPRESSION_STORAGE_KEY);
    return null;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    window.sessionStorage.removeItem(MAINTENANCE_SUPPRESSION_STORAGE_KEY);
    return null;
  }

  return {
    fingerprint,
    expiresAt,
  };
};

export const isMaintenanceSnapshotSuppressed = (
  snapshot: MaintenanceSnapshot,
) => {
  const suppression = readMaintenanceSuppression();
  if (!suppression) {
    return false;
  }

  return suppression.fingerprint === getSnapshotFingerprint(snapshot);
};

export const readMaintenanceSnapshotFromBrowser = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = readRawMaintenanceSnapshotFromBrowser();
  if (rawValue === cachedBrowserSnapshotRaw) {
    return cachedBrowserSnapshot;
  }

  const snapshot = updateCachedBrowserSnapshot(rawValue);
  if (snapshot && isMaintenanceSnapshotSuppressed(snapshot)) {
    window.sessionStorage.removeItem(MAINTENANCE_SNAPSHOT_STORAGE_KEY);
    clearCookie(MAINTENANCE_SNAPSHOT_COOKIE);
    updateCachedBrowserSnapshot(null);
    return null;
  }

  if (!snapshot && rawValue) {
    window.sessionStorage.removeItem(MAINTENANCE_SNAPSHOT_STORAGE_KEY);
    clearCookie(MAINTENANCE_SNAPSHOT_COOKIE);
  }

  return snapshot;
};

export const persistMaintenanceSnapshot = (snapshot: MaintenanceSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }

  if (isMaintenanceSnapshotSuppressed(snapshot)) {
    return;
  }

  const rawValue = JSON.stringify(snapshot);
  if (rawValue === cachedBrowserSnapshotRaw) {
    return;
  }

  window.sessionStorage.setItem(
    MAINTENANCE_SNAPSHOT_STORAGE_KEY,
    rawValue,
  );
  setCookie(
    MAINTENANCE_SNAPSHOT_COOKIE,
    serializeMaintenanceSnapshot(snapshot),
    MAINTENANCE_COOKIE_MAX_AGE_SECONDS,
  );
  updateCachedBrowserSnapshot(rawValue);
  emitSnapshotChange();
};

export const suppressMaintenanceSnapshot = (
  snapshot: MaintenanceSnapshot,
  durationMs = 2 * 60 * 1_000,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    MAINTENANCE_SUPPRESSION_STORAGE_KEY,
    JSON.stringify({
      fingerprint: getSnapshotFingerprint(snapshot),
      expiresAt: new Date(Date.now() + durationMs).toISOString(),
    } satisfies MaintenanceSuppression),
  );
};

export const clearMaintenanceSnapshot = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (!readMaintenanceSnapshotFromBrowser()) {
    return;
  }

  window.sessionStorage.removeItem(MAINTENANCE_SNAPSHOT_STORAGE_KEY);
  clearCookie(MAINTENANCE_SNAPSHOT_COOKIE);
  updateCachedBrowserSnapshot(null);
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
