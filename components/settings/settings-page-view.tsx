"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Globe2,
  KeyRound,
  Palette,
  Settings2,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";

import { TaskFlowDiagnostics } from "@/components/diagnostics/task-flow-diagnostics";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { AccountSecurityPanel } from "@/components/settings/account-security-panel";
import { PlatformIdentityPanel } from "@/components/settings/platform-identity-panel";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordFeedback } from "@/components/ui/password-feedback";
import { SectionPanel } from "@/components/ui/section-panel";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeDisplay } from "@/components/ui/time-display";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import {
  useChangeCurrentUserPassword,
  useDeleteWorkspace,
  usePlatformSettings,
  useUpdateCurrentUserPreferences,
  useUpdatePlatformSettings,
  useValidatePlatformSmtp,
  useUpdateWorkspace,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext, workspacesQueryKey } from "@/lib/hooks/use-workspace-context";
import { apiClient } from "@/lib/api";
import { DEFAULT_TIMEZONE, getBrowserTimeZone } from "@/lib/timezone";
import type {
  PlatformSettingsResponse,
  PlatformSettingsValues,
  WorkspaceDto,
} from "@/lib/types";
import {
  buildWorkspacePath,
  persistWorkspaceSlug,
  pickDefaultWorkspace,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import { toast } from "sonner";

type SettingsTab = "account" | "workspace" | "platform";
type SmtpTestState = {
  tone: "success" | "error";
  message: string;
};

const SETTINGS_TABS: SettingsTab[] = ["account", "workspace", "platform"];

const isSettingsTab = (value: string | null): value is SettingsTab =>
  SETTINGS_TABS.includes((value ?? "") as SettingsTab);

const extractPlatformSettingsValues = (
  settings: PlatformSettingsResponse,
): PlatformSettingsValues => ({
  app: { ...settings.app },
  database: { ...settings.database },
  redis: { ...settings.redis },
  auth: { ...settings.auth },
  mail: { ...settings.mail },
  agents: { ...settings.agents },
});

const clonePlatformSettingsValues = (
  settings: PlatformSettingsValues,
): PlatformSettingsValues => ({
  app: { ...settings.app },
  database: { ...settings.database },
  redis: { ...settings.redis },
  auth: { ...settings.auth },
  mail: { ...settings.mail },
  agents: { ...settings.agents },
});

const parseIntegerInput = (value: string, fallback: number) => {
  const nextValue = Number.parseInt(value, 10);
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const parseNumberInput = (value: string, fallback: number) => {
  const nextValue = Number.parseFloat(value);
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const getSmtpStatusClassName = (tone: SmtpTestState["tone"]) =>
  tone === "success"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-rose-600 dark:text-rose-400";

const pickNextWorkspaceAfterDeletion = (workspaces: WorkspaceDto[]) =>
  pickDefaultWorkspace(workspaces) ?? workspaces[0] ?? null;

function SettingsPageFallback() {
  return (
    <AppShell>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[22px] bg-muted"
          />
        ))}
      </div>
    </AppShell>
  );
}

