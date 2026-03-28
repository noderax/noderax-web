import { proxyPublicAuthRequest } from "@/app/api/auth/_shared";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyPublicAuthRequest(`/auth/invitations/${encodeURIComponent(token)}`);
}
