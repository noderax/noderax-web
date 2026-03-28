import { proxyPublicAuthRequest } from "@/app/api/auth/_shared";

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyPublicAuthRequest(
    `/auth/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: await request.text(),
    },
  );
}
