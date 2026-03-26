import { proxySetupRequest } from "../../_shared";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return proxySetupRequest("/setup/validate/redis", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(await request.json()),
    cache: "no-store",
  });
}
