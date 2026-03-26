import { NextRequest, NextResponse } from "next/server";

import {
  API_BASE_URL_COOKIE,
  AUTH_TOKEN_COOKIE,
  getApiRequestUrls,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const apiUrlOverride = request.cookies.get(API_BASE_URL_COOKIE)?.value;
  const upstreamUrls = getApiRequestUrls(`/${path.join("/")}`, apiUrlOverride);

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
  const requestBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  let response: Response | null = null;

  for (const upstreamUrl of upstreamUrls) {
    request.nextUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: requestBody,
      cache: "no-store",
      redirect: "manual",
    });

    if (response.status !== 404) {
      break;
    }
  }

  if (!response) {
    return NextResponse.json(
      { message: "Unable to reach upstream API." },
      { status: 502 },
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
