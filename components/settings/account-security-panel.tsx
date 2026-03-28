"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode } from "@/components/ui/qr-code";
import { SectionPanel } from "@/components/ui/section-panel";
import {
  useConfirmMfaSetup,
  useDisableMfa,
  useInitiateMfaSetup,
  useRegenerateMfaRecoveryCodes,
} from "@/lib/hooks/use-noderax-data";

export const AccountSecurityPanel = ({
  mfaEnabled,
  embedded = false,
}: {
  mfaEnabled: boolean;
  embedded?: boolean;
}) => {
  const initiateMfaSetup = useInitiateMfaSetup();
  const confirmMfaSetup = useConfirmMfaSetup();
  const regenerateRecoveryCodes = useRegenerateMfaRecoveryCodes();
  const disableMfa = useDisableMfa();
  const [setupState, setSetupState] = useState<{
    secret: string;
    otpauthUrl: string;
  } | null>(null);
  const [setupToken, setSetupToken] = useState("");
  const [actionToken, setActionToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const startSetup = async () => {
    try {
      const result = await initiateMfaSetup.mutateAsync();
      setSetupState(result);
      setSetupToken("");
      toast.success("MFA setup initialized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to initiate MFA setup.");
    }
  };

  const confirmSetup = async () => {
    try {
      const result = await confirmMfaSetup.mutateAsync(setupToken.trim());
      setRecoveryCodes(result.recoveryCodes ?? []);
      setSetupState(null);
      setSetupToken("");
      toast.success("MFA enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to confirm MFA.");
    }
  };

  const regenerateCodes = async () => {
    try {
      const result = await regenerateRecoveryCodes.mutateAsync({
        token: actionToken.trim(),
      });
      setRecoveryCodes(result.recoveryCodes ?? []);
      setActionToken("");
      toast.success("Recovery codes regenerated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to regenerate recovery codes.",
      );
    }
  };

  const removeMfa = async () => {
    try {
      await disableMfa.mutateAsync({ token: actionToken.trim() });
      setActionToken("");
      setRecoveryCodes([]);
      setSetupState(null);
      toast.success("MFA disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to disable MFA.");
    }
  };

  const content = (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge className="rounded-full px-3 py-1">
          {mfaEnabled ? "MFA enabled" : "MFA disabled"}
        </Badge>
        {recoveryCodes.length ? (
          <Badge variant="outline" className="rounded-full px-3 py-1">
            Fresh recovery codes ready
          </Badge>
        ) : null}
      </div>

      {!mfaEnabled && !setupState ? (
        <div className="rounded-[20px] border p-4">
          <div className="flex items-start gap-3">
            <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
              <Shield className="size-4.5" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Start MFA enrollment</p>
              <p className="text-sm text-muted-foreground">
                Generate a TOTP secret for your authenticator app, then confirm
                with a six-digit code to activate MFA on this account.
              </p>
              <Button
                type="button"
                onClick={() => void startSetup()}
                disabled={initiateMfaSetup.isPending}
              >
                {initiateMfaSetup.isPending ? "Preparing..." : "Start MFA setup"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {setupState ? (
        <div className="space-y-4 rounded-[20px] border p-4">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            <div className="space-y-3">
              <div>
                <p className="font-medium">Scan QR code</p>
                <p className="text-sm text-muted-foreground">
                  Open Google Authenticator, 1Password, Authy, or another TOTP
                  app and scan this code.
                </p>
              </div>
              <QrCode
                value={setupState.otpauthUrl}
                className="mx-auto lg:mx-0"
              />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Manual setup fallback</p>
              <p className="text-sm text-muted-foreground">
                If scanning is not available, enter this secret manually in your
                authenticator app.
              </p>
              <p className="rounded-[16px] border bg-muted/20 px-3 py-2 font-mono text-sm">
                {setupState.secret}
              </p>
              <p className="text-xs text-muted-foreground">
                If your authenticator app supports deep links, you can also open
                the full <code>otpauth://</code> URI directly.
              </p>
              <pre className="whitespace-pre-wrap break-words rounded-[16px] border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {setupState.otpauthUrl}
              </pre>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-mfa-setup-token">Verification code</Label>
            <Input
              id="settings-mfa-setup-token"
              inputMode="numeric"
              placeholder="123456"
              value={setupToken}
              onChange={(event) => setSetupToken(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={confirmMfaSetup.isPending || setupToken.trim().length < 6}
              onClick={() => void confirmSetup()}
            >
              {confirmMfaSetup.isPending ? "Confirming..." : "Confirm and enable MFA"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSetupState(null);
                setSetupToken("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {mfaEnabled ? (
        <div className="space-y-4 rounded-[20px] border p-4">
          <div className="flex items-start gap-3">
            <div className="tone-success flex size-11 items-center justify-center rounded-full border">
              <CheckCircle2 className="size-4.5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">MFA is active on this account</p>
              <p className="text-sm text-muted-foreground">
                Regenerate recovery codes or disable MFA by entering a fresh
                authenticator code below.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-mfa-action-token">Authenticator code</Label>
            <Input
              id="settings-mfa-action-token"
              inputMode="numeric"
              placeholder="123456"
              value={actionToken}
              onChange={(event) => setActionToken(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                regenerateRecoveryCodes.isPending || actionToken.trim().length < 6
              }
              onClick={() => void regenerateCodes()}
            >
              {regenerateRecoveryCodes.isPending
                ? "Generating..."
                : "Regenerate recovery codes"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={disableMfa.isPending || actionToken.trim().length < 6}
              onClick={() => void removeMfa()}
            >
              {disableMfa.isPending ? "Disabling..." : "Disable MFA"}
            </Button>
          </div>
        </div>
      ) : null}

      {recoveryCodes.length ? (
        <div className="rounded-[20px] border p-4">
          <div className="flex items-start gap-3">
            <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
              <KeyRound className="size-4.5" />
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium">Recovery codes</p>
                <p className="text-sm text-muted-foreground">
                  Each code can be used once if you lose access to your
                  authenticator app.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {recoveryCodes.map((code) => (
                  <div
                    key={code}
                    className="rounded-[14px] border bg-muted/20 px-3 py-2 font-mono text-sm"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
            <Shield className="size-4.5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium">Multi-factor authentication</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Protect password-based login with TOTP, QR setup, and single-use
              recovery codes.
            </p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <SectionPanel
      eyebrow="Security"
      title="Multi-factor authentication"
      description="Protect password-based login with TOTP and single-use recovery codes."
      contentClassName="space-y-4"
    >
      {content}
    </SectionPanel>
  );
};
