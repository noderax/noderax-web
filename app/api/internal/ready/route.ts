import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "noderax-web",
      status: "ready",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
