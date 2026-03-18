"use client";

import { KeyRound, Palette, Shield, UserRound } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuthSession } from "@/lib/hooks/use-auth-session";

export default function SettingsPage() {
  const { session } = useAuthSession();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Manage appearance, inspect token metadata, and review your operator profile."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <Palette className="size-5" />
                </div>
                <div>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>
                    Dark mode is enabled by default, with instant client-side theme switching.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between rounded-3xl border border-border/70 bg-background/40 p-5">
              <div>
                <p className="font-medium">Theme mode</p>
                <p className="text-sm text-muted-foreground">
                  Toggle between the dark production surface and a lighter workspace.
                </p>
              </div>
              <ThemeToggle />
            </CardContent>
          </Card>

          <Card id="token-management" className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <CardTitle>Token management</CardTitle>
                  <CardDescription>
                    Display-only session metadata surfaced from the secure auth cookie.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-3xl border border-border/70 bg-background/40 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Token preview
                </p>
                <p className="mt-2 font-mono text-sm">{session?.tokenPreview ?? "Unavailable"}</p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Expires {session ? new Date(session.expiresAt).toLocaleString() : "unknown"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {session?.scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="rounded-full px-3 py-1">
                    {scope}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-300">
                  <UserRound className="size-5" />
                </div>
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Operator identity and role surfaced from the authenticated session.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card className="border-0 bg-card/70 shadow-dashboard">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                  <Shield className="size-5" />
                </div>
                <div>
                  <CardTitle>Notification preferences</CardTitle>
                  <CardDescription>
                    UI-only settings for how critical activity is surfaced to operators.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 px-4 py-4">
                <div>
                  <p className="font-medium">Critical toast notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Enabled by the realtime event bridge for critical alerts.
                  </p>
                </div>
                <Switch checked disabled />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/40 px-4 py-4">
                <div>
                  <p className="font-medium">Live query reconciliation</p>
                  <p className="text-sm text-muted-foreground">
                    Keeps React Query snapshots consistent after websocket mutations.
                  </p>
                </div>
                <Switch checked disabled />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
