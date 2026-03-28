"use client";

import { startTransition, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BellRing,
  KeyRound,
  LayoutDashboard,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { BrandBadge } from "@/components/brand/brand-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Reveal } from "@/components/magic/reveal";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Particles } from "@/components/ui/particles";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { useLogin } from "@/lib/hooks/use-auth-session";
import {
  buildWorkspacePath,
  clearPersistedWorkspaceSlug,
  persistWorkspaceSlug,
  pickDefaultWorkspace,
  readWorkspaceChildPath,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const loginSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  remember: z.boolean(),
});

type LoginValues = z.infer<typeof loginSchema>;

const overviewChips = [
  "JWT cookie session",
  "Next.js proxy /v1",
  "Socket.IO /realtime",
] as const;

const workspaceHighlights: readonly {
  title: string;
  description: string;
  icon: LucideIcon;
  toneClassName: string;
}[] = [
  {
    title: "Dashboard snapshots",
    description: "Quick operational context, telemetry cards, and recent activity.",
    icon: LayoutDashboard,
    toneClassName: "tone-brand",
  },
  {
    title: "Nodes and tasks",
    description: "Inventory, execution state, live logs, and per-node detail.",
    icon: Server,
    toneClassName: "tone-success",
  },
  {
    title: "Events in realtime",
    description: "Status changes, metrics, task updates, and event flow after auth.",
    icon: BellRing,
    toneClassName: "tone-warning",
  },
] as const;

const loginMessageCopy: Record<string, string> = {
  "invite-accepted":
    "Account activated. Sign in with the password you just created.",
  "password-reset":
    "Password reset complete. Sign in with your new password.",
  "password-updated":
    "Password updated. Sign in again to continue.",
};

function LoginBackdrop() {
  const { resolvedTheme } = useTheme();
  const reduceMotion = Boolean(useReducedMotion());
  const particleColor = resolvedTheme === "dark" ? "#f5f5f5" : "#7f1d1d";

  return (
    <>
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
          quantity={70}
          ease={80}
          staticity={45}
          size={0.8}
          color={particleColor}
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,color-mix(in_oklch,var(--background)_52%,transparent)_70%,var(--background)_100%)]" />
    </>
  );
}

