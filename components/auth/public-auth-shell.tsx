"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";

import { BrandBadge } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Particles } from "@/components/ui/particles";

export const PublicAuthShell = ({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) => {
  const { resolvedTheme } = useTheme();
  const reduceMotion = Boolean(useReducedMotion());
  const particleColor = resolvedTheme === "dark" ? "#f5f5f5" : "#7f1d1d";

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_94%,white),var(--background))]" />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 20%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 26%), radial-gradient(circle at 84% 18%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 22%), linear-gradient(180deg, transparent, color-mix(in oklch, var(--background) 86%, transparent))",
        }}
      />
      {!reduceMotion ? (
        <Particles
          className="absolute inset-0"
          quantity={60}
          ease={80}
          staticity={45}
          size={0.8}
          color={particleColor}
        />
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,color-mix(in_oklch,var(--background)_52%,transparent)_70%,var(--background)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4 sm:items-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground backdrop-blur-xl transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to sign in
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-start justify-center py-6 sm:items-center sm:py-8">
          <div className="w-full max-w-xl">
            <Card className="border-border/70 bg-background/82 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <CardHeader className="space-y-4 border-b border-border/70 px-6 py-6 sm:px-7">
                <div className="flex items-center gap-3">
                  <BrandBadge size="md" />
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Noderax</p>
                    <p className="text-xs text-muted-foreground">
                      Secure operator access and account lifecycle.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="tone-brand w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {eyebrow}
                  </div>
                  <CardTitle className="text-[1.8rem] tracking-tight">{title}</CardTitle>
                  <CardDescription className="text-sm leading-6">
                    {description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-6 py-6 sm:px-7">
                {children}
                {footer ? (
                  <div className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
                    {footer}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
