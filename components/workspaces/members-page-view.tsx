"use client";

import { useState } from "react";
import { Plus, ShieldAlert, Users } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import {
  useCreateWorkspaceMember,
  useDeleteWorkspaceMember,
  useUpdateWorkspaceMember,
  useWorkspaceMembers,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { WorkspaceMembershipRole } from "@/lib/types";

const defaultFormState = {
  email: "",
  name: "",
  password: "",
  role: "member" as WorkspaceMembershipRole,
};

export const MembersPageView = () => {
  const { workspace, isWorkspaceAdmin } = useWorkspaceContext();
  const membersQuery = useWorkspaceMembers(Boolean(workspace));
  const createMemberMutation = useCreateWorkspaceMember();
  const updateMemberMutation = useUpdateWorkspaceMember();
  const deleteMemberMutation = useDeleteWorkspaceMember();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState(defaultFormState);

  return (
    <AppShell>
      {!workspace ? (
        <EmptyState
          icon={Users}
          title="Workspace loading"
          description="Select or load a workspace to manage its members."
        />
      ) : (
        <SectionPanel
          eyebrow="Workspace"
          title="Members"
          description={`Manage who can access ${workspace.name} and what role they hold inside this workspace.`}
          action={
            isWorkspaceAdmin ? (
              <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                  setOpen(nextOpen);
                  if (!nextOpen) {
                    setFormState(defaultFormState);
                  }
                }}
              >
                <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="size-4" />
                  Add member
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add member</DialogTitle>
                    <DialogDescription>
                      Reuse an existing global account by email or create a new one inline.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="member-email">Email</Label>
                      <Input
                        id="member-email"
                        value={formState.email}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            email: event.target.value,
                          }))
                        }
                        placeholder="ops@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-name">Name</Label>
                      <Input
                        id="member-name"
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Optional when the user already exists"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="member-password">Password</Label>
                      <Input
                        id="member-password"
                        type="password"
                        value={formState.password}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        placeholder="Required only for a new account"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={formState.role}
                        onValueChange={(value) =>
                          setFormState((current) => ({
                            ...current,
                            role: value as WorkspaceMembershipRole,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={createMemberMutation.isPending || !formState.email.trim()}
                      onClick={async () => {
                        await createMemberMutation.mutateAsync({
                          email: formState.email.trim(),
                          name: formState.name.trim() || undefined,
                          password: formState.password || undefined,
                          role: formState.role,
                        });
                        setOpen(false);
                      }}
                    >
                      {createMemberMutation.isPending ? "Adding..." : "Add member"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : undefined
          }
          contentClassName="p-0"
        >
          {membersQuery.isPending ? (
            <div className="space-y-3 px-5 py-4 sm:px-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-[18px]" />
              ))}
            </div>
          ) : !isWorkspaceAdmin ? (
            <div className="px-5 py-4 sm:px-6">
              <EmptyState
                icon={ShieldAlert}
                title="Admin access required"
                description="Only workspace owners and admins can manage members."
              />
            </div>
          ) : membersQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersQuery.data.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell className="font-medium">
                      {membership.userName ?? "Workspace member"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {membership.userEmail ?? "Unknown email"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={membership.role}
                        onValueChange={(value) =>
                          updateMemberMutation.mutate({
                            membershipId: membership.id,
                            payload: {
                              role: value as WorkspaceMembershipRole,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <TimeDisplay value={membership.createdAt} mode="datetime" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMemberMutation.mutate(membership.id)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4 sm:px-6">
              <EmptyState
                icon={Users}
                title="No members yet"
                description="Add the first teammate to this workspace."
              />
            </div>
          )}
        </SectionPanel>
      )}
    </AppShell>
  );
};