export const LoginScreen = ({
  nextPath,
  message,
}: {
  nextPath?: string;
  message?: string;
}) => {
  const router = useRouter();
  const reduceMotion = Boolean(useReducedMotion());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginMutation = useLogin();
  const setActiveWorkspaceSlug = useAppStore(
    (state) => state.setActiveWorkspaceSlug,
  );

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
  const loginMessage = message ? loginMessageCopy[message] : null;

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);

    try {
      await loginMutation.mutateAsync(values);

      const workspaces = await apiClient.getWorkspaces();
      const preferredWorkspace = pickDefaultWorkspace(workspaces) ?? workspaces[0] ?? null;
      const workspaceTargetPath = resolveWorkspaceTargetPath(nextPath);

      if (preferredWorkspace) {
        setActiveWorkspaceSlug(preferredWorkspace.slug);
        persistWorkspaceSlug(preferredWorkspace.slug);
      } else {
        setActiveWorkspaceSlug(null);
        clearPersistedWorkspaceSlug();
      }

      const destination = preferredWorkspace
        ? workspaceTargetPath
          ? buildWorkspacePath(preferredWorkspace.slug, workspaceTargetPath)
          : nextPath?.startsWith("/")
            ? nextPath
            : buildWorkspacePath(preferredWorkspace.slug, "dashboard")
        : "/workspaces";

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
    <div className="relative h-dvh overflow-hidden bg-background">
      <LoginBackdrop />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <Reveal
          delay={0.03}
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <BrandBadge size="lg" priority />
            <div>
              <p className="text-sm font-semibold tracking-tight">Noderax</p>
              <p className="text-xs text-muted-foreground">
                Noderax is an agent-based infrastructure management platform.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </Reveal>

        <div className="grid min-h-0 flex-1 items-center gap-8 py-4 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14">
          <Reveal
            delay={0.08}
            className="hidden lg:flex lg:min-h-0 lg:flex-col lg:justify-center"
          >
            <div className="max-w-xl space-y-7">
              <div className="space-y-4">
                <div className="tone-brand w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Operator workspace
                </div>

                <h1 className="text-balance text-5xl font-semibold tracking-tight xl:text-[3.6rem] xl:leading-[1.02]">
                  Secure access to the Noderax control plane.
                </h1>

                <p className="max-w-lg text-base leading-8 text-muted-foreground">
                  Sign in to reach dashboard snapshots, node inventory, task
                  execution, event history, settings, and authenticated realtime
                  updates through the Next.js proxy layer.
                </p>

                <div className="flex flex-wrap gap-2">
                  {overviewChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-full border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur-xl"
                    >
                      {chip}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {workspaceHighlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-border/70 bg-background/68 px-4 py-4 backdrop-blur-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-2xl border",
                          item.toneClassName,
                        )}
                      >
                        <item.icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.14} className="mx-auto w-full max-w-md lg:max-w-none">
            <Card className="relative overflow-hidden border-border/70 bg-background/82 shadow-[0_18px_60px_-30px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <CardHeader className="border-border/70 border-b px-6 py-5 sm:px-7">
                <div className="flex items-center gap-3">
                  <BrandBadge size="md" />
                  <div className="min-w-0">
                    <CardTitle className="text-[1.65rem]">Sign in</CardTitle>
                    <CardDescription className="mt-1">
                      Enter your operator credentials to access the workspace.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-6 py-5 sm:px-7">
                <div className="flex flex-wrap gap-2 lg:hidden">
                  {overviewChips.map((chip) => (
                    <div
                      key={chip}
                      className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {chip}
                    </div>
                  ))}
                </div>

                <form className="space-y-3.5" onSubmit={onSubmit}>
                  {loginMessage ? (
                    <div className="tone-success rounded-[18px] border px-4 py-3 text-sm leading-6">
                      {loginMessage}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="operator@noderax.io"
                      aria-invalid={Boolean(form.formState.errors.email)}
                      className="h-11 rounded-[16px] px-4"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email ? (
                      <p className="text-sm text-tone-danger">
                        {form.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      aria-invalid={Boolean(form.formState.errors.password)}
                      className="h-11 rounded-[16px] px-4"
                      {...form.register("password")}
                    />
                    {form.formState.errors.password ? (
                      <p className="text-sm text-tone-danger">
                        {form.formState.errors.password.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="surface-subtle flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Remember this browser</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Keep the secure cookie session available on this device.
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

                  <div className="flex items-center justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {errorMessage ? (
                    <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
                      {errorMessage}
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    size="lg"
                    className="group h-11 w-full rounded-[16px] text-base"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Enter dashboard"}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-3 border-border/70 px-6 py-5 sm:px-7">
                <div className="flex items-center gap-3 rounded-[18px] border border-border/70 bg-background/76 px-4 py-3">
                  <div className="tone-brand flex size-9 items-center justify-center rounded-2xl border">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Protected route access</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      `/login` unlocks the proxy layer and workspace routes after
                      authentication.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="tone-brand flex size-8 items-center justify-center rounded-full border">
                    <KeyRound className="size-4" />
                  </div>
                  <p>Admins also gain access to user management after sign-in.</p>
                </div>
              </CardFooter>

              {!reduceMotion ? (
                <>
                  <BorderBeam
                    duration={8}
                    size={110}
                    colorFrom="#fb923c"
                    colorTo="#ef4444"
                  />
                  <BorderBeam
                    duration={8}
                    delay={4}
                    size={110}
                    reverse
                    colorFrom="#7f1d1d"
                    colorTo="#fca5a5"
                  />
                </>
              ) : null}
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
};

const resolveWorkspaceTargetPath = (nextPath?: string) => {
  if (!nextPath?.startsWith("/")) {
    return "dashboard";
  }

  if (nextPath === "/" || nextPath === "/dashboard") {
    return "dashboard";
  }

  if (
    nextPath === "/nodes" ||
    nextPath.startsWith("/nodes/") ||
    nextPath === "/tasks" ||
    nextPath.startsWith("/tasks/") ||
    nextPath === "/events" ||
    nextPath === "/scheduled-tasks"
  ) {
    return nextPath.replace(/^\/+/, "");
  }

  if (nextPath.startsWith("/w/")) {
    return readWorkspaceChildPath(nextPath);
  }

  return null;
};
