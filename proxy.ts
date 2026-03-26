import { NextResponse, type NextRequest } from "next/server";

const AUTH_TOKEN_COOKIE = "noderax_token";
const API_BASE_URL_COOKIE = "noderax_api_url";

const readSetupStatus = async (apiUrlOverride?: string) => {
  const baseUrl =
    apiUrlOverride?.trim() ||
    process.env.NODERAX_API_URL ||
    process.env.NEXT_PUBLIC_NODERAX_API_URL;

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
    mode: "setup" | "restart_required" | "installed" | "legacy";
  };
};

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const apiUrlOverride = request.cookies.get(API_BASE_URL_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login";
  const isSetupRoute = pathname === "/setup" || pathname.startsWith("/setup/");

  try {
    const status = await readSetupStatus(apiUrlOverride);

    if (status) {
      if (
        (status.mode === "setup" || status.mode === "restart_required") &&
        !isSetupRoute
      ) {
        return NextResponse.redirect(new URL("/setup", request.url));
      }

      if (
        (status.mode === "installed" || status.mode === "legacy") &&
        isSetupRoute
      ) {
        return NextResponse.redirect(new URL(token ? "/" : "/login", request.url));
      }
    }
  } catch {
    return NextResponse.next();
  }

  if (!token && !isLoginRoute && !isSetupRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token && (isLoginRoute || isSetupRoute)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
