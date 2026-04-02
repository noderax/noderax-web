"use client";

import { useState } from "react";

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
import { useDeleteNode } from "@/lib/hooks/use-noderax-data";

export const DeleteNodeDialog = ({
  nodeId,
  nodeName,
  onDeleted,
  triggerLabel = "Delete",
  triggerVariant = "ghost",
  triggerSize = "sm",
}: {
  nodeId: string;
  nodeName: string;
  onDeleted?: () => void;
  triggerLabel?: string;
  triggerVariant?: "ghost" | "outline" | "destructive";
  triggerSize?: "sm" | "default";
}) => {
  const [open, setOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const deleteNodeMutation = useDeleteNode();

  const handleDelete = async () => {
    setSubmissionError(null);

    try {
      await deleteNodeMutation.mutateAsync(nodeId);
      setOpen(false);
      onDeleted?.();
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to delete this node right now.",
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
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className={
              triggerVariant === "destructive"
                ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          />
        }
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete node</DialogTitle>
          <DialogDescription>
            Remove{" "}
            <span className="font-medium text-foreground">{nodeName}</span> from
            the node inventory. This action cannot be undone from the web
            interface.
          </DialogDescription>
        </DialogHeader>

        {submissionError ? (
          <p className="text-sm text-tone-danger">{submissionError}</p>
        ) : null}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            className="border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
            type="button"
            onClick={handleDelete}
            disabled={deleteNodeMutation.isPending}
          >
            {deleteNodeMutation.isPending ? "Deleting..." : "Delete node"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
