import { NextRequest, NextResponse } from "next/server";

import {
  AUTH_TOKEN_COOKIE,
  getApiRequestUrls,
  normalizeApiBaseUrl,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

const INTERNAL_API_HOSTS = new Set([
  "nginx",
  "localhost",
  "127.0.0.1",
  "api",
  "api-setup",
  "api-a",
  "api-b",
]);

const isInternalApiUrl = (value?: string | null) => {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return INTERNAL_API_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
};

const resolvePublicApiHeaderUrl = (request: NextRequest) => {
  const publicEnvApiUrl = normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_NODERAX_API_URL,
  );

  if (publicEnvApiUrl && !isInternalApiUrl(publicEnvApiUrl)) {
    return publicEnvApiUrl;
  }

  return normalizeApiBaseUrl(`${request.nextUrl.origin}/api/v1`);
};

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const upstreamUrls = getApiRequestUrls(`/${path.join("/")}`);
  const publicApiHeaderUrl = resolvePublicApiHeaderUrl(request);

  if (!upstreamUrls.length) {
    return NextResponse.json(
      {
        message:
          "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
      },
      { status: 500 },
    );
  }
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${token}`);
  headers.delete("accept-encoding");
  headers.delete("cookie");
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  if (publicApiHeaderUrl) {
    headers.set("x-noderax-public-api-url", publicApiHeaderUrl);
  }
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  let response: Response | null = null;
  let lastFetchError: Error | null = null;

  for (const upstreamUrl of upstreamUrls) {
    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    try {
      response = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body: requestBody,
        cache: "no-store",
        redirect: "manual",
      });
    } catch (error) {
      lastFetchError =
        error instanceof Error
          ? error
          : new Error("Unable to reach upstream API.");
      continue;
    }

    if (response.status !== 404) {
      break;
    }
  }

  if (!response) {
    return NextResponse.json(
      {
        message:
          lastFetchError?.message ?? "Unable to reach upstream API.",
      },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("set-cookie");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forwardRequest(request, context);
}
