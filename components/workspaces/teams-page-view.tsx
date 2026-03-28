"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Plus, Users2 } from "lucide-react";

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
import {
  useAddWorkspaceTeamMember,
  useCreateWorkspaceTeam,
  useDeleteWorkspaceTeam,
  useDeleteWorkspaceTeamMember,
  useWorkspaceMembers,
  useWorkspaceTeamMembers,
  useWorkspaceTeams,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import { useAppStore } from "@/store/useAppStore";

export const TeamsPageView = () => {
  const { workspace, isWorkspaceAdmin } = useWorkspaceContext();
  const searchQuery = useAppStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const teamsQuery = useWorkspaceTeams(Boolean(workspace));
  const membersQuery = useWorkspaceMembers(Boolean(workspace));
  const createTeamMutation = useCreateWorkspaceTeam();
  const deleteTeamMutation = useDeleteWorkspaceTeam();
  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const canManageTeams = isWorkspaceAdmin && !workspace?.isArchived;
  const filteredTeams = useMemo(
    () =>
      (teamsQuery.data ?? []).filter((team) =>
        deferredSearchQuery
          ? [team.name, team.description ?? ""]
              .join(" ")
              .toLowerCase()
              .includes(deferredSearchQuery)
          : true,
      ),
    [deferredSearchQuery, teamsQuery.data],
  );

  return (
    <AppShell>
      <SectionPanel
        eyebrow="Workspace"
        title="Teams"
        description={
          workspace
            ? `Organize ${workspace.name} members into teams for ownership and collaboration.`
            : "Organize workspace members into teams."
        }
        action={
          canManageTeams ? (
            <Dialog
              open={open}
              onOpenChange={(nextOpen) => {
                setOpen(nextOpen);
                if (!nextOpen) {
                  setTeamName("");
                  setTeamDescription("");
                }
              }}
            >
              <DialogTrigger render={<Button size="sm" />}>
                <Plus className="size-4" />
                Create team
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create team</DialogTitle>
                  <DialogDescription>
                    Teams are workspace-local groupings for coordination.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team name</Label>
                    <Input
                      id="team-name"
                      value={teamName}
                      onChange={(event) => setTeamName(event.target.value)}
                      placeholder="Platform Ops"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-description">Description</Label>
                    <Input
                      id="team-description"
                      value={teamDescription}
                      onChange={(event) => setTeamDescription(event.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={createTeamMutation.isPending || teamName.trim().length < 2}
                    onClick={async () => {
                      await createTeamMutation.mutateAsync({
                        name: teamName.trim(),
                        description: teamDescription.trim() || undefined,
                      });
                      setOpen(false);
                    }}
                  >
                    {createTeamMutation.isPending ? "Creating..." : "Create team"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      >
        {teamsQuery.isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-[22px]" />
            ))}
          </div>
        ) : filteredTeams.length ? (
          <div className="space-y-4">
            {workspace?.isArchived ? (
              <div className="rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                Team structure stays visible while the workspace is archived, but
                add/remove mutations are disabled until restore.
              </div>
            ) : null}
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                teamId={team.id}
                name={team.name}
                description={team.description}
                canManage={canManageTeams}
                members={membersQuery.data ?? []}
                onDelete={() => deleteTeamMutation.mutate(team.id)}
              />
            ))}
          </div>
        ) : teamsQuery.data?.length ? (
          <EmptyState
            icon={Users2}
            title="No teams match the workspace search"
            description="Clear the search query or try a different team name."
          />
        ) : (
          <EmptyState
            icon={Users2}
            title="No teams yet"
            description="Create the first team to start grouping workspace members."
          />
        )}
      </SectionPanel>
    </AppShell>
  );
};

const TeamCard = ({
  teamId,
  name,
  description,
  members,
  canManage,
  onDelete,
}: {
  teamId: string;
  name: string;
  description: string | null;
  members: ReturnType<typeof useWorkspaceMembers>["data"];
  canManage: boolean;
  onDelete: () => void;
}) => {
  const teamMembersQuery = useWorkspaceTeamMembers(teamId, true);
  const addTeamMemberMutation = useAddWorkspaceTeamMember(teamId);
  const deleteTeamMemberMutation = useDeleteWorkspaceTeamMember(teamId);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const selectableMembers = useMemo(() => {
    const memberIds = new Set((teamMembersQuery.data ?? []).map((member) => member.userId));
    return (members ?? []).filter(
      (member) => !memberIds.has(member.userId) && member.userIsActive !== false,
    );
  }, [members, teamMembersQuery.data]);

  return (
    <article className="surface-subtle rounded-[22px] border p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {description || "No description provided."}
          </p>
        </div>

        {canManage ? (
          <Button variant="outline" size="sm" onClick={onDelete}>
            Delete team
          </Button>
        ) : null}
      </div>

      {canManage ? (
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <Select
            value={selectedUserId}
            onValueChange={(value) => setSelectedUserId(value ?? "")}
          >
            <SelectTrigger className="md:w-72">
              <SelectValue placeholder="Add a workspace member" />
            </SelectTrigger>
            <SelectContent>
              {selectableMembers.map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.userName ?? member.userEmail ?? member.userId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            disabled={!selectedUserId}
            onClick={async () => {
              await addTeamMemberMutation.mutateAsync({ userId: selectedUserId });
              setSelectedUserId("");
            }}
          >
            Add member
          </Button>
        </div>
      ) : null}

      {canManage && !selectableMembers.length ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No active workspace members are currently available to add.
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        {(teamMembersQuery.data ?? []).length ? (
          (teamMembersQuery.data ?? []).map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-2xl border px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">
                    {member.userName ?? member.userEmail ?? member.userId}
                  </p>
                  {member.userIsActive === false ? (
                    <Badge variant="destructive" className="rounded-full px-3 py-1">
                      Inactive
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {member.userEmail ?? "Workspace member"}
                </p>
              </div>
              {canManage ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteTeamMemberMutation.mutate(member.userId)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            This team does not have members yet.
          </p>
        )}
      </div>
    </article>
  );
};
