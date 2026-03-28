import { proxyPublicAuthRequest } from "@/app/api/auth/_shared";

export async function GET() {
  return proxyPublicAuthRequest("/auth/providers");
}
