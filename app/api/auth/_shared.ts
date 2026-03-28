import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE_URL_COOKIE, fetchApiWithFallback } from "@/lib/auth";

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    return payload.message ?? payload.error ?? "Authentication request failed.";
  } catch {
    return "Authentication request failed.";
  }
};

export const proxyPublicAuthRequest = async (path: string, init?: RequestInit) => {
  const cookieStore = await cookies();
  const apiUrlOverride = cookieStore.get(API_BASE_URL_COOKIE)?.value;
  let response: Response;

  try {
    response = await fetchApiWithFallback(path, {
      ...init,
      cache: "no-store",
    }, apiUrlOverride);
  } catch {
    return NextResponse.json(
      {
        message:
          "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
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

  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(await response.json(), {
    status: response.status,
  });
};
