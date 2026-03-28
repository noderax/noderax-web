import type { AuthSession, LoginResponseDto, UserDto } from "@/lib/types";
import { buildAuthSession } from "@/lib/noderax";

export const AUTH_TOKEN_COOKIE = "noderax_token";
export const AUTH_SESSION_COOKIE = "noderax_session";
export const AUTH_PERSIST_COOKIE = "noderax_persist";
export const AUTH_FLASH_ERROR_COOKIE = "noderax_auth_flash_error";
export const API_BASE_URL_COOKIE = "noderax_api_url";
const API_PREFIX = "/api/v1";

export type ApiBaseUrlSource = "cookie" | "env" | "missing";

const DURATION_UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export const normalizeApiBaseUrl = (value?: string | null) => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

export const resolveApiBaseUrl = (
  override?: string | null,
): {
  apiUrl: string | null;
  source: ApiBaseUrlSource;
} => {
  const overrideUrl = normalizeApiBaseUrl(override);
  if (overrideUrl) {
    return {
      apiUrl: overrideUrl,
      source: "cookie",
    };
  }

  const envUrl = normalizeApiBaseUrl(process.env.NODERAX_API_URL);
  if (envUrl) {
    return {
      apiUrl: envUrl,
      source: "env",
    };
  }

  const publicEnvUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_NODERAX_API_URL);
  if (publicEnvUrl) {
    return {
      apiUrl: publicEnvUrl,
      source: "env",
    };
  }

  return {
    apiUrl: null,
    source: "missing",
  };
};

export const getApiBaseUrl = (override?: string | null) =>
  resolveApiBaseUrl(override).apiUrl ?? "";

const normalizePathname = (value: string) =>
  `/${value.replace(/^\/+|\/+$/g, "")}`.replace(/\/{2,}/g, "/");

const joinApiUrl = (baseUrl: string, path: string) => {
  const url = new URL(baseUrl);
  const normalizedBasePath =
    url.pathname && url.pathname !== "/" ? normalizePathname(url.pathname) : "";
  const pathUrl = new URL(path, "http://noderax.local");
  const normalizedPath = normalizePathname(pathUrl.pathname);

  url.pathname = `${normalizedBasePath}${normalizedPath}` || "/";
  url.search = pathUrl.search;
  url.hash = pathUrl.hash;
  return url;
};

const resolveRestBaseUrl = (baseUrl: string) => {
  const url = new URL(baseUrl);
  const normalizedBasePath =
    url.pathname && url.pathname !== "/" ? normalizePathname(url.pathname) : "/";

  if (normalizedBasePath === "/") {
    url.pathname = API_PREFIX;
    return url;
  }

  if (normalizedBasePath === "/v1" || normalizedBasePath === "/api/v1") {
    url.pathname = API_PREFIX;
    return url;
  }

  return url;
};

export const getApiRequestUrls = (path: string, override?: string | null) => {
  const baseUrl = getApiBaseUrl(override);

  if (!baseUrl) {
    return [];
  }

  return [joinApiUrl(resolveRestBaseUrl(baseUrl).href, path)];
};

export const fetchApiWithFallback = async (
  path: string,
  init?: RequestInit,
  override?: string | null,
) => {
  const [candidate] = getApiRequestUrls(path, override);

  if (!candidate) {
    throw new Error("Missing NODERAX_API_URL configuration.");
  }

  return fetch(candidate, init);
};

export const parseDurationToMs = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    return null;
  }

  const [, amount, unit] = match;
  return Number(amount) * DURATION_UNITS[unit.toLowerCase()];
};

export const decodeJwtPayload = <T extends Record<string, unknown>>(token: string) => {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
};

export const resolveExpiresAt = (input: {
  token: string;
  expiresIn?: string | null;
  expiresAt?: string | null;
}) => {
  if (input.expiresAt) {
    return input.expiresAt;
  }

  const payload = decodeJwtPayload<{ exp?: number }>(input.token);
  if (typeof payload?.exp === "number") {
    return new Date(payload.exp * 1_000).toISOString();
  }

  const durationMs = parseDurationToMs(input.expiresIn);
  if (durationMs) {
    return new Date(Date.now() + durationMs).toISOString();
  }

  return null;
};

export const normalizeAuthToken = (payload: LoginResponseDto | Record<string, unknown>) => {
  const candidate =
    ("accessToken" in payload ? payload.accessToken : undefined) ??
    ("token" in payload ? payload.token : undefined);

  return typeof candidate === "string" && candidate.trim().length ? candidate : null;
};

export const normalizeAuthSession = (input: {
  token: string;
  user: UserDto;
  expiresIn?: string | null;
  expiresAt?: string | null;
}) =>
  buildAuthSession({
    token: input.token,
    user: input.user,
    expiresAt: resolveExpiresAt({
      token: input.token,
      expiresIn: input.expiresIn,
      expiresAt: input.expiresAt,
    }),
  });

export const encodeSession = (session: AuthSession) =>
  Buffer.from(JSON.stringify(session)).toString("base64url");

export const decodeSession = (value?: string | null): AuthSession | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as AuthSession;
  } catch {
    return null;
  }
};

export const buildAuthCookieOptions = (input?: {
  expiresAt?: string | null;
  persistent?: boolean;
}) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires:
    input?.persistent && input.expiresAt ? new Date(input.expiresAt) : undefined,
});
