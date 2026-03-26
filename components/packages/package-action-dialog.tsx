"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  useInstallPackages,
  useRemovePackage,
} from "@/lib/hooks/use-noderax-data";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { PackageTaskMutationResponse } from "@/lib/types";

const resolveTaskId = (task: PackageTaskMutationResponse) => {
  if (
    "taskId" in task &&
    typeof task.taskId === "string" &&
    task.taskId.trim()
  ) {
    return task.taskId;
  }

  if ("id" in task && typeof task.id === "string" && task.id.trim()) {
    return task.id;
  }

  return null;
};

type PackageActionDialogProps = {
  mode: "install" | "remove";
  nodeId: string;
  nodeLabel?: string;
  packageName: string;
  packageVersion?: string;
  triggerLabel?: string;
  triggerVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive";
  triggerSize?: "default" | "sm";
  disabled?: boolean;
};

export const PackageActionDialog = ({
  mode,
  nodeId,
  nodeLabel,
  packageName,
  packageVersion,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "sm",
  disabled = false,
}: PackageActionDialogProps) => {
  const router = useRouter();
  const { buildWorkspaceHref } = useWorkspaceContext();
  const [open, setOpen] = useState(false);
  const [purge, setPurge] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const installPackagesMutation = useInstallPackages();
  const removePackageMutation = useRemovePackage();
  const isRemove = mode === "remove";
  const isPending =
    installPackagesMutation.isPending || removePackageMutation.isPending;
  const confirmLabel = isRemove ? "Queue removal task" : "Queue install task";
  const resolvedTriggerLabel =
    triggerLabel ?? (isRemove ? "Remove" : "Install");
  const resolvedNodeLabel = nodeLabel ?? "this node";

  const handleConfirm = async () => {
    setSubmissionError(null);

    try {
      const task = isRemove
        ? await removePackageMutation.mutateAsync({
            nodeId,
            name: packageName,
            purge,
          })
        : await installPackagesMutation.mutateAsync({
            nodeId,
            names: [packageName],
          });

      const taskId = resolveTaskId(task);
      if (!taskId) {
        throw new Error(
          "Task queued but response did not include a task identifier. Please open Tasks page to track progress.",
        );
      }

      setOpen(false);
      startTransition(() => {
        router.push(buildWorkspaceHref(`tasks/${taskId}`) ?? "/workspaces");
      });
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "The package action could not be queued right now.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          setSubmissionError(null);
          setPurge(false);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            disabled={disabled}
            type="button"
          />
        }
      >
        {resolvedTriggerLabel}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isRemove ? "Remove package" : "Install package"}
          </DialogTitle>
          <DialogDescription>
            {isRemove
              ? `Queue an asynchronous removal task for ${packageName} on ${resolvedNodeLabel}. After the task is queued, the task detail page will open so logs can be followed from the existing Tasks UI.`
              : `Queue an asynchronous install task for ${packageName} on ${resolvedNodeLabel}. After the task is queued, the task detail page will open so logs can be followed from the existing Tasks UI.`}
          </DialogDescription>
        </DialogHeader>

        <div className="surface-subtle rounded-[18px] border px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Package
          </p>
          <p className="mt-2 font-medium">{packageName}</p>
          {packageVersion ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {packageVersion}
            </p>
          ) : null}
        </div>

        {isRemove ? (
          <>
            <div className="surface-subtle flex items-center justify-between gap-4 rounded-[18px] border px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">Purge configuration files</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  When enabled, package configuration files will also be
                  removed.
                </p>
              </div>
              <Switch checked={purge} onCheckedChange={setPurge} />
            </div>

            {purge ? (
              <div className="tone-danger rounded-[18px] border px-4 py-3 text-sm leading-6">
                Purge mode removes the package and its configuration files from
                the selected node.
              </div>
            ) : null}
          </>
        ) : (
          <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm leading-6 text-muted-foreground">
            Installation is asynchronous. Package progress and logs will be
            tracked through the existing task detail screen.
          </div>
        )}

        {submissionError ? (
          <p className="text-sm text-tone-danger">{submissionError}</p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button
            variant={isRemove ? "destructive" : "default"}
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending
              ? isRemove
                ? "Queueing removal..."
                : "Queueing install..."
              : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
