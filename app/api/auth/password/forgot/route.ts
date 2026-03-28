import { proxyPublicAuthRequest } from "@/app/api/auth/_shared";

export async function POST(request: Request) {
  return proxyPublicAuthRequest("/auth/password/forgot", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: await request.text(),
  });
}
