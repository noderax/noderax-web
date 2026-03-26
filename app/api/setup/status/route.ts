import { proxySetupRequest } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxySetupRequest("/setup/status", {
    cache: "no-store",
  });
}
