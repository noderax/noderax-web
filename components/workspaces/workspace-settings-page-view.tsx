"use client";

import { useState } from "react";
import { Clock3, Mail, Send, Settings2, BellRing } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useUpdateWorkspace } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import { cn } from "@/lib/utils";
import type {
  EventSeverity,
  WorkspaceDto,
  UpdateWorkspacePayload,
} from "@/lib/types";

const NOTIFICATION_SEVERITY_OPTIONS = [
  "info",
  "warning",
  "critical",
] as EventSeverity[];

export const WorkspaceSettingsPageView = () => {
  const { workspace, isWorkspaceAdmin } = useWorkspaceContext();
  const updateWorkspaceMutation = useUpdateWorkspace();

  if (!workspace) {
    return (
      <AppShell>
        <EmptyState
          icon={Settings2}
          title="Workspace loading"
          description="Pick a workspace to manage its settings."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SectionPanel
        eyebrow="Workspace"
        title="Workspace Settings"
        description="Workspace timezone controls scheduled task execution. Personal timezone stays under your own settings."
      >
        {!isWorkspaceAdmin ? (
          <EmptyState
            icon={Settings2}
            title="Admin access required"
            description="Only workspace owners and admins can change workspace settings."
          />
        ) : (
          <WorkspaceSettingsEditor
            key={workspace.id}
            workspace={workspace}
            isSaving={updateWorkspaceMutation.isPending}
            onSave={(draft) => updateWorkspaceMutation.mutate(draft)}
          />
        )}
      </SectionPanel>
    </AppShell>
  );
};

const WorkspaceSettingsEditor = ({
  workspace,
  isSaving,
  onSave,
}: {
  workspace: WorkspaceDto;
  isSaving: boolean;
  onSave: (payload: UpdateWorkspacePayload) => void;
}) => {
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [timezone, setTimezone] = useState(workspace.defaultTimezone);
  const [automationEmailEnabled, setAutomationEmailEnabled] = useState(
    workspace.automationEmailEnabled,
  );
  const [automationTelegramEnabled, setAutomationTelegramEnabled] = useState(
    workspace.automationTelegramEnabled,
  );
  const [automationTelegramBotToken, setAutomationTelegramBotToken] = useState(
    workspace.automationTelegramBotToken ?? "",
  );
  const [automationTelegramChatId, setAutomationTelegramChatId] = useState(
    workspace.automationTelegramChatId ?? "",
  );
  const [automationEmailLevels, setAutomationEmailLevels] = useState<
    EventSeverity[]
  >(workspace.automationEmailLevels ?? ["critical"]);
  const [automationTelegramLevels, setAutomationTelegramLevels] = useState<
    EventSeverity[]
  >(workspace.automationTelegramLevels ?? ["critical"]);

  const toggleEmailLevel = (level: EventSeverity) => {
    setAutomationEmailLevels((current) =>
      current.includes(level)
        ? current.filter((value) => value !== level)
        : [...current, level],
    );
  };

  const toggleTelegramLevel = (level: EventSeverity) => {
    setAutomationTelegramLevels((current) =>
      current.includes(level)
        ? current.filter((value) => value !== level)
        : [...current, level],
    );
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-settings-name">Workspace name</Label>
            <Input
              id="workspace-settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="workspace-settings-slug">Workspace slug</Label>
            <Input
              id="workspace-settings-slug"
              value={slug}
              onChange={(event) =>
                setSlug(
                  event.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]+/g, "-")
                    .replace(/^-+|-+$/g, ""),
                )
              }
            />
          </div>
        </div>
        <div className="surface-subtle rounded-[22px] border p-5">
          <div className="flex items-start gap-3">
            <div className="tone-brand flex size-11 items-center justify-center rounded-full border">
              <Clock3 className="size-4.5" />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="font-medium">Execution timezone</p>
              <p className="text-sm text-muted-foreground">
                New scheduled tasks created in this workspace run in the workspace timezone.
              </p>
              <TimezonePicker value={timezone} onValueChange={setTimezone} />
            </div>
          </div>
        </div>
      </div>

      <div className="my-10">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <BellRing className="size-5 text-orange-500" />
          <h2>Workspace Automations</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure rule-based notifications for this workspace. These settings
          apply to all administrators of the workspace.
        </p>
        <Separator className="mt-4" />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Email Notifications */}
        <div className="surface-subtle flex flex-col justify-between rounded-[22px] border p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-blue-500/10 text-blue-500">
              <Mail className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Send operational event alerts to all workspace administrators
                via email.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm font-medium">
              {automationEmailEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={automationEmailEnabled}
              onCheckedChange={setAutomationEmailEnabled}
            />
          </div>
          {automationEmailEnabled && (
            <div className="animate-in fade-in slide-in-from-top-2 mt-4 space-y-3 rounded-xl border bg-background/50 p-4 duration-300">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Severities to notify
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {NOTIFICATION_SEVERITY_OPTIONS.map((level) => (
                    <Badge
                      key={level}
                      variant={
                        automationEmailLevels.includes(level)
                          ? "default"
                          : "outline"
                      }
                      className={cn(
                        "cursor-pointer rounded-full px-3 py-1 capitalize transition-all select-none",
                        automationEmailLevels.includes(level)
                          ? "tone-brand border-transparent shadow-sm"
                          : "hover:border-sidebar-border hover:bg-sidebar-accent",
                      )}
                      onClick={() => toggleEmailLevel(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Many built-in operational alerts are recorded as warning or
                  info. Leave only <b>critical</b> selected if you want a
                  quieter channel.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Telegram Notifications */}
        <div className="surface-subtle flex flex-col justify-between rounded-[22px] border p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-sky-500/10 text-sky-500">
              <Send className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Telegram Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get real-time updates directly in a Telegram chat or group.
              </p>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm font-medium">
              {automationTelegramEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={automationTelegramEnabled}
              onCheckedChange={setAutomationTelegramEnabled}
            />
          </div>
          {automationTelegramEnabled && (
            <div className="animate-in fade-in slide-in-from-top-2 mt-4 space-y-3 rounded-xl border bg-background/50 p-4 duration-300">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Severities to notify
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {NOTIFICATION_SEVERITY_OPTIONS.map((level) => (
                    <Badge
                      key={level}
                      variant={
                        automationTelegramLevels.includes(level)
                          ? "default"
                          : "outline"
                      }
                      className={cn(
                        "cursor-pointer rounded-full px-3 py-1 capitalize transition-all select-none",
                        automationTelegramLevels.includes(level)
                          ? "tone-brand border-transparent shadow-sm"
                          : "hover:border-sidebar-border hover:bg-sidebar-accent",
                      )}
                      onClick={() => toggleTelegramLevel(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {automationTelegramEnabled && (
        <div className="animate-in fade-in slide-in-from-top-2 mt-6 grid gap-6 rounded-[22px] border bg-card/50 p-6 duration-300 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telegram-bot-token">Telegram Bot Token</Label>
            <Input
              id="telegram-bot-token"
              placeholder="123456789:ABC..."
              value={automationTelegramBotToken}
              onChange={(e) => setAutomationTelegramBotToken(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Create a bot via <b>@BotFather</b> to get a token.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
            <Input
              id="telegram-chat-id"
              placeholder="-100..."
              value={automationTelegramChatId}
              onChange={(e) => setAutomationTelegramChatId(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Use <b>@userinfobot</b> or check your group ID.
            </p>
          </div>
        </div>
      )}

      <Separator className="my-8" />

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSave({
              name,
              slug,
              defaultTimezone: timezone,
              automationEmailEnabled,
              automationTelegramEnabled,
              automationTelegramBotToken: automationTelegramBotToken || undefined,
              automationTelegramChatId: automationTelegramChatId || undefined,
              automationEmailLevels,
              automationTelegramLevels,
            })
          }
        >
          {isSaving ? "Saving..." : "Save workspace settings"}
        </Button>
      </div>
    </>
  );
};
