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
  triggerLabel = "Durdur",
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
          : "Durdurma isteği gönderilemedi, tekrar dene.",
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
          <DialogTitle>Taski durdurmak istiyor musun?</DialogTitle>
          <DialogDescription>
            Bu istek taski guvenli sekilde sonlandirmak icin agente iletilir.
            Task hemen cancelled olmayabilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="cancel-task-reason">Iptal sebebi (opsiyonel)</Label>
          <Textarea
            id="cancel-task-reason"
            placeholder="Orn: Acil bakim penceresi"
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
            Vazgec
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canCancel || cancelTaskMutation.isPending}
          >
            {cancelTaskMutation.isPending ? "Gonderiliyor..." : "Durdur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
