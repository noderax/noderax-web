"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw, Plus, ShieldAlert, Waypoints } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionPanel } from "@/components/ui/section-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import {
  useCreateWorkspace,
  useUpdateWorkspaceRecord,
  useWorkspaces,
} from "@/lib/hooks/use-noderax-data";
import {
  buildWorkspacePath,
  isPlatformAdmin,
  isWorkspaceAdminRole,
} from "@/lib/workspace";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const defaultFormState = {
  name: "",
  slug: "",
  defaultTimezone: "UTC",
};

export const WorkspacesPageView = () => {
  const router = useRouter();
  const { session } = useAuthSession();
  const workspacesQuery = useWorkspaces(Boolean(session));
  const createWorkspaceMutation = useCreateWorkspace();
  const updateWorkspaceMutation = useUpdateWorkspaceRecord();
  const [createOpen, setCreateOpen] = useState(false);
  const [formState, setFormState] = useState(defaultFormState);

  const canCreateWorkspace = isPlatformAdmin(session?.user.role);
  const workspaces = workspacesQuery.data ?? [];
  const description = useMemo(
    () =>
      canCreateWorkspace
        ? "Create, archive, and switch between operational workspaces."
        : "Switch between workspaces you can access.",
    [canCreateWorkspace],
  );

  return (
    <AppShell>
      <SectionPanel
        eyebrow="Platform"
        title="Workspaces"
        description={description}
        action={
          canCreateWorkspace ? (
            <Dialog
              open={createOpen}
              onOpenChange={(open) => {
                setCreateOpen(open);
                if (!open) {
                  setFormState(defaultFormState);
                }
              }}
            >
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="size-4" />
                Create workspace
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create workspace</DialogTitle>
                  <DialogDescription>
                    Provision a new isolated operations surface with its own timezone and members.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspace-name">Name</Label>
                    <Input
                      id="workspace-name"
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Acme Operations"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="workspace-slug">Slug</Label>
                    <Input
                      id="workspace-slug"
                      value={formState.slug}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          slug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]+/g, "-")
                            .replace(/^-+|-+$/g, ""),
                        }))
                      }
                      placeholder="acme-ops"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Workspace timezone</Label>
                    <TimezonePicker
                      value={formState.defaultTimezone}
                      onValueChange={(value) =>
                        setFormState((current) => ({
                          ...current,
                          defaultTimezone: value,
                        }))
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      createWorkspaceMutation.isPending ||
                      formState.name.trim().length < 2 ||
                      formState.slug.trim().length < 2
                    }
                    onClick={async () => {
                      const workspace =
                        await createWorkspaceMutation.mutateAsync(formState);
                      setCreateOpen(false);
                      router.push(buildWorkspacePath(workspace.slug, "dashboard"));
                    }}
                  >
                    {createWorkspaceMutation.isPending
                      ? "Creating..."
                      : "Create workspace"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      >
        {workspacesQuery.isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-40 rounded-[22px]" />
            ))}
          </div>
        ) : workspacesQuery.isError ? (
          <EmptyState
            icon={Waypoints}
            title="Workspaces unavailable"
            description="The workspace list could not be loaded from the API."
            actionLabel="Retry"
            onAction={() => workspacesQuery.refetch()}
          />
        ) : !workspaces.length ? (
          <EmptyState
            icon={canCreateWorkspace ? Waypoints : ShieldAlert}
            title={canCreateWorkspace ? "No workspaces yet" : "No accessible workspace"}
            description={
              canCreateWorkspace
                ? "Create the first workspace to start isolating teams, nodes, tasks, and schedules."
                : "Ask a workspace owner or platform admin to add you to a workspace."
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workspaces.map((workspace) => (
              <article
                key={workspace.id}
                className="surface-subtle rounded-[22px] border p-5"
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        {workspace.currentUserRole ?? "workspace"}
                      </p>
                      {workspace.isDefault ? (
                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5">
                          Default
                        </Badge>
                      ) : null}
                      {workspace.isArchived ? (
                        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                          Archived
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {workspace.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      `{workspace.slug}` · {workspace.defaultTimezone}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workspace.isArchived
                      ? "Archived workspace. You can still inspect it if you have access."
                      : "Open the dashboard, members, teams, and workspace settings from one isolated surface."}
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={buildWorkspacePath(workspace.slug, "dashboard")}
                      className={cn(buttonVariants({ size: "default" }), "flex-1")}
                    >
                      Open workspace
                    </Link>
                    <Link
                      href={buildWorkspacePath(workspace.slug, "members")}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      Members
                    </Link>
                  </div>
                  {canCreateWorkspace || isWorkspaceAdminRole(workspace.currentUserRole) ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          updateWorkspaceMutation.isPending ||
                          (workspace.isArchived ? false : workspace.isDefault)
                        }
                        onClick={() =>
                          void updateWorkspaceMutation.mutateAsync({
                            workspaceId: workspace.id,
                            payload: {
                              isArchived: !workspace.isArchived,
                            },
                          })
                        }
                      >
                        {workspace.isArchived ? (
                          <>
                            <RotateCcw className="size-4" />
                            Restore
                          </>
                        ) : (
                          <>
                            <Archive className="size-4" />
                            Archive
                          </>
                        )}
                      </Button>
                      {!workspace.isArchived && workspace.isDefault ? (
                        <p className="text-xs text-muted-foreground">
                          Select another default workspace before archiving.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionPanel>
    </AppShell>
  );
};
