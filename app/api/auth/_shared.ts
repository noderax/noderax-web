import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  API_BASE_URL_COOKIE,
  AUTH_PERSIST_COOKIE,
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  buildAuthCookieOptions,
  encodeSession,
  fetchApiWithFallback,
  normalizeAuthSession,
  normalizeAuthToken,
} from "@/lib/auth";
import type { LoginResponseDto } from "@/lib/types";

export const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    return payload.message ?? payload.error ?? "Authentication request failed.";
  } catch {
    return "Authentication request failed.";
  }
};

export const proxyPublicAuthRequest = async (path: string, init?: RequestInit) => {
  const cookieStore = await cookies();
  const apiUrlOverride = cookieStore.get(API_BASE_URL_COOKIE)?.value;
  let response: Response;

  try {
    response = await fetchApiWithFallback(path, {
      ...init,
      cache: "no-store",
    }, apiUrlOverride);
  } catch {
    return NextResponse.json(
      {
        message:
          "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
      },
      { status: 500 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: await readErrorMessage(response) },
      { status: response.status },
    );
  }

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(await response.json(), {
    status: response.status,
  });
};

export const createSessionResponse = (
  upstreamPayload: LoginResponseDto,
  input?: {
    persistent?: boolean;
    redirectTo?: string | null;
  },
) => {
  const token = normalizeAuthToken(upstreamPayload);

  if (!token || !upstreamPayload.user) {
    return NextResponse.json(
      { message: "Authentication response is missing session data." },
      { status: 502 },
    );
  }

  const session = normalizeAuthSession({
    token,
    user: upstreamPayload.user,
    expiresIn: upstreamPayload.expiresIn,
    expiresAt: upstreamPayload.expiresAt,
  });

  const response = input?.redirectTo
    ? NextResponse.redirect(new URL(input.redirectTo, "http://localhost"))
    : NextResponse.json(session);
  const cookieOptions = buildAuthCookieOptions({
    expiresAt: session.expiresAt,
    persistent: input?.persistent,
  });

  response.cookies.set(AUTH_TOKEN_COOKIE, token, cookieOptions);
  response.cookies.set(
    AUTH_SESSION_COOKIE,
    encodeSession(session),
    cookieOptions,
  );
  response.cookies.set(AUTH_PERSIST_COOKIE, input?.persistent ? "1" : "0", {
    ...cookieOptions,
    httpOnly: true,
  });

  if (input?.redirectTo) {
    response.headers.set("x-noderax-auth-redirect", input.redirectTo);
  }

  return response;
};
