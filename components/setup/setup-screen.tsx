"use client";

import type { HTMLAttributes, HTMLInputTypeAttribute } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  KeyRound,
  RefreshCcw,
  Send,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";

import { BrandBadge } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
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
import { Progress } from "@/components/ui/progress";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Switch } from "@/components/ui/switch";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { ApiError } from "@/lib/api";
import {
  useInstallSetup,
  useSetupApiConfig,
  useSetupRuntimePreset,
  useSetupStatus,
  useUpdateSetupApiConfig,
  useValidateSetupPostgres,
  useValidateSetupRedis,
  useValidateSetupSmtp,
} from "@/lib/hooks/use-setup";
import type {
  SetupInstallPayload,
  SetupMode,
  SetupStatusResponse,
  ValidatePostgresSetupResponse,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const steps = [
  {
    key: "welcome",
    label: "Welcome",
    icon: Sparkles,
  },
  {
    key: "postgres",
    label: "Postgres",
    icon: Database,
  },
  {
    key: "redis",
    label: "Redis",
    icon: ServerCog,
  },
  {
    key: "admin",
    label: "Admin",
    icon: ShieldCheck,
  },
  {
    key: "workspace",
    label: "Workspace",
    icon: Waypoints,
  },
  {
    key: "smtp",
    label: "SMTP",
    icon: Send,
  },
  {
    key: "review",
    label: "Install",
    icon: KeyRound,
  },
] as const;

type SmtpTestState = {
  tone: "success" | "error";
  message: string;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const DEFAULT_WEB_APP_URL = "http://localhost:3001";
const API_PATH_SUFFIX = "/api/v1";

const isValidUrl = (value: string) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const buildPublicApiUrl = (value?: string | null) => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    url.pathname = API_PATH_SUFFIX;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

const isMailStepValid = (payload: SetupInstallPayload["mail"]) =>
  Number.isFinite(payload.smtpPort) &&
  payload.smtpPort > 0 &&
  payload.fromEmail.includes("@") &&
  payload.fromName.trim().length >= 1 &&
  isValidUrl(payload.webAppUrl);

const getSmtpStatusClassName = (tone: SmtpTestState["tone"]) =>
  tone === "success"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

const buildDefaultPayload = (): SetupInstallPayload => ({
  postgres: {
    host: "127.0.0.1",
    port: 5432,
    username: "postgres",
    password: "",
    database: "noderax",
    ssl: false,
  },
  redis: {
    host: "127.0.0.1",
    port: 6379,
    password: "",
    db: 0,
  },
  admin: {
    name: "",
    email: "",
    password: "",
  },
  workspace: {
    name: "",
    slug: "",
    defaultTimezone: "UTC",
  },
  mail: {
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUsername: "",
    smtpPassword: "",
    fromEmail: "noreply@noderax.local",
    fromName: "Noderax",
    webAppUrl: DEFAULT_WEB_APP_URL,
  },
});

export const SetupScreen = () => {
  const router = useRouter();
  const statusQuery = useSetupStatus();
  const apiConfigQuery = useSetupApiConfig();
  const runtimePresetQuery = useSetupRuntimePreset();
  const updateApiConfigMutation = useUpdateSetupApiConfig();
  const validatePostgresMutation = useValidateSetupPostgres();
  const validateRedisMutation = useValidateSetupRedis();
  const validateSmtpMutation = useValidateSetupSmtp();
  const installMutation = useInstallSetup();
  const [payload, setPayload] =
    useState<SetupInstallPayload>(buildDefaultPayload);
  const [setupApiUrlInput, setSetupApiUrlInput] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [workspaceSlugTouched, setWorkspaceSlugTouched] = useState(false);
  const [runtimePresetApplied, setRuntimePresetApplied] = useState(false);
  const [postgresCheck, setPostgresCheck] =
    useState<ValidatePostgresSetupResponse | null>(null);
  const [redisValidated, setRedisValidated] = useState(false);
  const [smtpCheck, setSmtpCheck] = useState<SmtpTestState | null>(null);
  const runtimePresetApiUrl = useMemo(
    () => buildPublicApiUrl(runtimePresetQuery.data?.publicOrigin),
    [runtimePresetQuery.data?.publicOrigin],
  );
  const displayApiUrl = useMemo(() => {
    if (apiConfigQuery.data?.source === "cookie") {
      return apiConfigQuery.data.apiUrl;
    }

    return runtimePresetApiUrl ?? apiConfigQuery.data?.apiUrl ?? null;
  }, [apiConfigQuery.data?.apiUrl, apiConfigQuery.data?.source, runtimePresetApiUrl]);
  const displayApiUrlSourceLabel = useMemo(() => {
    if (apiConfigQuery.data?.source === "cookie") {
      return "Setup screen override";
    }

    if (runtimePresetApiUrl) {
      return "Installer public origin";
    }

    if (apiConfigQuery.data?.source === "env") {
      return "Web app environment";
    }

    return "Missing";
  }, [apiConfigQuery.data?.source, runtimePresetApiUrl]);

  useEffect(() => {
    const status = statusQuery.data;
    if (!status) {
      return;
    }

    if (status.mode === "installed" || status.mode === "legacy") {
      router.replace("/login");
    }
  }, [router, statusQuery.data]);

  useEffect(() => {
    setSetupApiUrlInput(displayApiUrl ?? "");
  }, [displayApiUrl]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const origin = window.location.origin;

    setPayload((current) =>
      current.mail.webAppUrl === DEFAULT_WEB_APP_URL
        ? {
            ...current,
            mail: {
              ...current.mail,
              webAppUrl: origin,
            },
          }
        : current,
    );
  }, []);

  useEffect(() => {
    setSmtpCheck(null);
  }, [payload.mail]);

  useEffect(() => {
    const preset = runtimePresetQuery.data;

    if (!preset || runtimePresetApplied || preset.mode !== "local_bundle") {
      return;
    }

    setPayload((current) => ({
      ...current,
      postgres: {
        ...current.postgres,
        ...preset.postgresPreset,
      },
      redis: {
        ...current.redis,
        ...preset.redisPreset,
      },
      mail: {
        ...current.mail,
        webAppUrl: preset.publicOrigin || current.mail.webAppUrl,
      },
    }));
    setRuntimePresetApplied(true);
  }, [runtimePresetApplied, runtimePresetQuery.data]);

  const setupStatus = statusQuery.data;
  const setupStatusErrorMessage =
    statusQuery.error instanceof Error
      ? statusQuery.error.message
      : "The web app could not read installer status from the API.";
  const stateDirectory = setupStatus?.stateDirectory;
  const currentStep = steps[stepIndex] ?? null;
  const isPromotionView =
    setupStatus?.mode === "promoting" || stepIndex >= steps.length;
  const isStateDirectoryBlocked =
    setupStatus?.mode === "setup" && stateDirectory?.writable === false;
  const completionValue =
    stepIndex >= steps.length
      ? 100
      : ((stepIndex + 1) / (steps.length + 1)) * 100;
  const canMoveNext = useMemo(() => {
    switch (currentStep?.key) {
      case "welcome":
        return true;
      case "postgres":
        return Boolean(
          payload.postgres.host.trim() &&
          payload.postgres.username.trim() &&
          payload.postgres.database.trim() &&
          postgresCheck?.success &&
          postgresCheck.databaseEmpty,
        );
      case "redis":
        return Boolean(payload.redis.host.trim() && redisValidated);
      case "admin":
        return Boolean(
          payload.admin.name.trim().length >= 2 &&
          payload.admin.email.includes("@") &&
          payload.admin.password.length >= 8,
        );
      case "workspace":
        return Boolean(
          payload.workspace.name.trim().length >= 2 &&
          payload.workspace.slug.trim().length >= 2 &&
          payload.workspace.defaultTimezone.trim().length >= 1,
        );
      case "smtp":
        return isMailStepValid(payload.mail);
      case "review":
        return false;
      default:
        return false;
    }
  }, [currentStep?.key, payload, postgresCheck, redisValidated]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex((current) => current + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
    }
  };

  const handlePostgresValidate = async () => {
    setPostgresCheck(null);
    setRedisValidated(false);

    try {
      const result = await validatePostgresMutation.mutateAsync(
        payload.postgres,
      );
      setPostgresCheck(result);

      if (!result.databaseEmpty) {
        toast.error(
          "Database is not empty. Use manual migration for existing deployments.",
        );
        return;
      }

      toast.success("PostgreSQL connection verified.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "PostgreSQL validation failed.",
      );
    }
  };

  const handleRedisValidate = async () => {
    setRedisValidated(false);

    try {
      await validateRedisMutation.mutateAsync(payload.redis);
      setRedisValidated(true);
      toast.success("Redis connection verified.");
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Redis validation failed.",
      );
    }
  };

  const handleSmtpValidate = async () => {
    setSmtpCheck(null);

    try {
      await validateSmtpMutation.mutateAsync(payload.mail);
      setSmtpCheck({
        tone: "success",
        message: `SMTP connectivity verified for ${payload.mail.smtpHost}:${payload.mail.smtpPort}.`,
      });
      toast.success("SMTP connection verified.");
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "SMTP validation failed.";
      setSmtpCheck({
        tone: "error",
        message,
      });
      toast.error(message);
    }
  };

  const handleInstall = async () => {
    if (isStateDirectoryBlocked) {
      toast.error(
        stateDirectory?.error ??
          "The installer state directory is not writable. Configure NODERAX_STATE_DIR before continuing.",
      );
      return;
    }

    try {
      await installMutation.mutateAsync(payload);
      setStepIndex(steps.length);
      toast.success(
        "Setup completed. Runtime promotion is starting in the background.",
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Setup could not be completed.",
      );
    }
  };

  const handleCheckAgain = async () => {
    const result = await statusQuery.refetch();
    const status = result.data;

    if (status?.mode === "installed" || status?.mode === "legacy") {
      router.replace("/login");
      return;
    }

    toast.message("Runtime promotion is still in progress.");
  };

  const handleSaveSetupApiUrl = async (apiUrl = setupApiUrlInput.trim()) => {
    try {
      const result = await updateApiConfigMutation.mutateAsync({
        apiUrl,
      });

      setSetupApiUrlInput(result.apiUrl ?? "");
      toast.success(
        result.apiUrl
          ? "API URL saved. Rechecking installer status."
          : "API URL override cleared.",
      );
      await statusQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Unable to save API URL.",
      );
    }
  };

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,color-mix(in_oklch,var(--background)_94%,white),var(--background))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col justify-center">
        <div className="mb-6 flex items-center gap-3">
          <BrandBadge size="lg" priority />
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Noderax Installer
            </p>
            <p className="text-xs text-muted-foreground">
              Complete the self-hosted setup securely in one guided flow.
            </p>
          </div>
        </div>

        {statusQuery.isPending ? (
          <Card className="rounded-[28px] border-border/70 bg-background/90 shadow-xl">
            <CardContent className="flex min-h-72 items-center justify-center text-sm text-muted-foreground">
              Loading setup status...
            </CardContent>
          </Card>
        ) : statusQuery.isError ? (
          <Card className="rounded-[28px] border-border/70 bg-background/92 shadow-xl">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="tone-warning flex size-11 items-center justify-center rounded-2xl border shadow-sm">
                  <ServerCog className="size-5" />
                </div>
                <div>
                  <CardTitle>Unable to load setup status</CardTitle>
                  <CardDescription>{setupStatusErrorMessage}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <p className="text-sm font-medium">Setup API target</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current API URL:
                  <span className="ml-1 font-mono text-foreground">
                    {displayApiUrl ?? "Not configured"}
                  </span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Source: {displayApiUrlSourceLabel}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <SetupField
                  label="API base URL"
                  value={setupApiUrlInput}
                  onChange={setSetupApiUrlInput}
                  placeholder="https://api.example.com/api/v1"
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setSetupApiUrlInput("");
                      void handleSaveSetupApiUrl("");
                    }}
                    disabled={
                      updateApiConfigMutation.isPending ||
                      apiConfigQuery.data?.source !== "cookie"
                    }
                  >
                    Use app env
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSaveSetupApiUrl()}
                    disabled={updateApiConfigMutation.isPending}
                  >
                    {updateApiConfigMutation.isPending
                      ? "Saving..."
                      : "Save API URL"}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <ShimmerButton
                type="button"
                className="action-btn border-border/70 bg-(--control-surface) text-foreground shadow-none"
                background="var(--control-surface)"
                onClick={() => void statusQuery.refetch()}
              >
                <RefreshCcw
                  className={cn(
                    "size-4",
                    statusQuery.isFetching
                      ? "animate-spin"
                      : "action-icon-spin",
                  )}
                />
                Try again
              </ShimmerButton>
            </CardFooter>
          </Card>
        ) : isPromotionView ? (
          <Card className="rounded-[28px] border-border/70 bg-background/92 shadow-xl">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="tone-warning flex size-11 items-center justify-center rounded-2xl border shadow-sm">
                  <RefreshCcw className="size-5" />
                </div>
                <div>
                  <CardTitle>Promoting runtime</CardTitle>
                  <CardDescription>
                    The setup stack has completed provisioning. Noderax is
                    switching to the high-availability runtime now.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <InstallerFact
                  title="PostgreSQL"
                  description={`${payload.postgres.host}:${payload.postgres.port} / ${payload.postgres.database}`}
                />
                <InstallerFact
                  title="Redis"
                  description={`${payload.redis.host}:${payload.redis.port} / db ${payload.redis.db}`}
                />
                <InstallerFact
                  title="Workspace"
                  description={`${payload.workspace.name} (${payload.workspace.defaultTimezone})`}
                />
                <InstallerFact
                  title="Mail"
                  description={
                    payload.mail.smtpHost.trim()
                      ? `${payload.mail.smtpHost}:${payload.mail.smtpPort}`
                      : "Email delivery disabled"
                  }
                />
              </div>
              <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                Keep this page open while the setup stack is replaced by the
                runtime stack. Once both API instances are ready, this screen
                will redirect to
                <span className="px-1 font-medium text-foreground">/login</span>
                automatically.
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <ShimmerButton
                type="button"
                className="action-btn border-border/70 bg-(--control-surface) text-foreground shadow-none"
                background="var(--control-surface)"
                onClick={() => void statusQuery.refetch()}
              >
                <RefreshCcw
                  className={cn(
                    "size-4",
                    statusQuery.isFetching
                      ? "animate-spin"
                      : "action-icon-spin",
                  )}
                />
                Refresh status
              </ShimmerButton>
              <Button type="button" onClick={() => void handleCheckAgain()}>
                Check again
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="rounded-[28px] border-border/70 bg-background/92 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.45)]">
            <CardHeader className="border-b border-border/70 bg-muted/20">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      One-time setup
                    </p>
                    <CardTitle className="text-xl">
                      Control plane setup
                    </CardTitle>
                    <CardDescription className="max-w-3xl">
                      PostgreSQL, Redis, the first platform admin account, the
                      first workspace, and optional SMTP delivery settings are
                      provisioned in one flow. JWT and enrollment secrets are
                      generated securely by the system.
                    </CardDescription>
                  </div>
                  <div className="flex min-w-[16rem] flex-col gap-3">
                    <div className="rounded-2xl border bg-background/70 px-4 py-3 text-sm">
                      <p className="font-medium">Setup mode</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatSetupMode(setupStatus)}
                      </p>
                    </div>
                    {runtimePresetQuery.data?.mode === "local_bundle" ? (
                      <div className="rounded-2xl border bg-background/70 px-4 py-3 text-sm">
                        <p className="font-medium">Runtime preset</p>
                        <p className="mt-1 text-muted-foreground">
                          Local bundle detected. Database and Redis defaults
                          are prefilled for this host.
                        </p>
                      </div>
                    ) : null}
                    <div className="rounded-2xl border bg-background/70 px-4 py-3 text-sm">
                      <p className="font-medium">API target</p>
                      <p className="mt-1 truncate font-mono text-xs text-foreground">
                        {displayApiUrl ?? "Not configured"}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {apiConfigQuery.data?.source === "cookie"
                          ? "Using setup screen override"
                          : runtimePresetApiUrl
                            ? "Showing installer public origin"
                            : apiConfigQuery.data?.source === "env"
                              ? "Using web app environment"
                              : "No API URL configured"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <Progress value={completionValue} />
                  {setupStatus?.mode === "setup" && stateDirectory ? (
                    <StateDirectoryNotice
                      path={stateDirectory.path}
                      configuredValue={stateDirectory.configuredValue}
                      usingCustomPath={stateDirectory.usingCustomPath}
                      writable={stateDirectory.writable}
                      error={stateDirectory.error}
                    />
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
                    {steps.map((step, index) => (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => {
                          if (index <= stepIndex) {
                            setStepIndex(index);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition-colors",
                          index === stepIndex
                            ? "tone-brand shadow-sm"
                            : index < stepIndex
                              ? "border-border bg-background text-foreground"
                              : "border-border/70 bg-background/60 text-muted-foreground",
                        )}
                      >
                        <step.icon className="size-4 shrink-0" />
                        <span className="truncate">{step.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="min-h-[29rem]">
              {currentStep?.key === "welcome" ? (
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="rounded-[24px] border bg-muted/20 p-5">
                      <h2 className="text-lg font-semibold tracking-tight">
                        What will happen?
                      </h2>
                      <div className="mt-4 grid gap-3">
                        <InstallerChecklist text="PostgreSQL connectivity is tested and an empty database is required." />
                        <InstallerChecklist text="Redis connectivity is verified." />
                        <InstallerChecklist text="All core tables are created automatically." />
                        <InstallerChecklist text="The first platform admin and workspace are seeded." />
                        <InstallerChecklist text="Optional SMTP settings can be verified before install and edited later from platform settings." />
                        <InstallerChecklist text="Runtime configuration and secrets are written locally, then the setup stack promotes to the HA runtime." />
                      </div>
                    </div>
                    {stateDirectory ? (
                      <div className="rounded-[24px] border bg-background/70 p-5">
                        <p className="text-sm font-medium">
                          Installer state storage
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground">
                          Resolved path:
                          <span className="ml-1 font-mono text-foreground">
                            {stateDirectory.path}
                          </span>
                        </p>
                        {stateDirectory.configuredValue ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Configured value:
                            <span className="ml-1 font-mono text-foreground">
                              {stateDirectory.configuredValue}
                            </span>
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-muted-foreground">
                          Source:{" "}
                          {stateDirectory.usingCustomPath
                            ? "Configured by NODERAX_STATE_DIR"
                            : "Default application path"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-[24px] border bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)] p-5">
                    <p className="text-sm font-medium">Security note</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      This screen is only available during first-time setup.
                      Once installation is complete, the installer is locked and
                      requires a manual server-side reset to reopen.
                    </p>
                    <div className="mt-4 rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                      The initial admin password is only used during this flow.
                      Only its bcrypt hash is stored in the database.
                    </div>
                  </div>
                </div>
              ) : null}

              {currentStep?.key === "postgres" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <SetupField
                    label="Host"
                    value={payload.postgres.host}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        postgres: { ...current.postgres, host: value },
                      }))
                    }
                    placeholder="127.0.0.1"
                  />
                  <SetupField
                    label="Port"
                    value={String(payload.postgres.port)}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        postgres: {
                          ...current.postgres,
                          port: Number(value || 5432),
                        },
                      }))
                    }
                    placeholder="5432"
                    inputMode="numeric"
                  />
                  <SetupField
                    label="Username"
                    value={payload.postgres.username}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        postgres: { ...current.postgres, username: value },
                      }))
                    }
                    placeholder="postgres"
                  />
                  <SetupField
                    label="Password"
                    value={payload.postgres.password}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        postgres: { ...current.postgres, password: value },
                      }))
                    }
                    placeholder="postgres"
                    type="password"
                  />
                  <SetupField
                    label="Database"
                    value={payload.postgres.database}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        postgres: { ...current.postgres, database: value },
                      }))
                    }
                    placeholder="noderax"
                  />
                  <div className="rounded-2xl border bg-muted/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Use SSL</p>
                        <p className="text-sm text-muted-foreground">
                          Enable this for managed PostgreSQL services.
                        </p>
                      </div>
                      <Switch
                        checked={payload.postgres.ssl}
                        onCheckedChange={(checked) =>
                          setPayload((current) => ({
                            ...current,
                            postgres: { ...current.postgres, ssl: checked },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2 flex items-center justify-between gap-3 rounded-2xl border bg-background/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">Connection test</p>
                      <p className="text-sm text-muted-foreground">
                        Verify database access and confirm the database is empty
                        before continuing.
                      </p>
                      {postgresCheck ? (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {postgresCheck.serverVersion}
                          {postgresCheck.databaseEmpty
                            ? " · Database is empty"
                            : " · Database is not empty"}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handlePostgresValidate()}
                      disabled={validatePostgresMutation.isPending}
                    >
                      {validatePostgresMutation.isPending
                        ? "Testing..."
                        : "Test PostgreSQL"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {currentStep?.key === "redis" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <SetupField
                    label="Host"
                    value={payload.redis.host}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        redis: { ...current.redis, host: value },
                      }))
                    }
                    placeholder="127.0.0.1"
                  />
                  <SetupField
                    label="Port"
                    value={String(payload.redis.port)}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        redis: {
                          ...current.redis,
                          port: Number(value || 6379),
                        },
                      }))
                    }
                    placeholder="6379"
                    inputMode="numeric"
                  />
                  <SetupField
                    label="Password"
                    value={payload.redis.password ?? ""}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        redis: { ...current.redis, password: value },
                      }))
                    }
                    placeholder="Optional"
                    type="password"
                  />
                  <SetupField
                    label="DB index"
                    value={String(payload.redis.db)}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        redis: { ...current.redis, db: Number(value || 0) },
                      }))
                    }
                    placeholder="0"
                    inputMode="numeric"
                  />
                  <div className="lg:col-span-2 flex items-center justify-between gap-3 rounded-2xl border bg-background/70 px-4 py-3">
                    <div>
                      <p className="font-medium">Connection test</p>
                      <p className="text-sm text-muted-foreground">
                        Redis access is required for eventing and caching.
                      </p>
                      {redisValidated ? (
                        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                          Redis connection verified.
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      onClick={() => void handleRedisValidate()}
                      disabled={validateRedisMutation.isPending}
                    >
                      {validateRedisMutation.isPending
                        ? "Testing..."
                        : "Test Redis"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {currentStep?.key === "admin" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <SetupField
                    label="Full name"
                    value={payload.admin.name}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        admin: { ...current.admin, name: value },
                      }))
                    }
                    placeholder="Noderax Admin"
                  />
                  <SetupField
                    label="Email"
                    value={payload.admin.email}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        admin: { ...current.admin, email: value },
                      }))
                    }
                    placeholder="admin@example.com"
                    type="email"
                  />
                  <div className="lg:col-span-2">
                    <SetupField
                      label="Password"
                      value={payload.admin.password}
                      onChange={(value) =>
                        setPayload((current) => ({
                          ...current,
                          admin: { ...current.admin, password: value },
                        }))
                      }
                      placeholder="At least 8 characters"
                      type="password"
                    />
                  </div>
                </div>
              ) : null}

              {currentStep?.key === "workspace" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <SetupField
                    label="Workspace name"
                    value={payload.workspace.name}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        workspace: {
                          ...current.workspace,
                          name: value,
                          slug: workspaceSlugTouched
                            ? current.workspace.slug
                            : slugify(value),
                        },
                      }))
                    }
                    placeholder="Acme Operations"
                  />
                  <SetupField
                    label="Workspace slug"
                    value={payload.workspace.slug}
                    onChange={(value) => {
                      setWorkspaceSlugTouched(true);
                      setPayload((current) => ({
                        ...current,
                        workspace: {
                          ...current.workspace,
                          slug: slugify(value),
                        },
                      }));
                    }}
                    placeholder="acme-ops"
                  />
                  <div className="lg:col-span-2 space-y-2">
                    <Label>Workspace timezone</Label>
                    <TimezonePicker
                      value={payload.workspace.defaultTimezone}
                      onValueChange={(value) =>
                        setPayload((current) => ({
                          ...current,
                          workspace: {
                            ...current.workspace,
                            defaultTimezone: value,
                          },
                        }))
                      }
                    />
                    <p className="text-sm text-muted-foreground">
                      The initial admin user will also start with this timezone.
                    </p>
                  </div>
                </div>
              ) : null}

              {currentStep?.key === "smtp" ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2 rounded-[24px] border bg-muted/20 p-5">
                    <p className="text-sm font-medium">
                      Optional email delivery
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Leave the SMTP host blank to keep email delivery disabled
                      for now. Sender details and the public web app URL are
                      still stored so installer-managed deployments can refine
                      them later.
                    </p>
                  </div>
                  <SetupField
                    label="SMTP host"
                    value={payload.mail.smtpHost}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        mail: { ...current.mail, smtpHost: value },
                      }))
                    }
                    placeholder="smtp.resend.com"
                  />
                  <SetupField
                    label="SMTP port"
                    value={String(payload.mail.smtpPort)}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        mail: {
                          ...current.mail,
                          smtpPort: Number(value || 587),
                        },
                      }))
                    }
                    placeholder="587"
                    inputMode="numeric"
                  />
                  <SetupField
                    label="SMTP username"
                    value={payload.mail.smtpUsername}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        mail: { ...current.mail, smtpUsername: value },
                      }))
                    }
                    placeholder="resend"
                  />
                  <SetupField
                    label="SMTP password"
                    value={payload.mail.smtpPassword}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        mail: { ...current.mail, smtpPassword: value },
                      }))
                    }
                    placeholder="Optional"
                    type="password"
                  />
                  <SetupField
                    label="From email"
                    value={payload.mail.fromEmail}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        mail: { ...current.mail, fromEmail: value },
                      }))
                    }
                    placeholder="noreply@noderax.local"
                    type="email"
                  />
                  <SetupField
                    label="From name"
                    value={payload.mail.fromName}
                    onChange={(value) =>
                      setPayload((current) => ({
                        ...current,
                        mail: { ...current.mail, fromName: value },
                      }))
                    }
                    placeholder="Noderax"
                  />
                  <div className="lg:col-span-2">
                    <SetupField
                      label="Public web app URL"
                      value={payload.mail.webAppUrl}
                      onChange={(value) =>
                        setPayload((current) => ({
                          ...current,
                          mail: { ...current.mail, webAppUrl: value },
                        }))
                      }
                      placeholder="https://app.noderax.net"
                    />
                  </div>
                  <div className="lg:col-span-2 rounded-2xl border bg-muted/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">Use implicit TLS</p>
                        <p className="text-sm text-muted-foreground">
                          Enable this when your provider expects a secure SMTP
                          connection immediately, such as port 465.
                        </p>
                      </div>
                      <Switch
                        checked={payload.mail.smtpSecure}
                        onCheckedChange={(checked) =>
                          setPayload((current) => ({
                            ...current,
                            mail: { ...current.mail, smtpSecure: checked },
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2 flex items-center justify-between gap-3 rounded-2xl border bg-background/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">Connection test</p>
                      <p className="text-sm text-muted-foreground">
                        Optional. Verify SMTP connectivity without blocking
                        installation.
                      </p>
                      {smtpCheck ? (
                        <p
                          className={cn(
                            "mt-2 text-sm",
                            getSmtpStatusClassName(smtpCheck.tone),
                          )}
                        >
                          {smtpCheck.message}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleSmtpValidate()}
                      disabled={validateSmtpMutation.isPending}
                    >
                      {validateSmtpMutation.isPending
                        ? "Testing..."
                        : "Test SMTP"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {currentStep?.key === "review" ? (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <ReviewPanel
                      title="PostgreSQL"
                      rows={[
                        ["Host", payload.postgres.host],
                        ["Port", String(payload.postgres.port)],
                        ["Database", payload.postgres.database],
                        ["SSL", payload.postgres.ssl ? "Enabled" : "Disabled"],
                      ]}
                    />
                    <ReviewPanel
                      title="Redis"
                      rows={[
                        ["Host", payload.redis.host],
                        ["Port", String(payload.redis.port)],
                        ["DB", String(payload.redis.db)],
                        [
                          "Password",
                          payload.redis.password ? "Configured" : "Empty",
                        ],
                      ]}
                    />
                    <ReviewPanel
                      title="Admin + Workspace"
                      rows={[
                        [
                          "Admin",
                          `${payload.admin.name} <${payload.admin.email}>`,
                        ],
                        ["Workspace", payload.workspace.name],
                        ["Slug", payload.workspace.slug],
                        ["Timezone", payload.workspace.defaultTimezone],
                      ]}
                    />
                    <ReviewPanel
                      title="Email delivery"
                      rows={
                        payload.mail.smtpHost.trim()
                          ? [
                              ["Status", "Configured"],
                              ["Host", payload.mail.smtpHost],
                              ["Port", String(payload.mail.smtpPort)],
                              [
                                "Secure",
                                payload.mail.smtpSecure
                                  ? "Enabled"
                                  : "Disabled",
                              ],
                              [
                                "Credentials",
                                payload.mail.smtpUsername ||
                                payload.mail.smtpPassword
                                  ? "Configured"
                                  : "Not set",
                              ],
                              [
                                "Sender",
                                `${payload.mail.fromName} <${payload.mail.fromEmail}>`,
                              ],
                              ["Web app URL", payload.mail.webAppUrl],
                            ]
                          : [
                              ["Status", "Email delivery disabled"],
                              [
                                "Sender",
                                `${payload.mail.fromName} <${payload.mail.fromEmail}>`,
                              ],
                              ["Web app URL", payload.mail.webAppUrl],
                            ]
                      }
                    />
                    {stateDirectory ? (
                      <ReviewPanel
                        title="Installer state"
                        rows={[
                          ["Path", stateDirectory.path],
                          [
                            "Configured value",
                            stateDirectory.configuredValue ?? "Default",
                          ],
                          [
                            "Source",
                            stateDirectory.usingCustomPath
                              ? "NODERAX_STATE_DIR"
                              : "Default application path",
                          ],
                          ["Writable", stateDirectory.writable ? "Yes" : "No"],
                        ]}
                      />
                    ) : null}
                  </div>
                  <div className="rounded-[24px] border bg-muted/20 p-5">
                    <p className="text-sm font-medium">Install summary</p>
                    <div className="mt-4 grid gap-3">
                      <InstallerChecklist text="JWT secret will be generated automatically" />
                      <InstallerChecklist text="Agent enrollment secret will be generated automatically" />
                      <InstallerChecklist text="All core tables will be created through formal migrations only" />
                      <InstallerChecklist text="The install state file will be written only after migrations and seed complete successfully" />
                      <InstallerChecklist text="The setup stack will hand off to the HA runtime automatically" />
                    </div>
                  </div>
                </div>
              ) : null}
            </CardContent>

            <CardFooter className="justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {currentStep?.key === "review"
                  ? "After installation, Noderax promotes itself to the HA runtime automatically."
                  : "The installer is available only for fresh installations."}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleBack}
                  disabled={stepIndex === 0}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                {currentStep?.key === "review" ? (
                  <Button
                    type="button"
                    onClick={() => void handleInstall()}
                    disabled={
                      installMutation.isPending || isStateDirectoryBlocked
                    }
                  >
                    {installMutation.isPending
                      ? "Installing..."
                      : "Install Noderax"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!canMoveNext}
                  >
                    Continue
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
};

const formatSetupMode = (status?: SetupStatusResponse) => {
  if (!status) {
    return "Unknown";
  }

  const labels: Record<SetupMode, string> = {
    setup: "Setup pending",
    promoting: "Promoting runtime",
    installed: "Installed",
    legacy: "Legacy env mode",
  };

  return labels[status.mode];
};

const SetupField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      type={type as HTMLInputTypeAttribute}
      inputMode={inputMode}
    />
  </div>
);

const InstallerChecklist = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3 rounded-2xl border bg-background/70 px-4 py-3">
    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    <p className="text-sm leading-6 text-muted-foreground">{text}</p>
  </div>
);

const StateDirectoryNotice = ({
  path,
  configuredValue,
  usingCustomPath,
  writable,
  error,
}: {
  path: string;
  configuredValue: string | null;
  usingCustomPath: boolean;
  writable: boolean;
  error: string | null;
}) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-3 text-sm",
      writable
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-100"
        : "border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100",
    )}
  >
    <div className="flex items-start gap-3">
      <AlertTriangle
        className={cn(
          "mt-0.5 size-4 shrink-0",
          writable
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-amber-700 dark:text-amber-300",
        )}
      />
      <div className="min-w-0 space-y-1.5">
        <p className="font-medium">Installer state directory</p>
        <p className="text-current/90">
          Resolved install state path:
          <span className="ml-1 font-mono">{path}</span>
        </p>
        {configuredValue ? (
          <p className="text-current/80">
            Configured value:
            <span className="ml-1 font-mono">{configuredValue}</span>
          </p>
        ) : null}
        <p className="text-current/80">
          Source:{" "}
          {usingCustomPath
            ? "Configured by NODERAX_STATE_DIR"
            : "Using the default application path"}
        </p>
        <p className="text-current/80">
          {writable
            ? "This location is writable and ready for installation."
            : (error ??
              "This location is not writable. Configure NODERAX_STATE_DIR before continuing.")}
        </p>
      </div>
    </div>
  </div>
);

const InstallerFact = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="rounded-2xl border bg-background/70 px-4 py-3">
    <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {title}
    </p>
    <p className="mt-1 text-sm font-medium">{description}</p>
  </div>
);

const ReviewPanel = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) => (
  <div className="rounded-[24px] border bg-background/70 p-5">
    <p className="text-sm font-medium">{title}</p>
    <div className="mt-4 grid gap-3">
      {rows.map(([label, value]) => (
        <div
          key={`${title}:${label}`}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="text-right font-medium">{value}</span>
        </div>
      ))}
    </div>
  </div>
);
