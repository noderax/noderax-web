import { proxyPublicAuthRequest } from "@/app/api/auth/_shared";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyPublicAuthRequest(
    `/auth/password/reset/${encodeURIComponent(token)}`,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyPublicAuthRequest(
    `/auth/password/reset/${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: await request.text(),
    },
  );
}
