"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useFinalizeEnrollment } from "@/lib/hooks/use-noderax-data";

const verifyEnrollmentSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  token: z.string().trim().min(8, "Token must be at least 8 characters."),
});

const completeEnrollmentSchema = z.object({
  nodeName: z.string().trim().min(2, "Node name must be at least 2 characters."),
  description: z.string(),
});

type VerifyEnrollmentValues = z.infer<typeof verifyEnrollmentSchema>;
type CompleteEnrollmentValues = z.infer<typeof completeEnrollmentSchema>;

const verifyDefaultValues: VerifyEnrollmentValues = {
  email: "",
  token: "",
};

const completeDefaultValues: CompleteEnrollmentValues = {
  nodeName: "",
  description: "",
};

export const CreateNodeDialog = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"verify" | "details">("verify");
  const [completionError, setCompletionError] = useState<string | null>(null);
  const finalizeEnrollmentMutation = useFinalizeEnrollment();
  const verifyForm = useForm<VerifyEnrollmentValues>({
    resolver: zodResolver(verifyEnrollmentSchema),
    defaultValues: verifyDefaultValues,
  });
  const completeForm = useForm<CompleteEnrollmentValues>({
    resolver: zodResolver(completeEnrollmentSchema),
    defaultValues: completeDefaultValues,
  });

  const getVerificationSummary = () => {
    const values = verifyForm.getValues();

    return {
      email: values.email.trim(),
      token: values.token.trim(),
    };
  };
  const verificationSummary = getVerificationSummary();

  const resetDialog = () => {
    verifyForm.reset(verifyDefaultValues);
    completeForm.reset(completeDefaultValues);
    setStep("verify");
    setCompletionError(null);
  };

  const handleVerify = verifyForm.handleSubmit(async () => {
    setCompletionError(null);
    setStep("details");
  });

  const handleComplete = completeForm.handleSubmit(async (values) => {
    setCompletionError(null);

    try {
      const verificationSummary = getVerificationSummary();
      const enrollment = await finalizeEnrollmentMutation.mutateAsync({
        token: verificationSummary.token,
        payload: {
          email: verificationSummary.email,
          nodeName: values.nodeName.trim(),
          description: values.description.trim() || undefined,
        },
      });

      setOpen(false);
      resetDialog();
      router.push(`/nodes/${enrollment.nodeId}`);
    } catch (error) {
      setCompletionError(
        error instanceof Error
          ? error.message
          : "Node enrollment could not be completed right now.",
      );
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDialog();
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add node
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Node enrollment</DialogTitle>
          <DialogDescription>
            Enter the agent enrollment token and operator email, then finalize the
            node record from the next step.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-[18px] border bg-muted/30 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="tone-brand flex size-8 items-center justify-center rounded-full border">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Step 1
              </p>
              <p className="text-sm font-medium">Enter token and email</p>
            </div>
          </div>
          <div className="ml-auto h-px flex-1 bg-border/70" />
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={
                step === "details"
                  ? "tone-success flex size-8 items-center justify-center rounded-full border"
                  : "flex size-8 items-center justify-center rounded-full border text-muted-foreground"
              }
            >
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Step 2
              </p>
              <p className="text-sm font-medium">Finalize node enrollment</p>
            </div>
          </div>
        </div>

        {step === "verify" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enrollment-email">Operator email</Label>
              <Input
                id="enrollment-email"
                placeholder="admin@noderax.dev"
                aria-invalid={Boolean(verifyForm.formState.errors.email)}
                {...verifyForm.register("email")}
              />
              {verifyForm.formState.errors.email ? (
                <p className="text-sm text-tone-danger">
                  {verifyForm.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollment-token">Enrollment token</Label>
              <Input
                id="enrollment-token"
                placeholder="Paste the agent enrollment token"
                aria-invalid={Boolean(verifyForm.formState.errors.token)}
                {...verifyForm.register("token")}
              />
              {verifyForm.formState.errors.token ? (
                <p className="text-sm text-tone-danger">
                  {verifyForm.formState.errors.token.message}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancel
              </DialogClose>
              <Button type="button" onClick={() => void handleVerify()}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="surface-subtle rounded-[18px] border px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Enrollment request
              </p>
              <p className="mt-2 text-sm font-medium">{verificationSummary.email}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The final admin request will be sent when you save this node.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-display-name">Node name</Label>
              <Input
                id="node-display-name"
                placeholder="Production Node EU-1"
                aria-invalid={Boolean(completeForm.formState.errors.nodeName)}
                {...completeForm.register("nodeName")}
              />
              {completeForm.formState.errors.nodeName ? (
                <p className="text-sm text-tone-danger">
                  {completeForm.formState.errors.nodeName.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-description">Description</Label>
              <Textarea
                id="node-description"
                placeholder="Optional notes about where this node belongs or how it will be used."
                className="min-h-28"
                {...completeForm.register("description")}
              />
            </div>

            {completionError ? (
              <p className="text-sm text-tone-danger">{completionError}</p>
            ) : null}

            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setCompletionError(null);
                  setStep("verify");
                }}
                disabled={finalizeEnrollmentMutation.isPending}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button
                  type="button"
                  onClick={() => void handleComplete()}
                  disabled={finalizeEnrollmentMutation.isPending}
                >
                  {finalizeEnrollmentMutation.isPending
                    ? "Saving..."
                    : "Save node"}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
