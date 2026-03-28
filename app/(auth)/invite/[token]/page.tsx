import { InvitationAcceptScreen } from "@/components/auth/invitation-accept-screen";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InvitationAcceptScreen token={token} />;
}
