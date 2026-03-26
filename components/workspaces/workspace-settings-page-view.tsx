"use client";

import { useState } from "react";
import { Clock3, Settings2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { useUpdateWorkspace } from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { WorkspaceDto } from "@/lib/types";

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
  onSave: (payload: {
    name: string;
    slug: string;
    defaultTimezone: string;
  }) => void;
}) => {
  const [name, setName] = useState(workspace.name);
  const [slug, setSlug] = useState(workspace.slug);
  const [timezone, setTimezone] = useState(workspace.defaultTimezone);

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

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={isSaving}
          onClick={() =>
            onSave({
              name,
              slug,
              defaultTimezone: timezone,
            })
          }
        >
          {isSaving ? "Saving..." : "Save workspace settings"}
        </Button>
      </div>
    </>
  );
};
