import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AUTH_SESSION_COOKIE,
  AUTH_TOKEN_COOKIE,
  buildAuthCookieOptions,
  encodeSession,
  getApiBaseUrl,
  normalizeAuthSession,
  shouldUseMockData,
} from "@/lib/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());

    const sessionEnvelope = shouldUseMockData()
      ? normalizeAuthSession(
          {
            accessToken: `mock.${Date.now()}.token`,
          },
          payload.email,
        )
      : await (async () => {
          const response = await fetch(new URL("/auth/login", getApiBaseUrl()), {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
          });

          if (!response.ok) {
            return null;
          }

          const upstreamPayload = (await response.json()) as Record<string, unknown>;
          return normalizeAuthSession(upstreamPayload, payload.email);
        })();

    if (!sessionEnvelope) {
      return NextResponse.json(
        { message: "Invalid credentials." },
        { status: 401 },
      );
    }

    const response = NextResponse.json(sessionEnvelope.session);
    response.cookies.set(
      AUTH_TOKEN_COOKIE,
      sessionEnvelope.token,
      buildAuthCookieOptions(sessionEnvelope.session.expiresAt),
    );
    response.cookies.set(
      AUTH_SESSION_COOKIE,
      encodeSession(sessionEnvelope.session),
      buildAuthCookieOptions(sessionEnvelope.session.expiresAt),
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? "Please provide a valid email and password."
            : "Unable to sign in right now.",
      },
      { status: 400 },
    );
  }
}
