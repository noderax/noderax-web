"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PublicAuthShell } from "@/components/auth/public-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordFeedback } from "@/components/ui/password-feedback";
import { TimeDisplay } from "@/components/ui/time-display";
import { ApiError, apiClient } from "@/lib/api";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import type { PasswordResetPreviewDto } from "@/lib/types";

export const ResetPasswordScreen = ({ token }: { token: string }) => {
  const router = useRouter();
  const [preview, setPreview] = useState<PasswordResetPreviewDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPasswordLongEnough = password.length >= PASSWORD_MIN_LENGTH;
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isPasswordLongEnough && doPasswordsMatch && !isSubmitting;

  useEffect(() => {
    let isCancelled = false;

    const loadPreview = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await apiClient.getPasswordResetPreview(token);
        if (!isCancelled) {
          setPreview(response);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Reset token could not be loaded right now.",
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

  const handleReset = async () => {
    setErrorMessage(null);

    if (!isPasswordLongEnough) {
      setErrorMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    if (!doPasswordsMatch) {
      setErrorMessage("Password confirmation must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.resetPassword(token, { password });
      router.replace("/login?message=password-reset");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Password could not be reset right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicAuthShell
      eyebrow="Password reset"
      title="Set a new password"
      description="Choose a fresh password for your Noderax operator account."
      footer={
        <p>
          Reset links expire quickly for security. If needed, request another one
          from the forgot-password screen.
        </p>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reset link…</p>
      ) : errorMessage && !preview ? (
        <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
          {errorMessage}
        </div>
      ) : preview ? (
        <div className="space-y-4">
          <div className="rounded-[18px] border px-4 py-3">
            <p className="text-sm font-medium">{preview.email}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Expires <TimeDisplay value={preview.expiresAt} mode="datetime" />
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">Confirm password</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setErrorMessage(null);
              }}
            />
          </div>

          <PasswordFeedback
            password={password}
            confirmPassword={confirmPassword}
          />

          {errorMessage ? (
            <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
              {errorMessage}
            </div>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => void handleReset()}
          >
            {isSubmitting ? "Updating..." : "Reset password"}
          </Button>
        </div>
      ) : null}
    </PublicAuthShell>
  );
};
