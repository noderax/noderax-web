"use client";

import { ShieldAlert, Users } from "lucide-react";

import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { UserRowActions } from "@/components/users/user-row-actions";
import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { SectionPanel } from "@/components/ui/section-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useUsers } from "@/lib/hooks/use-noderax-data";

export const UsersPageView = () => {
  const authQuery = useAuthSession();
  const isAdmin = authQuery.session?.user.role === "platform_admin";
  const usersQuery = useUsers(isAdmin);

  return (
    <AppShell>
      {!authQuery.session && authQuery.isPending ? (
        <SectionPanel
          eyebrow="Platform"
          title="Users"
          description="Manage global operator accounts and platform access roles."
          contentClassName="space-y-3"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-[18px]" />
          ))}
        </SectionPanel>
      ) : !isAdmin ? (
        <EmptyState
          title="Admin access required"
          description="Only platform admins can manage global users from this panel."
          icon={ShieldAlert}
          variant="plain"
        />
      ) : usersQuery.isError ? (
        <EmptyState
          title="Users are unavailable"
          description="The user directory could not be loaded from the authenticated API connection."
          icon={Users}
          actionLabel="Retry"
          onAction={() => usersQuery.refetch()}
          variant="plain"
        />
      ) : (
        <SectionPanel
          eyebrow="Platform"
          title="Users"
          description="Manage operator accounts, lifecycle state, and platform roles."
          action={<CreateUserDialog />}
          contentClassName="p-0"
        >
          {usersQuery.isPending ? (
            <div className="space-y-3 px-5 py-4 sm:px-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-14 rounded-[18px]" />
              ))}
            </div>
          ) : usersQuery.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[72px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        {authQuery.session?.user.id === user.id ? (
                          <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full px-3 py-1 capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "secondary" : "destructive"}
                        className="rounded-full px-3 py-1"
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <TimeDisplay value={user.createdAt} mode="datetime" />
                    </TableCell>
                    <TableCell className="w-[72px]">
                      <div className="flex justify-end">
                        <UserRowActions
                          user={user}
                          isCurrentUser={authQuery.session?.user.id === user.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-5 py-4 sm:px-6">
              <EmptyState
                title="No users found"
                description="Create the first operator account for this workspace."
                icon={Users}
              />
            </div>
          )}
        </SectionPanel>
      )}
    </AppShell>
  );
};
