import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  API_BASE_URL_COOKIE,
  fetchApiWithFallback,
} from "@/lib/auth";
import { fetchSetupApi } from "@/lib/setup";
import type { LoginResponseDto } from "@/lib/types";
import { createSessionResponse } from "@/app/api/auth/_shared";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  remember: z.boolean().optional().default(false),
});

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(" ");
    }

    return payload.message ?? payload.error ?? "Authentication failed.";
  } catch {
    return "Authentication failed.";
  }
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const apiUrlOverride = cookieStore.get(API_BASE_URL_COOKIE)?.value;

    try {
      const setupStatusResponse = await fetchSetupApi(
        "/setup/status",
        {
          cache: "no-store",
        },
        apiUrlOverride,
      );

      if (setupStatusResponse.ok) {
        const setupStatus = (await setupStatusResponse.json()) as {
          mode: "setup" | "restart_required" | "installed" | "legacy";
        };

        if (
          setupStatus.mode === "setup" ||
          setupStatus.mode === "restart_required"
        ) {
          return NextResponse.json(
            { message: "Complete the initial setup before signing in." },
            { status: 409 },
          );
        }
      }
    } catch {
      return NextResponse.json(
        {
          message:
            "API URL is not configured. Set NODERAX_API_URL on the web app or provide an API URL from the setup screen.",
        },
        { status: 500 },
      );
    }

    const payload = loginSchema.parse(await request.json());
    let response: Response;

    try {
      response = await fetchApiWithFallback("/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
        }),
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

    if (!response) {
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

    const upstreamPayload = (await response.json()) as LoginResponseDto;
    if (upstreamPayload.requiresMfa && upstreamPayload.mfaChallengeToken) {
      return NextResponse.json(upstreamPayload, { status: 200 });
    }

    return createSessionResponse(upstreamPayload, {
      persistent: payload.remember,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? "Please provide a valid email and password."
            : "Unable to sign in right now.",
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
