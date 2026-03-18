import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_SESSION_COOKIE, decodeSession } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(AUTH_SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(session);
}
