import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_FLASH_ERROR_COOKIE,
  fetchApiWithFallback,
} from "@/lib/auth";
import { readErrorMessage } from "@/app/api/auth/_shared";

const buildLoginErrorRedirect = (request: NextRequest, errorMessage: string) => {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(AUTH_FLASH_ERROR_COOKIE, encodeURIComponent(errorMessage), {
    httpOnly: false,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 60,
  });

  return response;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const nextPath = request.nextUrl.searchParams.get("next");
  const redirectUri = new URL(
    `/api/auth/oidc/${provider}/callback`,
    request.url,
  ).toString();

  const response = await fetchApiWithFallback(
    `/auth/oidc/${encodeURIComponent(provider)}/start?redirectUri=${encodeURIComponent(
      redirectUri,
    )}${nextPath ? `&next=${encodeURIComponent(nextPath)}` : ""}`,
    {
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    const errorMessage = response
      ? await readErrorMessage(response)
      : "Single sign-on could not be started.";
    return buildLoginErrorRedirect(request, errorMessage);
  }

  const payload = (await response.json()) as { authorizationUrl?: string };
  if (!payload.authorizationUrl) {
    return buildLoginErrorRedirect(request, "Authorization URL was not returned.");
  }

  const responseRedirect = NextResponse.redirect(payload.authorizationUrl);
  responseRedirect.cookies.set(AUTH_FLASH_ERROR_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });

  return responseRedirect;
}
