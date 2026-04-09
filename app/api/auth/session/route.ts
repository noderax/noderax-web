import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  API_BASE_URL_COOKIE,
  AUTH_PERSIST_COOKIE,
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  buildAuthCookieOptions,
  buildClearedApiBaseUrlCookieOptions,
  decodeSession,
  encodeSession,
  fetchApiWithFallback,
  normalizeAuthSession,
} from "@/lib/auth";
import { fetchSetupApi } from "@/lib/setup";
import type { UserDto } from "@/lib/types";

const clearAuthCookies = (response: NextResponse) => {
  response.cookies.set(
    API_BASE_URL_COOKIE,
    "",
    buildClearedApiBaseUrlCookieOptions(),
  );
  response.cookies.set(AUTH_TOKEN_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set(AUTH_PERSIST_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
};

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const cachedSession = decodeSession(cookieStore.get(AUTH_SESSION_COOKIE)?.value);
  const isPersistent = cookieStore.get(AUTH_PERSIST_COOKIE)?.value === "1";

  try {
    const setupStatusResponse = await fetchSetupApi("/setup/status", {
      cache: "no-store",
    });

    if (setupStatusResponse.ok) {
      const setupStatus = (await setupStatusResponse.json()) as {
        mode: "setup" | "promoting" | "installed" | "legacy";
      };

      if (
        setupStatus.mode === "setup" ||
        setupStatus.mode === "promoting"
      ) {
        const response = NextResponse.json(
          { message: "Initial setup is not complete yet." },
          { status: 409 },
        );
        clearAuthCookies(response);
        return response;
      }
    }
  } catch {
    const response = NextResponse.json(
      {
        message:
          "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
      },
      { status: 500 },
    );
    clearAuthCookies(response);
    return response;
  }

  if (!token) {
    const response = NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetchApiWithFallback("/users/me", {
      headers: {
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch {
    const response = NextResponse.json(
      {
        message:
          "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
      },
      { status: 500 },
    );
    clearAuthCookies(response);
    return response;
  }

  if (!upstreamResponse) {
    const response = NextResponse.json(
      {
        message:
          "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
      },
      { status: 500 },
    );
    clearAuthCookies(response);
    return response;
  }

  if (!upstreamResponse.ok) {
    const response = NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const user = (await upstreamResponse.json()) as UserDto;
  const session = normalizeAuthSession({
    token,
    user,
    expiresAt: cachedSession?.expiresAt ?? null,
  });

  const response = NextResponse.json(session);
  response.cookies.set(
    AUTH_SESSION_COOKIE,
    encodeSession(session),
    buildAuthCookieOptions({
      expiresAt: session.expiresAt,
      persistent: isPersistent,
    }),
  );
  response.cookies.set(AUTH_PERSIST_COOKIE, isPersistent ? "1" : "0", {
    ...buildAuthCookieOptions({
      expiresAt: session.expiresAt,
      persistent: isPersistent,
    }),
    httpOnly: true,
  });
  response.cookies.set(
    API_BASE_URL_COOKIE,
    "",
    buildClearedApiBaseUrlCookieOptions(),
  );

  return response;
}
