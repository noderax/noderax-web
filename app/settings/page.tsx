"use client";

import { KeyRound, Palette, Shield, UserRound } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TimeDisplay } from "@/components/ui/time-display";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

export default function SettingsPage() {
  const { session } = useAuthSession();

  return (
    <AppShell>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionPanel
          eyebrow="Workspace"
          title="Appearance and session"
          description="Local UI preferences and secure session metadata in one place."
          contentClassName="space-y-6"
        >
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-full border bg-muted/60 text-primary">
              <Palette className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Appearance</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Theme switching is instant and follows your system preference by default.
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

          <div id="token-management" className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border bg-muted/60 text-primary">
                <KeyRound className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Token management</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Display-only session metadata surfaced from the secure auth cookie.
                </p>
              </div>
            </div>
            <div className="surface-subtle rounded-[18px] border p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Token preview
              </p>
              <p className="mt-2 font-mono text-sm">{session?.tokenPreview ?? "Unavailable"}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                Expires{" "}
                <TimeDisplay value={session?.expiresAt} mode="datetime" emptyLabel="unknown" />
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {session?.scopes.map((scope) => (
                <Badge key={scope} variant="outline" className="rounded-full px-3 py-1">
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
            <div className="flex size-11 items-center justify-center rounded-full border bg-muted/60 text-primary">
              <UserRound className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium">Profile</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Operator identity and role surfaced from the authenticated session.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="mt-1 font-medium">{session?.user.name ?? "Operator"}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 font-medium">{session?.user.email ?? "operator@noderax.io"}</p>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="mt-1 font-medium">{session?.user.role ?? "Platform Operator"}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-11 items-center justify-center rounded-full border bg-muted/60 text-primary">
                <Shield className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Notification preferences</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  UI-only settings for how critical activity is surfaced to operators.
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
                  Keeps React Query snapshots consistent after realtime mutations.
                </p>
              </div>
              <Switch checked disabled />
            </div>
          </div>
        </SectionPanel>
      </div>
    </AppShell>
  );
}
