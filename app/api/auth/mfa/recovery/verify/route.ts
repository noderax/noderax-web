import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createSessionResponse, readErrorMessage } from "@/app/api/auth/_shared";
import { API_BASE_URL_COOKIE, fetchApiWithFallback } from "@/lib/auth";
import type { LoginResponseDto } from "@/lib/types";

const schema = z.object({
  challengeToken: z.string().min(16),
  recoveryCode: z.string().min(6),
  remember: z.boolean().optional().default(false),
});

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const apiUrlOverride = cookieStore.get(API_BASE_URL_COOKIE)?.value;
    const payload = schema.parse(await request.json());
    const response = await fetchApiWithFallback(
      "/auth/mfa/recovery/verify",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          challengeToken: payload.challengeToken,
          recoveryCode: payload.recoveryCode,
        }),
        cache: "no-store",
      },
      apiUrlOverride,
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: await readErrorMessage(response) },
        { status: response.status },
      );
    }

    return createSessionResponse((await response.json()) as LoginResponseDto, {
      persistent: payload.remember,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof z.ZodError
            ? "Please enter a valid recovery code."
            : "Unable to complete MFA verification right now.",
      },
      { status: error instanceof z.ZodError ? 400 : 500 },
    );
  }
}
