import { NextResponse } from "next/server";

import {
  API_BASE_URL_COOKIE,
  buildApiBaseUrlCookieOptions,
  buildClearedApiBaseUrlCookieOptions,
} from "@/lib/auth";
import { getSetupApiConfig } from "@/lib/setup";
import { parseSetupApiUrlInput, readSetupApiConfig } from "../_shared";

export const dynamic = "force-dynamic";

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
    response.cookies.set(
      API_BASE_URL_COOKIE,
      normalizedApiUrl!,
      buildApiBaseUrlCookieOptions(),
    );
  } else {
    response.cookies.set(
      API_BASE_URL_COOKIE,
      "",
      buildClearedApiBaseUrlCookieOptions(),
    );
  }

  return response;
}
