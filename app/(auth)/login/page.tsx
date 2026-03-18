import { LoginScreen } from "@/components/login-screen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return <LoginScreen nextPath={params.next} />;
}
