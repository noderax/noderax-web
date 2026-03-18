import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE, AUTH_TOKEN_COOKIE } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(AUTH_TOKEN_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}
