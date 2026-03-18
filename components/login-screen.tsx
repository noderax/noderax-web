"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound, Radar, ShieldCheck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { BrandBadge } from "@/components/brand/brand-mark";
import { GlowOrb } from "@/components/magic/glow-orb";
import { GridPattern } from "@/components/magic/grid-pattern";
import { Reveal } from "@/components/magic/reveal";
import { ShineBorder } from "@/components/magic/shine-border";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MagicCard } from "@/components/ui/magic-card";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/lib/hooks/use-auth-session";

const loginSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

const featureRows = [
  {
    title: "Secure access",
    description: "JWT-backed auth and protected workspace routes.",
    icon: ShieldCheck,
  },
  {
    title: "Realtime events",
    description: "Nodes, tasks, and alerts reconcile into the UI live.",
    icon: Radar,
  },
  {
    title: "Operator workflow",
    description: "A quieter control surface for logs, metrics, and execution state.",
    icon: KeyRound,
  },
] as const;

const overviewChips = [
  "Socket.IO /realtime",
  "REST /v1",
  "Dark operator theme",
] as const;

export const LoginScreen = ({ nextPath }: { nextPath?: string }) => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginMutation = useLogin();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const rememberValue = useWatch({
    control: form.control,
    name: "remember",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    try {
      await loginMutation.mutateAsync(values);

      const destination = nextPath?.startsWith("/") ? nextPath : "/dashboard";

      startTransition(() => {
        router.replace(destination);
        router.refresh();
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Sign in failed unexpectedly.",
      );
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GridPattern className="opacity-18 [mask-image:radial-gradient(circle_at_center,black,transparent_78%)]" />
      <GlowOrb
        className="left-[-7rem] top-[-5rem] size-[22rem]"
        color="rgba(127, 29, 29, 0.18)"
      />
      <GlowOrb
        className="bottom-[-8rem] right-[-4rem] size-[18rem]"
        color="rgba(239, 68, 68, 0.12)"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-6">
        <Reveal
          delay={0.03}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <BrandBadge size="lg" priority />
            <div>
              <p className="text-sm font-semibold tracking-tight">Noderax</p>
              <p className="text-xs text-muted-foreground">
                Secure control plane access
              </p>
            </div>
          </div>
          <ThemeToggle />
        </Reveal>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.08fr_0.92fr]">
          <Reveal delay={0.08}>
            <MagicCard
              className="rounded-[32px]"
              mode="orb"
              glowFrom="rgba(239, 68, 68, 0.24)"
              glowTo="rgba(127, 29, 29, 0.08)"
              glowSize={340}
              glowBlur={84}
              glowOpacity={0.28}
            >
              <div className="rounded-[inherit] px-7 py-8 sm:px-9 sm:py-10">
                <div className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary w-fit">
                  Operator Workspace
                </div>

                <div className="mt-6 max-w-xl space-y-4">
                  <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                    Enter the Noderax control plane.
                  </h1>
                  <p className="text-base leading-8 text-muted-foreground">
                    Manage node health, inspect task execution, and follow platform
                    events from a cleaner operational interface built for focus.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {overviewChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl"
                    >
                      {chip}
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-3">
                  {featureRows.map((feature) => (
                    <div
                      key={feature.title}
                      className="flex items-start gap-4 rounded-[22px] border border-border/70 bg-background/72 px-4 py-4 backdrop-blur-xl"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/18 bg-primary/10 text-primary">
                        <feature.icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{feature.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </MagicCard>
          </Reveal>

          <Reveal delay={0.14} className="mx-auto w-full max-w-md">
            <MagicCard
              className="rounded-[30px]"
              gradientSize={260}
              gradientOpacity={0.56}
              gradientColor="rgba(127, 29, 29, 0.1)"
              gradientFrom="rgba(248, 113, 113, 0.58)"
              gradientTo="rgba(127, 29, 29, 0.18)"
            >
              <div className="relative overflow-hidden rounded-[inherit]">
                <ShineBorder
                  shineColor={["#fca5a5", "#b91c1c", "#fb7185"]}
                  duration={16}
                  className="opacity-70"
                />

                <div className="relative z-10 space-y-6 px-6 py-7 sm:px-8 sm:py-8">
                  <div className="flex items-center gap-3">
                    <BrandBadge size="md" />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Sign In
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                        Welcome back
                      </h2>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">
                    Authenticate to access the protected dashboard and continue
                    your operator session.
                  </p>

                  <form className="space-y-4" onSubmit={onSubmit}>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="operator@noderax.io"
                        {...form.register("email")}
                      />
                      {form.formState.errors.email ? (
                        <p className="text-sm text-rose-500 dark:text-rose-300">
                          {form.formState.errors.email.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        {...form.register("password")}
                      />
                      {form.formState.errors.password ? (
                        <p className="text-sm text-rose-500 dark:text-rose-300">
                          {form.formState.errors.password.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">Remember this browser</p>
                        <p className="text-xs text-muted-foreground">
                          Keeps the secure cookie session available for return visits.
                        </p>
                      </div>
                      <Switch
                        checked={rememberValue}
                        onCheckedChange={(checked) =>
                          form.setValue("remember", Boolean(checked), {
                            shouldDirty: true,
                          })
                        }
                      />
                    </div>

                    {errorMessage ? (
                      <div className="rounded-[18px] border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
                        {errorMessage}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      size="lg"
                      className="group h-12 w-full rounded-[18px] text-base"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Enter dashboard"}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                  </form>
                </div>
              </div>
            </MagicCard>
          </Reveal>
        </div>
      </div>
    </div>
  );
};
