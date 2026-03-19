"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
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
import { useCreateNode } from "@/lib/hooks/use-noderax-data";

const createNodeSchema = z.object({
  name: z.string(),
  hostname: z.string().min(2, "Hostname must be at least 2 characters."),
  os: z.string().min(2, "Operating system is required."),
  arch: z.string().min(2, "Architecture is required."),
});

type CreateNodeValues = z.infer<typeof createNodeSchema>;

const defaultValues: CreateNodeValues = {
  name: "",
  hostname: "",
  os: "",
  arch: "",
};

export const CreateNodeDialog = () => {
  const [open, setOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const createNodeMutation = useCreateNode();
  const form = useForm<CreateNodeValues>({
    resolver: zodResolver(createNodeSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmissionError(null);

    try {
      await createNodeMutation.mutateAsync({
        name: values.name.trim() || undefined,
        hostname: values.hostname.trim(),
        os: values.os.trim(),
        arch: values.arch.trim(),
      });
      form.reset(defaultValues);
      setOpen(false);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "Unable to add the node right now.",
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
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add node
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add node</DialogTitle>
          <DialogDescription>
            Create a node record manually for the control plane inventory.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="node-name">Display name</Label>
              <Input
                id="node-name"
                placeholder="Production Node EU-1"
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
              <Label htmlFor="node-hostname">Hostname</Label>
              <Input
                id="node-hostname"
                placeholder="srv-01"
                aria-invalid={Boolean(form.formState.errors.hostname)}
                {...form.register("hostname")}
              />
              {form.formState.errors.hostname ? (
                <p className="text-sm text-tone-danger">
                  {form.formState.errors.hostname.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-os">Operating system</Label>
              <Input
                id="node-os"
                placeholder="ubuntu-24.04"
                aria-invalid={Boolean(form.formState.errors.os)}
                {...form.register("os")}
              />
              {form.formState.errors.os ? (
                <p className="text-sm text-tone-danger">
                  {form.formState.errors.os.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-arch">Architecture</Label>
              <Input
                id="node-arch"
                placeholder="amd64"
                aria-invalid={Boolean(form.formState.errors.arch)}
                {...form.register("arch")}
              />
              {form.formState.errors.arch ? (
                <p className="text-sm text-tone-danger">
                  {form.formState.errors.arch.message}
                </p>
              ) : null}
            </div>
          </div>

          {submissionError ? (
            <p className="text-sm text-tone-danger">{submissionError}</p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={createNodeMutation.isPending}>
              {createNodeMutation.isPending ? "Adding..." : "Add node"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
