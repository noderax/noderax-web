"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MoreVertical,
  PencilLine,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeleteUser, useUpdateUser } from "@/lib/hooks/use-noderax-data";
import type { UserDto, UserRole } from "@/lib/types";

const editUserSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  name: z.string().min(2, "Name must be at least 2 characters."),
  role: z.enum(["platform_admin", "user"]),
});

type EditUserValues = z.infer<typeof editUserSchema>;
type PendingAction = "activate" | "deactivate" | "delete";

const buildDefaultValues = (user: UserDto): EditUserValues => ({
  email: user.email,
  name: user.name,
  role: user.role,
});

export const UserRowActions = ({
  user,
  isCurrentUser,
}: {
  user: UserDto;
  isCurrentUser: boolean;
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: buildDefaultValues(user),
  });
  const roleValue = useWatch({
    control: form.control,
    name: "role",
  });

  useEffect(() => {
    form.reset(buildDefaultValues(user));
  }, [form, user]);

  const actionMeta = useMemo(() => {
    if (!pendingAction) {
      return null;
    }

    if (pendingAction === "delete") {
      return {
        title: "Delete user",
        description:
          "This permanently removes the account if it is not assigned to any workspace, team, or scheduled task.",
        confirmLabel: "Delete user",
        confirmVariant: "destructive" as const,
      };
    }

    return pendingAction === "activate"
      ? {
          title: "Activate user",
          description:
            "This account will be able to sign in again and become available for new workspace assignments.",
          confirmLabel: "Activate user",
          confirmVariant: "default" as const,
        }
      : {
          title: "Deactivate user",
          description:
            "This account will no longer be able to sign in and will be excluded from new workspace and team assignments.",
          confirmLabel: "Deactivate user",
          confirmVariant: "destructive" as const,
        };
  }, [pendingAction]);

  const onSubmit = form.handleSubmit(async (values) => {
    setEditError(null);

    try {
      await updateUserMutation.mutateAsync({
        userId: user.id,
        payload: {
          email: values.email.trim(),
          name: values.name.trim(),
          role: values.role,
        },
      });
      setEditOpen(false);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Unable to update the user right now.",
      );
    }
  });

  const handleActionConfirm = async () => {
    if (!pendingAction) {
      return;
    }

    setActionError(null);

    try {
      if (pendingAction === "delete") {
        await deleteUserMutation.mutateAsync(user.id);
      } else {
        await updateUserMutation.mutateAsync({
          userId: user.id,
          payload: {
            isActive: pendingAction === "activate",
          },
        });
      }

      setPendingAction(null);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to complete this action right now.",
      );
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-8 items-center justify-center rounded-xl border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreVertical className="size-4" />
          <span className="sr-only">User actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem
            className="gap-2"
            onClick={() => {
              setEditError(null);
              setEditOpen(true);
            }}
          >
            <PencilLine className="size-4" />
            <span>Edit user</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            disabled={isCurrentUser}
            onClick={() => {
              setActionError(null);
              setPendingAction(user.isActive ? "deactivate" : "activate");
            }}
          >
            {user.isActive ? (
              <ShieldX className="size-4" />
            ) : (
              <ShieldCheck className="size-4" />
            )}
            <span>{user.isActive ? "Deactivate user" : "Activate user"}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="gap-2 text-destructive"
            disabled={isCurrentUser}
            onClick={() => {
              setActionError(null);
              setPendingAction("delete");
            }}
          >
            <Trash2 className="size-4" />
            <span>Delete user</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditError(null);
            form.reset(buildDefaultValues(user));
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update the account profile and platform access role.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor={`edit-user-email-${user.id}`}>Work email</Label>
              <Input
                id={`edit-user-email-${user.id}`}
                type="email"
                aria-invalid={Boolean(form.formState.errors.email)}
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-tone-danger">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-user-name-${user.id}`}>Name</Label>
              <Input
                id={`edit-user-name-${user.id}`}
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-sm text-tone-danger">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-user-role-${user.id}`}>Role</Label>
              <Select
                value={roleValue}
                disabled={isCurrentUser}
                onValueChange={(value) =>
                  form.setValue("role", (value ?? "user") as UserRole, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id={`edit-user-role-${user.id}`} className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="platform_admin">Platform admin</SelectItem>
                </SelectContent>
              </Select>
              {isCurrentUser ? (
                <p className="text-sm text-muted-foreground">
                  Your own platform admin role cannot be downgraded here.
                </p>
              ) : null}
            </div>

            {editError ? (
              <p className="text-sm text-tone-danger">{editError}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateUserMutation.isPending}>
                {updateUserMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionMeta?.title ?? "User action"}</DialogTitle>
            <DialogDescription>
              {actionMeta?.description ?? "Confirm the requested user action."}
            </DialogDescription>
          </DialogHeader>

          <div className="surface-subtle rounded-[16px] border px-4 py-3">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          {actionError ? (
            <p className="text-sm text-tone-danger">{actionError}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={actionMeta?.confirmVariant ?? "default"}
              disabled={updateUserMutation.isPending || deleteUserMutation.isPending}
              onClick={() => void handleActionConfirm()}
            >
              {updateUserMutation.isPending || deleteUserMutation.isPending
                ? "Working..."
                : (actionMeta?.confirmLabel ?? "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
