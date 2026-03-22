"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { useCancelTask } from "@/lib/hooks/use-noderax-data";
import type { TaskStatus } from "@/lib/types";

type CancelTaskDialogProps = {
  taskId: string;
  taskStatus: TaskStatus;
  disabled?: boolean;
  triggerLabel?: string;
  triggerVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "destructive";
  triggerSize?: "default" | "sm";
  onRequested?: (status: TaskStatus) => void;
};

export const CancelTaskDialog = ({
  taskId,
  taskStatus,
  disabled = false,
  triggerLabel = "Stop",
  triggerVariant = "destructive",
  triggerSize = "sm",
  onRequested,
}: CancelTaskDialogProps) => {
  const router = useRouter();
  const cancelTaskMutation = useCancelTask();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const canCancel = taskStatus === "running" && !disabled;

  const handleConfirm = async () => {
    if (!canCancel || cancelTaskMutation.isPending) {
      return;
    }

    setSubmissionError(null);

    try {
      const response = await cancelTaskMutation.mutateAsync({
        taskId,
        payload: {
          reason: reason.trim() || undefined,
        },
      });

      setOpen(false);
      setReason("");
      onRequested?.(response.status);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        return;
      }

      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Failed to send stop request. Please try again.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setReason("");
          setSubmissionError(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            type="button"
            disabled={!canCancel}
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Do you want to stop this task?</DialogTitle>
          <DialogDescription>
            This request is sent to the agent for a safe shutdown. The task may
            not become cancelled immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-task-reason">
            Cancellation reason (optional)
          </Label>
          <Textarea
            id="cancel-task-reason"
            placeholder="Example: Planned maintenance window"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-24"
          />
        </div>

        {submissionError ? (
          <p className="text-sm text-tone-danger">{submissionError}</p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canCancel || cancelTaskMutation.isPending}
          >
            {cancelTaskMutation.isPending ? "Sending..." : "Stop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
