import { proxySetupRequest } from "../_shared";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxySetupRequest("/setup/runtime-preset", {
    cache: "no-store",
  });
}
