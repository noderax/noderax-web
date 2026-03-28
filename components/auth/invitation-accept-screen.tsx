"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PublicAuthShell } from "@/components/auth/public-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimeDisplay } from "@/components/ui/time-display";
import { ApiError, apiClient } from "@/lib/api";
import type { InvitationPreviewDto } from "@/lib/types";

export const InvitationAcceptScreen = ({ token }: { token: string }) => {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitationPreviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadPreview = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await apiClient.getInvitationPreview(token);
        if (!isCancelled) {
          setPreview(response);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Invitation could not be loaded right now.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [token]);

  const handleAccept = async () => {
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.acceptInvitation(token, { password });
      router.replace("/login?message=invite-accepted");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Invitation could not be accepted right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicAuthShell
      eyebrow="Invitation"
      title="Activate your operator account"
      description="Create the initial password for your invited Noderax account."
      footer={
        <p>
          Invitation links are single-use. If this one expired, ask a platform
          admin to resend the invite.
        </p>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invitation…</p>
      ) : errorMessage && !preview ? (
        <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
          {errorMessage}
        </div>
      ) : preview ? (
        <div className="space-y-4">
          <div className="rounded-[18px] border px-4 py-3">
            <p className="text-sm font-medium">{preview.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{preview.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Expires <TimeDisplay value={preview.expiresAt} mode="datetime" />
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-password">Create password</Label>
            <Input
              id="invite-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-confirm-password">Confirm password</Label>
            <Input
              id="invite-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {errorMessage ? (
            <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
            onClick={() => void handleAccept()}
          >
            {isSubmitting ? "Activating..." : "Activate account"}
          </Button>
        </div>
      ) : null}
    </PublicAuthShell>
  );
};
