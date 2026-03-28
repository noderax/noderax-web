"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert, UserPlus, Users } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import {
  useCreateWorkspaceMember,
  useDeleteWorkspaceMember,
  useUpdateWorkspaceMember,
  useWorkspaceAssignableUsers,
  useWorkspaceMembers,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { WorkspaceMembershipRole } from "@/lib/types";

const defaultFormState = {
  role: "member" as WorkspaceMembershipRole,
  search: "",
  userId: "",
};

export const MembersPageView = () => {
  const router = useRouter();
  const { workspace, isPlatformAdmin, isWorkspaceAdmin } = useWorkspaceContext();
  const membersQuery = useWorkspaceMembers(Boolean(workspace));
  const assignableUsersQuery = useWorkspaceAssignableUsers(
    Boolean(workspace) && isWorkspaceAdmin,
  );
  const createMemberMutation = useCreateWorkspaceMember();
  const updateMemberMutation = useUpdateWorkspaceMember();
  const deleteMemberMutation = useDeleteWorkspaceMember();
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState(defaultFormState);

  const filteredAssignableUsers = useMemo(() => {
    const search = formState.search.trim().toLowerCase();

    return (assignableUsersQuery.data ?? []).filter((user) => {
      if (!search) {
        return true;
      }

      return (
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    });
  }, [assignableUsersQuery.data, formState.search]);

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
                  Add user
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add existing user</DialogTitle>
                    <DialogDescription>
                      Select an active platform user and assign a workspace role.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    {assignableUsersQuery.isPending ? (
                      <div className="space-y-3">
                        <Skeleton className="h-10 rounded-xl" />
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton key={index} className="h-14 rounded-2xl" />
                        ))}
                      </div>
                    ) : assignableUsersQuery.isError ? (
                      <div className="space-y-3 rounded-[18px] border border-dashed px-4 py-4">
                        <p className="text-sm text-muted-foreground">
                          Eligible users could not be loaded right now.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => assignableUsersQuery.refetch()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (assignableUsersQuery.data?.length ?? 0) === 0 ? (
                      <div className="space-y-3 rounded-[18px] border border-dashed px-4 py-4">
                        <div className="flex items-start gap-3">
                          <UserPlus className="mt-0.5 size-4 text-muted-foreground" />
                          <div className="space-y-1">
                            <p className="font-medium">No assignable users yet</p>
                            <p className="text-sm text-muted-foreground">
                              {isPlatformAdmin
                                ? "Create a user in the Users screen first, then return here to add them to the workspace."
                                : "A platform admin must create the user first before you can add them to this workspace."}
                            </p>
                          </div>
                        </div>
                        {isPlatformAdmin ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setOpen(false);
                              router.push("/users");
                            }}
                          >
                            Open users
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="member-search">Search users</Label>
                          <Input
                            id="member-search"
                            value={formState.search}
                            onChange={(event) =>
                              setFormState((current) => ({
                                ...current,
                                search: event.target.value,
                              }))
                            }
                            placeholder="Search by name or email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Select user</Label>
                          <div className="max-h-64 space-y-2 overflow-y-auto rounded-[18px] border p-2">
                            {filteredAssignableUsers.length ? (
                              filteredAssignableUsers.map((user) => {
                                const isSelected = formState.userId === user.id;

                                return (
                                  <button
                                    key={user.id}
                                    type="button"
                                    className={`flex w-full items-start justify-between rounded-2xl border px-3 py-3 text-left transition-colors ${
                                      isSelected
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:bg-muted/60"
                                    }`}
                                    onClick={() =>
                                      setFormState((current) => ({
                                        ...current,
                                        userId: user.id,
                                      }))
                                    }
                                  >
                                    <div>
                                      <p className="font-medium">{user.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {user.email}
                                      </p>
                                    </div>
                                    {isSelected ? (
                                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                                        Selected
                                      </Badge>
                                    ) : null}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="px-2 py-6 text-sm text-muted-foreground">
                                No users matched the current search.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

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
                      disabled={
                        createMemberMutation.isPending ||
                        !formState.userId ||
                        assignableUsersQuery.isPending ||
                        (assignableUsersQuery.data?.length ?? 0) === 0
                      }
                      onClick={async () => {
                        await createMemberMutation.mutateAsync({
                          userId: formState.userId,
                          role: formState.role,
                        });
                        setOpen(false);
                      }}
                    >
                      {createMemberMutation.isPending ? "Adding..." : "Add to workspace"}
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
                  <TableHead>Status</TableHead>
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
                      <Badge
                        variant={membership.userIsActive === false ? "destructive" : "secondary"}
                        className="rounded-full px-3 py-1"
                      >
                        {membership.userIsActive === false ? "Inactive" : "Active"}
                      </Badge>
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
                description="Add the first existing user to this workspace."
              />
            </div>
          )}
        </SectionPanel>
      )}
    </AppShell>
  );
};
