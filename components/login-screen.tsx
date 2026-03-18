"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { AnimatedCard } from "@/components/magic/animated-card";
import { GlowOrb } from "@/components/magic/glow-orb";
import { GridPattern } from "@/components/magic/grid-pattern";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { useLogin } from "@/lib/hooks/use-auth-session";

const loginSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

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
      });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Sign in failed unexpectedly.",
      );
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <GlowOrb className="left-[-8rem] top-[-8rem] h-80 w-80" />
      <GlowOrb
        className="right-[-6rem] top-16 h-72 w-72"
        color="rgba(45, 212, 191, 0.16)"
      />
      <GridPattern className="opacity-35" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex items-center justify-between px-6 py-6">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-primary/80 uppercase">
              Noderax
            </p>
            <p className="text-sm text-muted-foreground">
              Secure control plane access
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-6 pb-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="max-w-xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/75">
              Production-grade operations
            </p>
            <h1 className="max-w-lg text-4xl font-semibold tracking-tight sm:text-5xl">
              <span className="text-shimmer">
                One dashboard for your entire node fleet.
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Manage nodes, watch task execution, stream live logs, and react to operational events with a focused interface built for high-volume SaaS teams.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-border/70 bg-card/50 p-5 shadow-dashboard">
                <div className="mb-4 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <p className="font-medium">JWT route protection</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Secure cookie-backed session flow with middleware enforcement on protected views.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card/50 p-5 shadow-dashboard">
                <div className="mb-4 inline-flex rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                  <Sparkles className="size-5" />
                </div>
                <p className="font-medium">Realtime orchestration</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Query cache mutation, websocket updates, and critical event toasts keep the surface live.
                </p>
              </div>
            </div>
          </div>

          <AnimatedCard className="mx-auto w-full max-w-md">
            <div className="relative rounded-[28px] border border-border/70 bg-card/80 p-7 shadow-dashboard backdrop-blur-xl">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <TerminalSquare className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">Sign in to Noderax</p>
                  <p className="text-sm text-muted-foreground">
                    Authenticate to access the realtime dashboard.
                  </p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={onSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                  {form.formState.errors.email ? (
                    <p className="text-sm text-rose-300">
                      {form.formState.errors.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password ? (
                    <p className="text-sm text-rose-300">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Remember this browser</p>
                    <p className="text-xs text-muted-foreground">
                      Keeps the cookie session active for returning operators.
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
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {errorMessage}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  size="lg"
                  className="h-11 w-full rounded-2xl"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Enter dashboard"}
                </Button>
              </form>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
};
