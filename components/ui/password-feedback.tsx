"use client";

import { CheckCircle2, Circle, ShieldAlert } from "lucide-react";

import {
  getPasswordMatchState,
  getPasswordStrength,
  type PasswordTone,
} from "@/lib/password";
import { cn } from "@/lib/utils";

const tonePanelClassName: Record<PasswordTone, string> = {
  neutral: "tone-neutral",
  danger: "tone-danger",
  warning: "tone-warning",
  success: "tone-success",
};

const toneTextClassName: Record<PasswordTone, string> = {
  neutral: "text-tone-neutral",
  danger: "text-tone-danger",
  warning: "text-tone-warning",
  success: "text-tone-success",
};

const toneSegmentClassName: Record<PasswordTone, string> = {
  neutral: "bg-muted-foreground/35",
  danger: "bg-[color:var(--destructive)]",
  warning: "bg-[color:var(--semantic-warning)]",
  success: "bg-[color:var(--semantic-success)]",
};

export const PasswordFeedback = ({
  password,
  confirmPassword,
  className,
}: {
  password: string;
  confirmPassword?: string;
  className?: string;
}) => {
  const strength = getPasswordStrength(password);
  const matchState =
    typeof confirmPassword === "string"
      ? getPasswordMatchState(password, confirmPassword)
      : null;

  return (
    <div className={cn("space-y-3 rounded-[18px] border p-4 surface-subtle", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Password strength
          </p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {strength.helperText}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            tonePanelClassName[strength.tone],
          )}
        >
          {strength.label}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-2 rounded-full transition-colors",
              index < strength.activeSegments
                ? toneSegmentClassName[strength.tone]
                : "bg-border",
            )}
          />
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {strength.rules.map((rule) => (
          <div
            key={rule.id}
            className={cn(
              "flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm",
              rule.met ? "tone-success" : "tone-neutral",
            )}
          >
            {rule.met ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <Circle className="size-4 shrink-0" />
            )}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>

      {matchState ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm",
            tonePanelClassName[matchState.tone],
          )}
          aria-live="polite"
        >
          {matchState.matches ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <ShieldAlert className="size-4 shrink-0" />
          )}
          <span className={cn("font-medium", toneTextClassName[matchState.tone])}>
            {matchState.label}
          </span>
        </div>
      ) : null}
    </div>
  );
};
