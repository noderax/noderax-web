"use client";

import Link from "next/link";
import { useState } from "react";

import { PublicAuthShell } from "@/components/auth/public-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiClient } from "@/lib/api";

export const ForgotPasswordScreen = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiClient.requestPasswordReset({
        email: email.trim(),
      });
      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Password reset request could not be sent right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicAuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      description="Enter your work email and we will send a password reset link if the account is eligible."
      footer={
        <p>
          Need the original invitation instead? Ask a platform admin to resend it
          from the users screen.
        </p>
      }
    >
      {isSubmitted ? (
        <div className="space-y-4">
          <div className="tone-success rounded-[18px] border px-4 py-3 text-sm leading-6">
            If the account exists and can receive reset emails, a fresh password
            reset link is on its way.
          </div>
          <Link
            href="/login"
            className="inline-flex text-sm font-medium text-primary transition-opacity hover:opacity-80"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Work email</Label>
            <Input
              id="forgot-password-email"
              type="email"
              autoComplete="email"
              placeholder="operator@noderax.io"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
            disabled={isSubmitting || email.trim().length < 3}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </div>
      )}
    </PublicAuthShell>
  );
};
