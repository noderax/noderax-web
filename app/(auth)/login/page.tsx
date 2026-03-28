import { cookies } from "next/headers";

import { LoginScreen } from "@/components/login-screen";
import { AUTH_FLASH_ERROR_COOKIE } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const flashError = cookieStore.get(AUTH_FLASH_ERROR_COOKIE)?.value ?? null;

  return (
    <LoginScreen
      nextPath={params.next}
      message={params.message}
      flashError={flashError}
    />
  );
}
