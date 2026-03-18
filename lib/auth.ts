import type { AuthSession, AuthUser } from "@/lib/types";

export const AUTH_TOKEN_COOKIE = "noderax_token";
export const AUTH_SESSION_COOKIE = "noderax_session";

const DEFAULT_SCOPES = [
  "nodes:read",
  "nodes:write",
  "tasks:read",
  "tasks:write",
  "events:read",
];

const humanizeName = (value: string) =>
  value
    .split(/[.\-_]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export const maskToken = (token: string) => {
  if (token.length <= 14) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};

export const getApiBaseUrl = () =>
  process.env.NODERAX_API_URL ?? process.env.NEXT_PUBLIC_NODERAX_API_URL ?? "";

export const shouldUseMockData = () =>
  process.env.NEXT_PUBLIC_NODERAX_USE_MOCKS === "true" || !getApiBaseUrl();

const deriveUser = (email?: string): AuthUser => {
  const safeEmail = email?.trim() || "operator@noderax.io";
  const emailName = safeEmail.split("@")[0] || "Operator";

  return {
    id: "usr_session",
    name: humanizeName(emailName),
    email: safeEmail,
    role: "Platform Operator",
  };
};

type LoginEnvelope = Record<string, unknown>;

export const normalizeAuthSession = (
  payload: LoginEnvelope,
  fallbackEmail?: string,
): { token: string; session: AuthSession } => {
  const token =
    (payload.accessToken as string | undefined) ??
    (payload.token as string | undefined) ??
    (payload.jwt as string | undefined) ??
    `mock.${Date.now()}.token`;

  const user = {
    ...deriveUser(fallbackEmail),
    ...((payload.user as Partial<AuthUser> | undefined) ??
      (payload.profile as Partial<AuthUser> | undefined) ??
      {}),
  };

  const expiresAt =
    (payload.expiresAt as string | undefined) ??
    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();

  const scopes =
    (payload.scopes as string[] | undefined) ??
    (payload.permissions as string[] | undefined) ??
    DEFAULT_SCOPES;

  return {
    token,
    session: {
      user,
      scopes,
      expiresAt,
      tokenPreview: maskToken(token),
    },
  };
};

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

export const buildAuthCookieOptions = (expiresAt?: string) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  expires: expiresAt ? new Date(expiresAt) : undefined,
});
