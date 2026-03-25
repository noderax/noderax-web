"use client";

import { useMemo, useState } from "react";
import { Clock3, Globe2, KeyRound, Palette, Shield, UserRound } from "lucide-react";

import { TaskFlowDiagnostics } from "@/components/diagnostics/task-flow-diagnostics";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TimeDisplay } from "@/components/ui/time-display";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useUpdateCurrentUserPreferences } from "@/lib/hooks/use-noderax-data";
import { DEFAULT_TIMEZONE, getBrowserTimeZone } from "@/lib/timezone";

export default function SettingsPage() {
  const { session } = useAuthSession();
  const updatePreferences = useUpdateCurrentUserPreferences();
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const [draftTimeZone, setDraftTimeZone] = useState<string | null>(null);

  const savedTimeZone = session?.user.timezone ?? DEFAULT_TIMEZONE;
  const selectedTimeZone = draftTimeZone ?? savedTimeZone;
  const hasTimeZoneChanges = selectedTimeZone !== savedTimeZone;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionPanel
            eyebrow="Workspace"
            title="Appearance and session"
            description="Local UI preferences, timezone presentation, and secure session metadata in one place."
            contentClassName="space-y-6"
          >
            <div className="flex items-start gap-3">
              <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
                <Palette className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Appearance</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Theme switching is instant and follows your system preference
                  by default.
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
                    Absolute timestamps across the workspace render in your saved
                    timezone.
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
                      Scheduled tasks you create will follow your saved timezone,
                      and all absolute timestamps will render in the same view.
                    </p>
                  </div>
                  <Button
                    type="button"
                    disabled={!hasTimeZoneChanges || updatePreferences.isPending}
                    onClick={() =>
                      updatePreferences.mutate(
                        {
                          timezone: selectedTimeZone,
                        },
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
                    Display-only session metadata surfaced from the secure auth
                    cookie.
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
                    UI-only settings for how critical activity is surfaced to
                    operators.
                  </p>
                </div>
              </div>
              <div className="surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-4">
                <div>
                  <p className="font-medium">Critical toast notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled by the realtime event bridge for critical alerts.
                  </p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-4">
                <div>
                  <p className="font-medium">Live query reconciliation</p>
                  <p className="text-sm text-muted-foreground">
                    Keeps React Query snapshots consistent after realtime
                    mutations.
                  </p>
                </div>
                <Switch checked disabled />
              </div>
            </div>
          </SectionPanel>
        </div>

        <TaskFlowDiagnostics />
      </div>
    </AppShell>
  );
}
