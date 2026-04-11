import { NextResponse } from "next/server";

import {
  API_BASE_URL_COOKIE,
  buildApiBaseUrlCookieOptions,
  buildClearedApiBaseUrlCookieOptions,
  normalizeApiBaseUrl,
} from "@/lib/auth";
import { getSetupApiConfig } from "@/lib/setup";
import { parseSetupApiUrlInput, readSetupApiConfig } from "../_shared";

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

const buildSetupApiConfigResponse = (
  config: ReturnType<typeof getSetupApiConfig>,
) => {
  const publicEnvApiUrl = normalizeApiBaseUrl(
    process.env.NEXT_PUBLIC_NODERAX_API_URL,
  );

  if (
    config.source === "env" &&
    isInternalApiUrl(config.apiUrl) &&
    publicEnvApiUrl
  ) {
    return {
      ...config,
      apiUrl: publicEnvApiUrl,
    };
  }

  return config;
};

export async function GET() {
  const config = await readSetupApiConfig();

  return NextResponse.json(buildSetupApiConfigResponse(config), {
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
    ...buildSetupApiConfigResponse(
      getSetupApiConfig(payload.apiUrl?.trim() ? normalizedApiUrl : null),
    ),
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
