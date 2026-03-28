import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ResetPasswordScreen token={token} />;
}
