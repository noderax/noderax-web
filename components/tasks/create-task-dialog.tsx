"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTask } from "@/lib/hooks/use-noderax-data";
import type { NodeSummary } from "@/lib/types";

const createTaskSchema = z.object({
  nodeId: z.string().min(1, "Select a node."),
  type: z.string().min(2, "Task type must be at least 2 characters."),
  payloadText: z.string().superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value);

      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payload must be a JSON object.",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payload must be valid JSON.",
      });
    }
  }),
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

const defaultValues: CreateTaskValues = {
  nodeId: "",
  type: "",
  payloadText: "{}",
};

export const CreateTaskDialog = ({ nodes }: { nodes: NodeSummary[] }) => {
  const [open, setOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const createTaskMutation = useCreateTask();
  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues,
  });
  const nodeIdValue = useWatch({
    control: form.control,
    name: "nodeId",
  });
  const selectedNode = nodes.find((node) => node.id === nodeIdValue);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmissionError(null);

    try {
      await createTaskMutation.mutateAsync({
        nodeId: values.nodeId,
        type: values.type.trim(),
        payload: JSON.parse(values.payloadText) as Record<string, unknown>,
      });
      form.reset(defaultValues);
      setOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to create the task right now.",
      );
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          form.reset(defaultValues);
          setSubmissionError(null);
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" disabled={!nodes.length} />}>
        <Plus className="size-4" />
        Create task
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Queue a task for an existing node using the backend task type and payload.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="task-node">Node</Label>
            <Select
              value={nodeIdValue}
              onValueChange={(value) =>
                form.setValue("nodeId", value ?? "", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="task-node" className="w-full">
                <SelectValue placeholder="Select a node">
                  {selectedNode
                    ? `${selectedNode.name} (${selectedNode.hostname})`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name} ({node.hostname})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.nodeId ? (
              <p className="text-sm text-tone-danger">
                {form.formState.errors.nodeId.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-type">Task type</Label>
            <Input
              id="task-type"
              placeholder="shell.exec"
              aria-invalid={Boolean(form.formState.errors.type)}
              {...form.register("type")}
            />
            {form.formState.errors.type ? (
              <p className="text-sm text-tone-danger">
                {form.formState.errors.type.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-payload">Payload JSON</Label>
            <Textarea
              id="task-payload"
              className="min-h-44 font-mono text-xs"
              aria-invalid={Boolean(form.formState.errors.payloadText)}
              {...form.register("payloadText")}
            />
            {form.formState.errors.payloadText ? (
              <p className="text-sm text-tone-danger">
                {form.formState.errors.payloadText.message}
              </p>
            ) : null}
          </div>

          {submissionError ? (
            <p className="text-sm text-tone-danger">{submissionError}</p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={createTaskMutation.isPending}>
              {createTaskMutation.isPending ? "Creating..." : "Queue task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