function SettingsPageContent({
  initialTab = "account",
  canonicalPath,
}: {
  initialTab?: SettingsTab;
  canonicalPath?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session } = useAuthSession();
  const {
    workspace,
    isPlatformAdmin,
    isWorkspaceAdmin,
    workspaceSlug,
  } = useWorkspaceContext();
  const setActiveWorkspaceSlug = useAppStore(
    (state) => state.setActiveWorkspaceSlug,
  );
  const clearSession = useAppStore((state) => state.clearSession);

  const updatePreferences = useUpdateCurrentUserPreferences();
  const changePassword = useChangeCurrentUserPassword();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const platformSettingsQuery = usePlatformSettings(isPlatformAdmin);
  const updatePlatformSettings = useUpdatePlatformSettings();
  const validatePlatformSmtp = useValidatePlatformSmtp();

  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const availableTabs = useMemo<SettingsTab[]>(
    () =>
      isPlatformAdmin ? ["account", "workspace", "platform"] : ["account", "workspace"],
    [isPlatformAdmin],
  );

  const requestedTab = searchParams.get("tab");
  const resolvedTab = useMemo<SettingsTab>(() => {
    if (isSettingsTab(requestedTab) && availableTabs.includes(requestedTab)) {
      return requestedTab;
    }

    if (availableTabs.includes(initialTab)) {
      return initialTab;
    }

    return "account";
  }, [availableTabs, initialTab, requestedTab]);

  const [activeTab, setActiveTab] = useState<SettingsTab>(resolvedTab);
  const [draftTimeZone, setDraftTimeZone] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlugDraft, setWorkspaceSlugDraft] = useState("");
  const [workspaceTimeZone, setWorkspaceTimeZone] = useState(DEFAULT_TIMEZONE);
  const [workspaceDeleteOpen, setWorkspaceDeleteOpen] = useState(false);
  const [workspaceDeleteConfirmation, setWorkspaceDeleteConfirmation] =
    useState("");
  const [workspaceDeleteError, setWorkspaceDeleteError] = useState<string | null>(
    null,
  );
  const [notificationPreferences, setNotificationPreferences] = useState({
    criticalEventEmailsEnabled: session?.user.criticalEventEmailsEnabled ?? true,
    enrollmentEmailsEnabled: session?.user.enrollmentEmailsEnabled ?? true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [platformDraft, setPlatformDraft] =
    useState<PlatformSettingsValues | null>(null);
  const [platformMailTestStatus, setPlatformMailTestStatus] =
    useState<SmtpTestState | null>(null);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  useEffect(() => {
    if (!workspace) {
      setWorkspaceName("");
      setWorkspaceSlugDraft("");
      setWorkspaceTimeZone(DEFAULT_TIMEZONE);
      return;
    }

    setWorkspaceName(workspace.name);
    setWorkspaceSlugDraft(workspace.slug);
    setWorkspaceTimeZone(workspace.defaultTimezone);
  }, [workspace]);

  const platformBaseline = useMemo(
    () =>
      platformSettingsQuery.data
        ? extractPlatformSettingsValues(platformSettingsQuery.data)
        : null,
    [platformSettingsQuery.data],
  );

  useEffect(() => {
    if (!platformBaseline) {
      setPlatformDraft(null);
      return;
    }

    setPlatformDraft(clonePlatformSettingsValues(platformBaseline));
  }, [platformBaseline]);

  useEffect(() => {
    setPlatformMailTestStatus(null);
  }, [platformDraft?.mail]);

  useEffect(() => {
    setWorkspaceDeleteOpen(false);
    setWorkspaceDeleteConfirmation("");
    setWorkspaceDeleteError(null);
  }, [workspace?.id]);

  useEffect(() => {
    setNotificationPreferences({
      criticalEventEmailsEnabled:
        session?.user.criticalEventEmailsEnabled ?? true,
      enrollmentEmailsEnabled: session?.user.enrollmentEmailsEnabled ?? true,
    });
  }, [
    session?.user.criticalEventEmailsEnabled,
    session?.user.enrollmentEmailsEnabled,
  ]);

  const savedTimeZone = session?.user.timezone ?? DEFAULT_TIMEZONE;
  const selectedTimeZone = draftTimeZone ?? savedTimeZone;
  const hasTimeZoneChanges = selectedTimeZone !== savedTimeZone;
  const hasNotificationPreferenceChanges =
    notificationPreferences.criticalEventEmailsEnabled !==
      (session?.user.criticalEventEmailsEnabled ?? true) ||
    notificationPreferences.enrollmentEmailsEnabled !==
      (session?.user.enrollmentEmailsEnabled ?? true);
  const isNextPasswordLongEnough =
    passwordForm.nextPassword.length >= PASSWORD_MIN_LENGTH;
  const doNewPasswordsMatch =
    passwordForm.nextPassword === passwordForm.confirmPassword &&
    passwordForm.confirmPassword.length > 0;
  const canSubmitPasswordChange =
    Boolean(passwordForm.currentPassword) &&
    isNextPasswordLongEnough &&
    doNewPasswordsMatch &&
    !changePassword.isPending;

  const hasWorkspaceChanges = Boolean(
    workspace &&
      (workspaceName !== workspace.name ||
        workspaceSlugDraft !== workspace.slug ||
        workspaceTimeZone !== workspace.defaultTimezone),
  );

  const canManageDefaultWorkspace = isPlatformAdmin;
  const canSetWorkspaceAsDefault = Boolean(
    workspace &&
      canManageDefaultWorkspace &&
      !workspace.isDefault &&
      !workspace.isArchived,
  );
  const workspaceDeleteBlockedReason = !workspace
    ? "Workspace is still loading."
    : workspace.isArchived
      ? "Archived workspaces are read-only. Restore the workspace before deleting it."
    : workspace.isDefault
      ? "Default workspace cannot be deleted. Select another default workspace first."
      : null;
  const workspaceDeleteRequiresConfirmation =
    workspaceDeleteConfirmation.trim() === workspace?.slug;

  const hasPlatformChanges = Boolean(
    platformDraft &&
      platformBaseline &&
      JSON.stringify(platformDraft) !== JSON.stringify(platformBaseline),
  );

  const navigateToTab = (nextTab: SettingsTab) => {
    setActiveTab(nextTab);

    const targetPath = canonicalPath ?? pathname;
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "account") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    const nextHref = params.toString() ? `${targetPath}?${params.toString()}` : targetPath;
    router.replace(nextHref, { scroll: false });
  };

  const handleWorkspaceSave = () => {
    if (!workspace || workspace.isArchived) {
      return;
    }

    updateWorkspace.mutate(
      {
        name: workspaceName,
        slug: workspaceSlugDraft,
        defaultTimezone: workspaceTimeZone,
      },
      {
        onSuccess: (updatedWorkspace) => {
          setWorkspaceName(updatedWorkspace.name);
          setWorkspaceSlugDraft(updatedWorkspace.slug);
          setWorkspaceTimeZone(updatedWorkspace.defaultTimezone);

          if (workspaceSlug !== updatedWorkspace.slug) {
            setActiveWorkspaceSlug(updatedWorkspace.slug);
            persistWorkspaceSlug(updatedWorkspace.slug);
          }
        },
      },
    );
  };

  const handleSetDefaultWorkspace = () => {
    if (!workspace || !canSetWorkspaceAsDefault || workspace.isArchived) {
      return;
    }

    updateWorkspace.mutate({ isDefault: true });
  };

  const handleWorkspaceArchiveToggle = () => {
    if (!workspace) {
      return;
    }

    updateWorkspace.mutate({
      isArchived: !workspace.isArchived,
    });
  };

  const handleDeleteWorkspace = async () => {
    if (!workspace || workspaceDeleteBlockedReason || !workspaceDeleteRequiresConfirmation) {
      return;
    }

    setWorkspaceDeleteError(null);

    try {
      await deleteWorkspace.mutateAsync();

      const nextWorkspaces = await queryClient.fetchQuery({
        queryKey: workspacesQueryKey,
        queryFn: apiClient.getWorkspaces,
      });
      const nextWorkspace = pickNextWorkspaceAfterDeletion(nextWorkspaces);

      setWorkspaceDeleteOpen(false);
      setWorkspaceDeleteConfirmation("");

      if (nextWorkspace) {
        setActiveWorkspaceSlug(nextWorkspace.slug);
        persistWorkspaceSlug(nextWorkspace.slug);
        router.replace(buildWorkspacePath(nextWorkspace.slug, "dashboard"));
        return;
      }

      setActiveWorkspaceSlug(null);
      router.replace("/workspaces");
    } catch (error) {
      setWorkspaceDeleteError(
        error instanceof Error
          ? error.message
          : "Workspace could not be deleted right now.",
      );
    }
  };

  const handleSaveNotificationPreferences = () => {
    updatePreferences.mutate({
      criticalEventEmailsEnabled:
        notificationPreferences.criticalEventEmailsEnabled,
      enrollmentEmailsEnabled: notificationPreferences.enrollmentEmailsEnabled,
    });
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);

    if (!isNextPasswordLongEnough) {
      setPasswordError(
        `New password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
      );
      return;
    }

    if (!doNewPasswordsMatch) {
      setPasswordError("New password and confirmation must match.");
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.nextPassword,
      });
      await apiClient.logout();
      clearSession();
      queryClient.clear();
      toast.success("Password updated", {
        description: "Sign in again with your new password.",
      });
      router.replace("/login?message=password-updated");
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Password could not be changed right now.",
      );
    }
  };

  const updatePlatformField = (
    section: keyof PlatformSettingsValues,
    key: string,
    value: string | number | boolean,
  ) => {
    setPlatformDraft((current) =>
      current
        ? ({
            ...current,
            [section]: {
              ...current[section],
              [key]: value,
            },
          } as PlatformSettingsValues)
        : current,
    );
  };

  const handleValidatePlatformSmtp = async () => {
    if (!platformDraft) {
      return;
    }

    setPlatformMailTestStatus(null);

    try {
      await validatePlatformSmtp.mutateAsync(platformDraft.mail);
      setPlatformMailTestStatus({
        tone: "success",
        message: `SMTP connectivity verified for ${platformDraft.mail.smtpHost}:${platformDraft.mail.smtpPort}.`,
      });
      toast.success("SMTP connection verified.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SMTP validation failed.";
      setPlatformMailTestStatus({
        tone: "error",
        message,
      });
      toast.error(message);
    }
  };

  const platformEditable = platformSettingsQuery.data?.editable ?? false;

  return (
    <AppShell>
      <div className="space-y-6">
        <SectionPanel
          eyebrow="Settings"
          title="Operator and platform configuration"
          description="Manage your personal preferences, the active workspace, and admin-only platform runtime settings from one place."
          contentClassName="space-y-6"
        >
          <Tabs value={activeTab} onValueChange={(value) => navigateToTab(value as SettingsTab)}>
            <TabsList variant="line">
              <TabsTrigger value="account">
                <UserRound className="size-4" />
                My Settings
              </TabsTrigger>
              <TabsTrigger value="workspace">
                <Settings2 className="size-4" />
                Workspace Settings
              </TabsTrigger>
              {isPlatformAdmin ? (
                <TabsTrigger value="platform">
                  <Shield className="size-4" />
                  Platform Settings
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="account" className="pt-6">
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <SectionPanel
                  eyebrow="Account"
                  title="Appearance, session, and security"
                  description="Local UI preferences, timezone presentation, secure session metadata, and MFA controls in one place."
                  contentClassName="space-y-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                      <Palette className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">Appearance</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Theme switching is instant and follows your system
                        preference by default.
                      </p>
                    </div>
                  </div>
                  <div className="surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-4">
                    <div>
                      <p className="font-medium">Theme mode</p>
                      <p className="text-sm text-muted-foreground">
                        Toggle between light and dark manually at any time.
                      </p>
                    </div>
                    <ThemeToggle />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                        <Clock3 className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">Timezone preference</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Absolute timestamps across the workspace render in
                          your saved timezone.
                        </p>
                      </div>
                    </div>

                    <div className="surface-subtle space-y-4 rounded-[18px] border p-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Saved timezone</p>
                        <TimezonePicker
                          value={selectedTimeZone}
                          onValueChange={(value) =>
                            setDraftTimeZone(value === savedTimeZone ? null : value)
                          }
                          disabled={updatePreferences.isPending}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Saved: {savedTimeZone}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Browser: {browserTimeZone}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Globe2 className="mt-0.5 size-4 shrink-0" />
                          <p>
                            Scheduled tasks you create will follow your saved
                            timezone, and all absolute timestamps will render in
                            the same view.
                          </p>
                        </div>
                        <Button
                          type="button"
                          disabled={!hasTimeZoneChanges || updatePreferences.isPending}
                          onClick={() =>
                            updatePreferences.mutate(
                              { timezone: selectedTimeZone },
                              {
                                onSuccess: () => setDraftTimeZone(null),
                              },
                            )
                          }
                        >
                          {updatePreferences.isPending ? "Saving..." : "Save timezone"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div id="token-management" className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                        <KeyRound className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">Token management</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Display-only session metadata surfaced from the secure
                          auth cookie.
                        </p>
                      </div>
                    </div>
                    <div className="surface-subtle rounded-[18px] border p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Token preview
                      </p>
                      <p className="mt-2 font-mono text-sm">
                        {session?.tokenPreview ?? "Unavailable"}
                      </p>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Expires{" "}
                        <TimeDisplay
                          value={session?.expiresAt}
                          mode="datetime"
                          emptyLabel="unknown"
                        />
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {session?.scopes.map((scope) => (
                        <Badge
                          key={scope}
                          variant="outline"
                          className="rounded-full px-3 py-1"
                        >
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <AccountSecurityPanel
                    mfaEnabled={session?.user.mfaEnabled ?? false}
                    embedded
                  />
                </SectionPanel>

                <SectionPanel
                  eyebrow="Operator"
                  title="Profile and notifications"
                  description="Identity details and alert presentation preferences for the current operator."
                  contentClassName="space-y-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                      <UserRound className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium">Profile</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Operator identity and role surfaced from the authenticated
                        session.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="mt-1 font-medium">
                        {session?.user.name ?? "Operator"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="mt-1 font-medium">
                        {session?.user.email ?? "operator@noderax.io"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Role</p>
                      <p className="mt-1 font-medium">
                        {session?.user.role ?? "Platform Operator"}
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Timezone</p>
                      <p className="mt-1 font-medium">
                        {session?.user.timezone ?? DEFAULT_TIMEZONE}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                        <Shield className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">Notification preferences</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          UI-only settings for how critical activity is surfaced
                          to operators.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-[18px] border p-4">
                      <div className="surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-4">
                        <div>
                          <p className="font-medium">Critical event emails</p>
                          <p className="text-sm text-muted-foreground">
                            Send operational emails for critical workspace events.
                          </p>
                        </div>
                        <Switch
                          checked={notificationPreferences.criticalEventEmailsEnabled}
                          disabled={updatePreferences.isPending}
                          onCheckedChange={(checked) =>
                            setNotificationPreferences((current) => ({
                              ...current,
                              criticalEventEmailsEnabled: Boolean(checked),
                            }))
                          }
                        />
                      </div>
                      <div className="surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-4">
                        <div>
                          <p className="font-medium">Enrollment request emails</p>
                          <p className="text-sm text-muted-foreground">
                            Send approval emails when node enrollments need operator action.
                          </p>
                        </div>
                        <Switch
                          checked={notificationPreferences.enrollmentEmailsEnabled}
                          disabled={updatePreferences.isPending}
                          onCheckedChange={(checked) =>
                            setNotificationPreferences((current) => ({
                              ...current,
                              enrollmentEmailsEnabled: Boolean(checked),
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          disabled={
                            !hasNotificationPreferenceChanges ||
                            updatePreferences.isPending
                          }
                          onClick={handleSaveNotificationPreferences}
                        >
                          {updatePreferences.isPending ? "Saving..." : "Save preferences"}
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                          <KeyRound className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">Change password</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Updating your password invalidates the current session
                            version and signs this browser out.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 rounded-[18px] border p-4">
                        <div className="space-y-2">
                          <Label htmlFor="settings-current-password">Current password</Label>
                          <Input
                            id="settings-current-password"
                            type="password"
                            autoComplete="current-password"
                            value={passwordForm.currentPassword}
                            onChange={(event) =>
                              {
                                setPasswordForm((current) => ({
                                  ...current,
                                  currentPassword: event.target.value,
                                }));
                                setPasswordError(null);
                              }
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="settings-next-password">New password</Label>
                          <Input
                            id="settings-next-password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.nextPassword}
                            onChange={(event) =>
                              {
                                setPasswordForm((current) => ({
                                  ...current,
                                  nextPassword: event.target.value,
                                }));
                                setPasswordError(null);
                              }
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="settings-confirm-password">Confirm new password</Label>
                          <Input
                            id="settings-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={passwordForm.confirmPassword}
                            onChange={(event) =>
                              {
                                setPasswordForm((current) => ({
                                  ...current,
                                  confirmPassword: event.target.value,
                                }));
                                setPasswordError(null);
                              }
                            }
                          />
                        </div>
                        <PasswordFeedback
                          password={passwordForm.nextPassword}
                          confirmPassword={passwordForm.confirmPassword}
                        />
                        {passwordError ? (
                          <p className="text-sm text-tone-danger">{passwordError}</p>
                        ) : null}
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            disabled={!canSubmitPasswordChange}
                            onClick={() => void handlePasswordChange()}
                          >
                            {changePassword.isPending ? "Updating..." : "Update password"}
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                </SectionPanel>
              </div>
            </TabsContent>

            <TabsContent value="workspace" className="pt-6">
              {!workspace ? (
                <EmptyState
                  icon={Settings2}
                  title="Workspace loading"
                  description="Pick a workspace to manage its name, slug, and execution timezone."
                />
              ) : !isWorkspaceAdmin ? (
                <EmptyState
                  icon={Settings2}
                  title="Admin access required"
                  description="Only workspace owners and admins can change workspace settings."
                />
              ) : (
                <div className="mx-auto max-w-5xl space-y-6">
                  <div className="flex flex-col gap-4 rounded-[24px] border bg-card px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Workspace settings
                        </Badge>
                        {workspace.isDefault ? (
                          <Badge className="rounded-full px-3 py-1">
                            Default workspace
                          </Badge>
                        ) : null}
                        {workspace.isArchived ? (
                          <Badge variant="secondary" className="rounded-full px-3 py-1">
                            Archived
                          </Badge>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight">
                          {workspace.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Manage naming, routing, scheduling timezone, fallback
                          default behavior, and destructive workspace actions
                          from one place.
                        </p>
                      </div>
                    </div>
                    <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2 lg:min-w-[360px]">
                      <Button
                        type="button"
                        variant={workspace.isArchived ? "default" : "outline"}
                        className="w-full"
                        disabled={
                          updateWorkspace.isPending ||
                          (!workspace.isArchived && workspace.isDefault)
                        }
                        onClick={handleWorkspaceArchiveToggle}
                      >
                        {workspace.isArchived ? "Restore workspace" : "Archive workspace"}
                      </Button>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={
                          workspace.isArchived ||
                          !hasWorkspaceChanges ||
                          updateWorkspace.isPending
                        }
                        onClick={handleWorkspaceSave}
                      >
                        {updateWorkspace.isPending ? "Saving..." : "Save changes"}
                      </Button>
                    </div>
                  </div>

                  <SectionPanel
                    eyebrow="General"
                    title="Workspace profile"
                    description="These values shape the workspace URL, label, and human-facing identity across the control plane."
                    contentClassName="space-y-6"
                  >
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="workspace-settings-name">
                            Workspace name
                          </Label>
                          <Input
                            id="workspace-settings-name"
                            value={workspaceName}
                            disabled={workspace.isArchived}
                            onChange={(event) => setWorkspaceName(event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workspace-settings-slug">
                            Workspace slug
                          </Label>
                          <Input
                            id="workspace-settings-slug"
                            value={workspaceSlugDraft}
                            disabled={workspace.isArchived}
                            onChange={(event) =>
                              setWorkspaceSlugDraft(
                                event.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]+/g, "-")
                                  .replace(/^-+|-+$/g, ""),
                              )
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Used in workspace-scoped URLs and operator routing.
                          </p>
                        </div>
                      </div>

                      <div className="surface-subtle rounded-[20px] border p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Route preview
                        </p>
                        <p className="mt-2 font-mono text-sm">
                          {buildWorkspacePath(
                            workspaceSlugDraft || workspace.slug,
                            "dashboard",
                          )}
                        </p>
                        <Separator className="my-4" />
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>Current role: {workspace.currentUserRole ?? "member"}</p>
                          <p>
                            Archived: {workspace.isArchived ? "Yes" : "No"}
                          </p>
                          <p>
                            Created{" "}
                            <TimeDisplay
                              value={workspace.createdAt}
                              mode="datetime"
                              emptyLabel="unknown"
                            />
                          </p>
                        </div>
                      </div>
                    </div>
                  </SectionPanel>

                  <SectionPanel
                    eyebrow="Scheduling"
                    title="Execution timezone"
                    description="Workspace timezone controls when workspace-scoped scheduled tasks are evaluated and run."
                    contentClassName="space-y-4"
                  >
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Changing this value recalculates future runs for
                          schedules using the workspace timezone source.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            Current: {workspace.defaultTimezone}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1">
                            Draft: {workspaceTimeZone}
                          </Badge>
                        </div>
                      </div>
                      <TimezonePicker
                        value={workspaceTimeZone}
                        disabled={workspace.isArchived}
                        onValueChange={setWorkspaceTimeZone}
                      />
                    </div>
                  </SectionPanel>

                  <SectionPanel
                    eyebrow="Default Workspace"
                    title="Fallback workspace selection"
                    description="The default workspace is the control plane fallback when a user has no stored workspace selection or their prior workspace disappears."
                    action={
                      <Button
                        type="button"
                        variant={workspace.isDefault ? "outline" : "default"}
                        disabled={
                          workspace.isDefault ||
                          workspace.isArchived ||
                          !canManageDefaultWorkspace ||
                          updateWorkspace.isPending
                        }
                        onClick={handleSetDefaultWorkspace}
                      >
                        {workspace.isDefault ? "Current default" : "Set as default"}
                      </Button>
                    }
                    contentClassName="space-y-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Only one workspace can be default at a time. Selecting
                          this workspace here updates the platform-wide fallback
                          choice end to end.
                        </p>
                        {!canManageDefaultWorkspace ? (
                          <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                            Only platform admins can change which workspace is
                            marked as default.
                          </div>
                        ) : workspace.isDefault ? (
                          <div className="surface-subtle flex items-start gap-3 rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                            <p>
                              This workspace is currently the default fallback
                              workspace for the platform.
                            </p>
                          </div>
                        ) : workspace.isArchived ? (
                          <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                            Archived workspaces cannot become the platform
                            default until they are restored.
                          </div>
                        ) : (
                          <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                            Switching the default does not delete or archive the
                            current default workspace. It only changes the
                            fallback selection used by the UI and backend flows
                            that rely on the default workspace.
                          </div>
                        )}
                      </div>
                    </div>
                  </SectionPanel>

                  <div className="rounded-[24px] border border-tone-danger/30 bg-tone-danger/5">
                    <div className="border-b border-tone-danger/20 px-6 py-5">
                      <div className="flex items-start gap-3">
                        <div className="flex size-11 items-center justify-center rounded-full border border-tone-danger/30 bg-background">
                          <AlertTriangle className="size-4.5 text-tone-danger" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-tone-danger">
                            Danger zone
                          </p>
                          <h3 className="text-lg font-semibold tracking-tight">
                            Delete this workspace
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            This permanently removes the workspace and cascades
                            workspace-scoped records such as nodes, tasks,
                            events, metrics, teams, and memberships. If this is
                            the default workspace, deletion is disabled until a
                            different workspace is selected as default.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">
                          Permanent deletion
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Type <span className="font-mono">{workspace.slug}</span>{" "}
                          to confirm deletion. This action cannot be undone.
                        </p>
                        {workspaceDeleteBlockedReason ? (
                          <div className="rounded-[18px] border border-tone-danger/20 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                            {workspaceDeleteBlockedReason}
                          </div>
                        ) : null}
                      </div>

                      <Dialog
                        open={workspaceDeleteOpen}
                        onOpenChange={(open) => {
                          setWorkspaceDeleteOpen(open);
                          if (!open) {
                            setWorkspaceDeleteConfirmation("");
                            setWorkspaceDeleteError(null);
                          }
                        }}
                      >
                        <DialogTrigger
                          render={
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={Boolean(workspaceDeleteBlockedReason)}
                            />
                          }
                        >
                          <Trash2 className="size-4" />
                          Delete workspace
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete workspace</DialogTitle>
                            <DialogDescription>
                              This permanently deletes{" "}
                              <span className="font-medium text-foreground">
                                {workspace.name}
                              </span>
                              . Type the workspace slug to confirm.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            <div className="rounded-[18px] border border-tone-danger/20 bg-tone-danger/5 px-4 py-3 text-sm text-muted-foreground">
                              Nodes, tasks, events, metrics, memberships, and
                              teams scoped to this workspace will be removed.
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="workspace-delete-confirmation">
                                Confirm by typing <span className="font-mono">{workspace.slug}</span>
                              </Label>
                              <Input
                                id="workspace-delete-confirmation"
                                value={workspaceDeleteConfirmation}
                                onChange={(event) =>
                                  setWorkspaceDeleteConfirmation(event.target.value)
                                }
                                placeholder={workspace.slug}
                              />
                            </div>

                            {workspaceDeleteError ? (
                              <p className="text-sm text-tone-danger">
                                {workspaceDeleteError}
                              </p>
                            ) : null}
                          </div>

                          <DialogFooter>
                            <DialogClose render={<Button variant="outline" type="button" />}>
                              Cancel
                            </DialogClose>
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={
                                deleteWorkspace.isPending ||
                                !workspaceDeleteRequiresConfirmation
                              }
                              onClick={() => void handleDeleteWorkspace()}
                            >
                              {deleteWorkspace.isPending
                                ? "Deleting..."
                                : "Permanently delete workspace"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {isPlatformAdmin ? (
              <TabsContent value="platform" className="pt-6">
                {platformSettingsQuery.isPending && !platformDraft ? (
                  <EmptyState
                    icon={Shield}
                    title="Loading platform settings"
                    description="Fetching installer-managed runtime configuration for this deployment."
                  />
                ) : platformSettingsQuery.isError || !platformDraft ? (
                  <EmptyState
                    icon={Shield}
                    title="Platform settings unavailable"
                    description="The admin-only platform settings payload could not be loaded."
                  />
                ) : (
                  <div className="space-y-6">
                    <SectionPanel
                      eyebrow="Platform"
                      title="Platform runtime settings"
                      description="These values are persisted through installer state. Saving them updates the next boot configuration for the API container."
                      action={
                        <Button
                          type="button"
                          disabled={
                            !platformEditable ||
                            !hasPlatformChanges ||
                            updatePlatformSettings.isPending
                          }
                          onClick={() =>
                            platformDraft &&
                            updatePlatformSettings.mutate(platformDraft, {
                              onSuccess: (settings) =>
                                setPlatformDraft(
                                  clonePlatformSettingsValues(
                                    extractPlatformSettingsValues(settings),
                                  ),
                                ),
                            })
                          }
                        >
                          {updatePlatformSettings.isPending
                            ? "Saving..."
                            : "Save platform settings"}
                        </Button>
                      }
                      contentClassName="space-y-6"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Source: {platformSettingsQuery.data?.source ?? "unknown"}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          {platformEditable ? "Editable" : "Read-only"}
                        </Badge>
                        <Badge variant="outline" className="rounded-full px-3 py-1">
                          Restart required after save
                        </Badge>
                      </div>

                      {platformSettingsQuery.data?.message ? (
                        <div
                          className={cn(
                            "rounded-[18px] border px-4 py-3 text-sm",
                            platformEditable
                              ? "surface-subtle border-border/70 text-muted-foreground"
                              : "border-tone-warning/40 bg-tone-warning/10 text-muted-foreground",
                          )}
                        >
                          {platformSettingsQuery.data.message}
                        </div>
                      ) : null}

                      <div className="grid gap-6 xl:grid-cols-2">
                        <SectionPanel
                          title="Application"
                          description="Surface-level HTTP and documentation behavior."
                          eyebrow="App"
                          contentClassName="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="platform-cors-origin">CORS origin</Label>
                            <Input
                              id="platform-cors-origin"
                              value={platformDraft.app.corsOrigin}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "app",
                                  "corsOrigin",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-swagger-path">Swagger path</Label>
                            <Input
                              id="platform-swagger-path"
                              value={platformDraft.app.swaggerPath}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "app",
                                  "swaggerPath",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                            <div>
                              <p className="font-medium">Swagger enabled</p>
                              <p className="text-sm text-muted-foreground">
                                Exposes the OpenAPI UI for the API container.
                              </p>
                            </div>
                            <Switch
                              checked={platformDraft.app.swaggerEnabled}
                              disabled={!platformEditable}
                              onCheckedChange={(checked) =>
                                updatePlatformField("app", "swaggerEnabled", checked)
                              }
                            />
                          </div>
                        </SectionPanel>

                        <SectionPanel
                          title="Authentication"
                          description="JWT and password hashing behavior for operators."
                          eyebrow="Auth"
                          contentClassName="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="platform-jwt-secret">JWT secret</Label>
                            <Input
                              id="platform-jwt-secret"
                              type="password"
                              value={platformDraft.auth.jwtSecret}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "auth",
                                  "jwtSecret",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-jwt-expires-in">
                              JWT expires in
                            </Label>
                            <Input
                              id="platform-jwt-expires-in"
                              value={platformDraft.auth.jwtExpiresIn}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "auth",
                                  "jwtExpiresIn",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-bcrypt-rounds">
                              Bcrypt salt rounds
                            </Label>
                            <Input
                              id="platform-bcrypt-rounds"
                              type="number"
                              min={10}
                              value={String(platformDraft.auth.bcryptSaltRounds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "auth",
                                  "bcryptSaltRounds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.auth.bcryptSaltRounds,
                                  ),
                                )
                              }
                            />
                          </div>
                        </SectionPanel>

                        <SectionPanel
                          title="Mail"
                          description="Installer-managed SMTP settings for invitations, password resets, and operational email delivery."
                          eyebrow="SMTP"
                          contentClassName="space-y-4"
                        >
                          <div className="rounded-[18px] border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                            Leave the SMTP host blank to keep email delivery disabled.
                            Sender details and the public web app URL remain editable
                            either way.
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="platform-smtp-host">SMTP host</Label>
                              <Input
                                id="platform-smtp-host"
                                value={platformDraft.mail.smtpHost}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "smtpHost",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-smtp-port">SMTP port</Label>
                              <Input
                                id="platform-smtp-port"
                                type="number"
                                min={1}
                                value={String(platformDraft.mail.smtpPort)}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "smtpPort",
                                    parseIntegerInput(
                                      event.target.value,
                                      platformDraft.mail.smtpPort,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-smtp-username">
                                SMTP username
                              </Label>
                              <Input
                                id="platform-smtp-username"
                                value={platformDraft.mail.smtpUsername}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "smtpUsername",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-smtp-password">
                                SMTP password
                              </Label>
                              <Input
                                id="platform-smtp-password"
                                type="password"
                                value={platformDraft.mail.smtpPassword}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "smtpPassword",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-mail-from-email">
                                From email
                              </Label>
                              <Input
                                id="platform-mail-from-email"
                                type="email"
                                value={platformDraft.mail.fromEmail}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "fromEmail",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-mail-from-name">
                                From name
                              </Label>
                              <Input
                                id="platform-mail-from-name"
                                value={platformDraft.mail.fromName}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "fromName",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="platform-mail-web-app-url">
                                Public web app URL
                              </Label>
                              <Input
                                id="platform-mail-web-app-url"
                                value={platformDraft.mail.webAppUrl}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "mail",
                                    "webAppUrl",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                            <div>
                              <p className="font-medium">Use implicit TLS</p>
                              <p className="text-sm text-muted-foreground">
                                Enable this for providers that expect secure SMTP
                                from the initial connection, such as port 465.
                              </p>
                            </div>
                            <Switch
                              checked={platformDraft.mail.smtpSecure}
                              disabled={!platformEditable}
                              onCheckedChange={(checked) =>
                                updatePlatformField("mail", "smtpSecure", checked)
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-[16px] border bg-background/70 px-4 py-3">
                            <div className="min-w-0">
                              <p className="font-medium">Connection test</p>
                              <p className="text-sm text-muted-foreground">
                                Uses the current draft values without saving them
                                first.
                              </p>
                              {platformMailTestStatus ? (
                                <p
                                  className={cn(
                                    "mt-2 text-sm",
                                    getSmtpStatusClassName(
                                      platformMailTestStatus.tone,
                                    ),
                                  )}
                                >
                                  {platformMailTestStatus.message}
                                </p>
                              ) : null}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleValidatePlatformSmtp()}
                              disabled={validatePlatformSmtp.isPending}
                            >
                              {validatePlatformSmtp.isPending
                                ? "Testing..."
                                : "Test SMTP"}
                            </Button>
                          </div>
                        </SectionPanel>

                        <SectionPanel
                          title="Database"
                          description="Primary PostgreSQL connectivity for the API."
                          eyebrow="Postgres"
                          contentClassName="space-y-4"
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="platform-db-host">Host</Label>
                              <Input
                                id="platform-db-host"
                                value={platformDraft.database.host}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "database",
                                    "host",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-db-port">Port</Label>
                              <Input
                                id="platform-db-port"
                                type="number"
                                min={1}
                                value={String(platformDraft.database.port)}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "database",
                                    "port",
                                    parseIntegerInput(
                                      event.target.value,
                                      platformDraft.database.port,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-db-username">Username</Label>
                              <Input
                                id="platform-db-username"
                                value={platformDraft.database.username}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "database",
                                    "username",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-db-password">Password</Label>
                              <Input
                                id="platform-db-password"
                                type="password"
                                value={platformDraft.database.password}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "database",
                                    "password",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="platform-db-name">Database name</Label>
                              <Input
                                id="platform-db-name"
                                value={platformDraft.database.database}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "database",
                                    "database",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                              <div>
                                <p className="font-medium">Synchronize schema</p>
                                <p className="text-sm text-muted-foreground">
                                  Enable TypeORM schema synchronization on boot.
                                </p>
                              </div>
                              <Switch
                                checked={platformDraft.database.synchronize}
                                disabled={!platformEditable}
                                onCheckedChange={(checked) =>
                                  updatePlatformField(
                                    "database",
                                    "synchronize",
                                    checked,
                                  )
                                }
                              />
                            </div>
                            <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                              <div>
                                <p className="font-medium">Query logging</p>
                                <p className="text-sm text-muted-foreground">
                                  Prints SQL activity to API logs.
                                </p>
                              </div>
                              <Switch
                                checked={platformDraft.database.logging}
                                disabled={!platformEditable}
                                onCheckedChange={(checked) =>
                                  updatePlatformField("database", "logging", checked)
                                }
                              />
                            </div>
                            <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                              <div>
                                <p className="font-medium">SSL</p>
                                <p className="text-sm text-muted-foreground">
                                  Uses TLS for the PostgreSQL connection.
                                </p>
                              </div>
                              <Switch
                                checked={platformDraft.database.ssl}
                                disabled={!platformEditable}
                                onCheckedChange={(checked) =>
                                  updatePlatformField("database", "ssl", checked)
                                }
                              />
                            </div>
                          </div>
                        </SectionPanel>

                        <SectionPanel
                          title="Redis"
                          description="Pubsub, realtime fanout, and cache wiring."
                          eyebrow="Redis"
                          contentClassName="space-y-4"
                        >
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="platform-redis-url">Redis URL</Label>
                              <Input
                                id="platform-redis-url"
                                value={platformDraft.redis.url}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "redis",
                                    "url",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-redis-host">Host</Label>
                              <Input
                                id="platform-redis-host"
                                value={platformDraft.redis.host}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "redis",
                                    "host",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-redis-port">Port</Label>
                              <Input
                                id="platform-redis-port"
                                type="number"
                                min={0}
                                value={String(platformDraft.redis.port)}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "redis",
                                    "port",
                                    parseIntegerInput(
                                      event.target.value,
                                      platformDraft.redis.port,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-redis-password">Password</Label>
                              <Input
                                id="platform-redis-password"
                                type="password"
                                value={platformDraft.redis.password}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "redis",
                                    "password",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="platform-redis-db">DB index</Label>
                              <Input
                                id="platform-redis-db"
                                type="number"
                                min={0}
                                value={String(platformDraft.redis.db)}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "redis",
                                    "db",
                                    parseIntegerInput(
                                      event.target.value,
                                      platformDraft.redis.db,
                                    ),
                                  )
                                }
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label htmlFor="platform-redis-prefix">Key prefix</Label>
                              <Input
                                id="platform-redis-prefix"
                                value={platformDraft.redis.keyPrefix}
                                disabled={!platformEditable}
                                onChange={(event) =>
                                  updatePlatformField(
                                    "redis",
                                    "keyPrefix",
                                    event.target.value,
                                  )
                                }
                              />
                            </div>
                          </div>
                          <div className="grid gap-3">
                            <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                              <div>
                                <p className="font-medium">Redis enabled</p>
                                <p className="text-sm text-muted-foreground">
                                  Enables realtime pubsub and redis-backed state.
                                </p>
                              </div>
                              <Switch
                                checked={platformDraft.redis.enabled}
                                disabled={!platformEditable}
                                onCheckedChange={(checked) =>
                                  updatePlatformField("redis", "enabled", checked)
                                }
                              />
                            </div>
                          </div>
                        </SectionPanel>
                      </div>

                      <PlatformIdentityPanel />

                      <SectionPanel
                        eyebrow="Agents"
                        title="Agent orchestration"
                        description="Heartbeat, task-claim, and realtime delivery thresholds for nodes and agents."
                        contentClassName="space-y-4"
                      >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-heartbeat-timeout">
                              Heartbeat timeout seconds
                            </Label>
                            <Input
                              id="platform-agent-heartbeat-timeout"
                              type="number"
                              min={1}
                              value={String(platformDraft.agents.heartbeatTimeoutSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "heartbeatTimeoutSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.heartbeatTimeoutSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-offline-check">
                              Offline check interval
                            </Label>
                            <Input
                              id="platform-agent-offline-check"
                              type="number"
                              min={1}
                              value={String(platformDraft.agents.offlineCheckIntervalSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "offlineCheckIntervalSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.offlineCheckIntervalSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-claim-lease">
                              Task claim lease seconds
                            </Label>
                            <Input
                              id="platform-agent-claim-lease"
                              type="number"
                              min={15}
                              value={String(platformDraft.agents.taskClaimLeaseSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "taskClaimLeaseSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.taskClaimLeaseSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-realtime-timeout">
                              Realtime ping timeout
                            </Label>
                            <Input
                              id="platform-agent-realtime-timeout"
                              type="number"
                              min={15}
                              value={String(platformDraft.agents.realtimePingTimeoutSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "realtimePingTimeoutSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.realtimePingTimeoutSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-realtime-interval">
                              Realtime check interval
                            </Label>
                            <Input
                              id="platform-agent-realtime-interval"
                              type="number"
                              min={1}
                              value={String(
                                platformDraft.agents.realtimePingCheckIntervalSeconds,
                              )}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "realtimePingCheckIntervalSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.realtimePingCheckIntervalSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-high-cpu">
                              High CPU threshold
                            </Label>
                            <Input
                              id="platform-agent-high-cpu"
                              type="number"
                              min={0}
                              max={100}
                              step="0.1"
                              value={String(platformDraft.agents.highCpuThreshold)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "highCpuThreshold",
                                  parseNumberInput(
                                    event.target.value,
                                    platformDraft.agents.highCpuThreshold,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-stale-check">
                              Stale task check interval
                            </Label>
                            <Input
                              id="platform-agent-stale-check"
                              type="number"
                              min={1}
                              value={String(platformDraft.agents.staleTaskCheckIntervalSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "staleTaskCheckIntervalSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.staleTaskCheckIntervalSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-stale-queued">
                              Stale queued timeout
                            </Label>
                            <Input
                              id="platform-agent-stale-queued"
                              type="number"
                              min={5}
                              value={String(platformDraft.agents.staleQueuedTaskTimeoutSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "staleQueuedTaskTimeoutSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.staleQueuedTaskTimeoutSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="platform-agent-stale-running">
                              Stale running timeout
                            </Label>
                            <Input
                              id="platform-agent-stale-running"
                              type="number"
                              min={10}
                              value={String(platformDraft.agents.staleRunningTaskTimeoutSeconds)}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "staleRunningTaskTimeoutSeconds",
                                  parseIntegerInput(
                                    event.target.value,
                                    platformDraft.agents.staleRunningTaskTimeoutSeconds,
                                  ),
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2 xl:col-span-3">
                            <Label htmlFor="platform-agent-enrollment-token">
                              Agent enrollment token
                            </Label>
                            <Input
                              id="platform-agent-enrollment-token"
                              type="password"
                              value={platformDraft.agents.enrollmentToken}
                              disabled={!platformEditable}
                              onChange={(event) =>
                                updatePlatformField(
                                  "agents",
                                  "enrollmentToken",
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="surface-subtle flex items-center justify-between rounded-[16px] border px-4 py-3">
                          <div>
                            <p className="font-medium">Enable realtime task dispatch</p>
                            <p className="text-sm text-muted-foreground">
                              Pushes task delivery through realtime sockets instead
                              of HTTP polling only.
                            </p>
                          </div>
                          <Switch
                            checked={platformDraft.agents.enableRealtimeTaskDispatch}
                            disabled={!platformEditable}
                            onCheckedChange={(checked) =>
                              updatePlatformField(
                                "agents",
                                "enableRealtimeTaskDispatch",
                                checked,
                              )
                            }
                          />
                        </div>
                      </SectionPanel>
                    </SectionPanel>

                    <TaskFlowDiagnostics />
                  </div>
                )}
              </TabsContent>
            ) : null}
          </Tabs>
        </SectionPanel>
      </div>
    </AppShell>
  );
}

export function SettingsPageView(props: {
  initialTab?: SettingsTab;
  canonicalPath?: string;
}) {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent {...props} />
    </Suspense>
  );
}
