import { NextRequest, NextResponse } from "next/server";

import { createSessionResponse, readErrorMessage } from "@/app/api/auth/_shared";
import {
  AUTH_FLASH_ERROR_COOKIE,
  fetchApiWithFallback,
} from "@/lib/auth";
import type { LoginResponseDto } from "@/lib/types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const search = request.nextUrl.searchParams;
  const callbackPath = `/auth/oidc/${encodeURIComponent(provider)}/callback?${search.toString()}`;
  const response = await fetchApiWithFallback(
    callbackPath,
    {
      cache: "no-store",
    },
  ).catch(() => null);

  if (!response?.ok) {
    const errorMessage = response ? await readErrorMessage(response) : "Single sign-on failed.";
    const redirectResponse = NextResponse.redirect(new URL("/login", request.url));
    redirectResponse.cookies.set(
      AUTH_FLASH_ERROR_COOKIE,
      encodeURIComponent(errorMessage),
      {
        httpOnly: false,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: 60,
      },
    );

    return redirectResponse;
  }

  const payload = (await response.json()) as LoginResponseDto;
  const redirectTo = new URL(payload.redirectPath || "/workspaces", request.url).toString();

  const successResponse = createSessionResponse(payload, {
    persistent: true,
    redirectTo,
  });

  successResponse.cookies.set(AUTH_FLASH_ERROR_COOKIE, "", {
    httpOnly: false,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 0,
  });

  return successResponse;
}
