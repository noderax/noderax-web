import { NextResponse, type NextRequest } from "next/server";

import { buildClearedApiBaseUrlCookieOptions } from "@/lib/auth";

const AUTH_TOKEN_COOKIE = "noderax_token";
const API_BASE_URL_COOKIE = "noderax_api_url";
const PUBLIC_AUTH_ROUTES = ["/login", "/forgot-password"] as const;
const PUBLIC_AUTH_ROUTE_PREFIXES = ["/reset-password/", "/invite/"] as const;

const isPublicAuthRoute = (pathname: string) =>
  PUBLIC_AUTH_ROUTES.includes(pathname as (typeof PUBLIC_AUTH_ROUTES)[number]) ||
  PUBLIC_AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const readSetupStatus = async () => {
  const baseUrl =
    process.env.NODERAX_API_URL || process.env.NEXT_PUBLIC_NODERAX_API_URL;

  if (!baseUrl) {
    return null;
  }

  const url = new URL(baseUrl);
  const normalizedBasePath =
    url.pathname && url.pathname !== "/"
      ? `/${url.pathname.replace(/^\/+|\/+$/g, "")}`
      : "/api/v1";

  if (normalizedBasePath === "/" || normalizedBasePath === "/v1") {
    url.pathname = "/api/v1/setup/status";
  } else if (normalizedBasePath === "/api/v1") {
    url.pathname = "/api/v1/setup/status";
  } else {
    url.pathname = `${normalizedBasePath}/setup/status`;
  }

  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as {
    mode: "setup" | "promoting" | "installed" | "legacy";
  };
};

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const apiUrlOverride = request.cookies.get(API_BASE_URL_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login";
  const isPublicRoute = isPublicAuthRoute(pathname);
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");
  const shouldClearApiOverride = Boolean(apiUrlOverride);
  let clearCookieForInstalledSystem = false;
  const finalizeResponse = (response: NextResponse, clearCookie = false) => {
    if (clearCookie && shouldClearApiOverride) {
      response.cookies.set(
        API_BASE_URL_COOKIE,
        "",
        buildClearedApiBaseUrlCookieOptions(),
      );
    }

    return response;
  };

  try {
    const status = await readSetupStatus();

    if (status) {
      clearCookieForInstalledSystem =
        status.mode === "installed" || status.mode === "legacy";

      if (
        (status.mode === "setup" || status.mode === "promoting") &&
        !isSetupRoute
      ) {
        return finalizeResponse(
          NextResponse.redirect(new URL("/setup", request.url)),
        );
      }

      if (
        (status.mode === "installed" || status.mode === "legacy") &&
        isSetupRoute
      ) {
        return finalizeResponse(
          NextResponse.redirect(new URL(token ? "/" : "/login", request.url)),
          clearCookieForInstalledSystem,
        );
      }
    }
  } catch {
    return NextResponse.next();
  }

  if (!token && !isPublicRoute && !isSetupRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return finalizeResponse(
      NextResponse.redirect(loginUrl),
      clearCookieForInstalledSystem,
    );
  }

  if (token && (isLoginRoute || isSetupRoute)) {
    return finalizeResponse(
      NextResponse.redirect(new URL("/", request.url)),
      clearCookieForInstalledSystem,
    );
  }

  return finalizeResponse(NextResponse.next(), clearCookieForInstalledSystem);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
