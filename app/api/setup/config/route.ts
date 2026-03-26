import { NextResponse } from "next/server";

import { API_BASE_URL_COOKIE } from "@/lib/auth";
import { getSetupApiConfig } from "@/lib/setup";
import { parseSetupApiUrlInput, readSetupApiConfig } from "../_shared";

export const dynamic = "force-dynamic";

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
});

export async function GET() {
  return NextResponse.json(await readSetupApiConfig(), {
    status: 200,
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as {
    apiUrl?: string | null;
  };

  const normalizedApiUrl = parseSetupApiUrlInput(payload.apiUrl);
  if (payload.apiUrl?.trim()) {
    if (!normalizedApiUrl) {
      return NextResponse.json(
        {
          message: "Enter a valid http:// or https:// API URL.",
        },
        { status: 400 },
      );
    }
  }

  const body = {
    ...getSetupApiConfig(payload.apiUrl?.trim() ? normalizedApiUrl : null),
    success: true,
  };
  const response = NextResponse.json(body, { status: 200 });

  if (payload.apiUrl?.trim()) {
    response.cookies.set(API_BASE_URL_COOKIE, normalizedApiUrl!, buildCookieOptions());
  } else {
    response.cookies.set(API_BASE_URL_COOKIE, "", {
      ...buildCookieOptions(),
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}
