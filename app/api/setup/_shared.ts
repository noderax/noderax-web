import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  API_BASE_URL_COOKIE,
  buildClearedApiBaseUrlCookieOptions,
  normalizeApiBaseUrl,
} from "@/lib/auth";
import { fetchSetupApi, getSetupApiConfig } from "@/lib/setup";

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    return payload.message ?? payload.error ?? "Setup request failed.";
  } catch {
    return "Setup request failed.";
  }
};

export const proxySetupRequest = async (
  path: string,
  init?: RequestInit,
  options?: { clearApiBaseUrlCookieOnSuccess?: boolean },
) => {
  const cookieStore = await cookies();
  const apiUrlOverride = cookieStore.get(API_BASE_URL_COOKIE)?.value;
  const apiConfig = getSetupApiConfig(apiUrlOverride);
  let response: Response;

  try {
    response = await fetchSetupApi(path, init, apiConfig.apiUrl);
  } catch {
    return NextResponse.json(
      {
        message:
          "Setup API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
      },
      { status: 500 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { message: await readErrorMessage(response) },
      { status: response.status },
    );
  }

  const proxiedResponse = NextResponse.json(await response.json(), {
    status: response.status,
  });

  if (options?.clearApiBaseUrlCookieOnSuccess) {
    proxiedResponse.cookies.set(
      API_BASE_URL_COOKIE,
      "",
      buildClearedApiBaseUrlCookieOptions(),
    );
  }

  return proxiedResponse;
};

export const readSetupApiConfig = async () => {
  const cookieStore = await cookies();
  const apiUrlOverride = cookieStore.get(API_BASE_URL_COOKIE)?.value;

  return getSetupApiConfig(apiUrlOverride);
};

export const parseSetupApiUrlInput = (value?: string | null) =>
  normalizeApiBaseUrl(value);
