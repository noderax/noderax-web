"use client";

import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Plus, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import {
  useCreateNodeInstall,
  useNodeInstallStatus,
  useWorkspaceTeams,
} from "@/lib/hooks/use-noderax-data";
import type {
  CreateNodeInstallResponse,
  NodeInstallDto,
  NodeInstallStatus,
} from "@/lib/types";
import { toast } from "sonner";

const createNodeInstallSchema = z.object({
  nodeName: z
    .string()
    .trim()
    .min(2, "Node name must be at least 2 characters."),
  description: z.string(),
});

type CreateNodeInstallValues = z.infer<typeof createNodeInstallSchema>;

const createNodeInstallDefaultValues: CreateNodeInstallValues = {
  nodeName: "",
  description: "",
};

type CopyField = "command" | "api" | "script" | null;

export const CreateNodeDialog = () => {
  const [open, setOpen] = useState(false);
  const [teamId, setTeamId] = useState<"none" | string>("none");
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<CopyField>(null);
  const [installData, setInstallData] =
    useState<CreateNodeInstallResponse | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);
  const createNodeInstallMutation = useCreateNodeInstall();
  const teamsQuery = useWorkspaceTeams();
  const form = useForm<CreateNodeInstallValues>({
    resolver: zodResolver(createNodeInstallSchema),
    defaultValues: createNodeInstallDefaultValues,
  });
  const selectedTeam =
    teamId === "none"
      ? null
      : ((teamsQuery.data ?? []).find((team) => team.id === teamId) ?? null);
  const currentStep = installData ? 2 : 1;
  const installStatusQuery = useNodeInstallStatus(
    installData?.installId,
    installData,
  );
  const activeInstall = installStatusQuery.data ?? installData;

  const clearCopyTimeout = () => {
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = null;
    }
  };

  const resetDialog = () => {
    clearCopyTimeout();
    form.reset(createNodeInstallDefaultValues);
    setTeamId("none");
    setGenerationError(null);
    setCopiedField(null);
    setInstallData(null);
  };

  const copyValue = async (
    field: Exclude<CopyField, null>,
    value: string,
    successMessage: string,
  ) => {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    clearCopyTimeout();
    setCopiedField(field);
    toast.success(successMessage);
    copyTimeoutRef.current = window.setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleBackToDetails = () => {
    clearCopyTimeout();
    setCopiedField(null);
    setGenerationError(null);
    setInstallData(null);
  };

  const handleGenerate = form.handleSubmit(async (values) => {
    setGenerationError(null);

    try {
      const install = await createNodeInstallMutation.mutateAsync({
        nodeName: values.nodeName.trim(),
        description: values.description.trim() || undefined,
        teamId: teamId !== "none" ? teamId : undefined,
      });
      setInstallData(install);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Install command could not be generated right now.",
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
      <DialogTrigger render={<ShimmerButton className="action-btn-sm" />}>
        <Plus className="size-4" />
        Add node
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-1rem)] !max-w-[min(72rem,calc(100vw-1rem))] grid-rows-[auto,auto,auto,auto] gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Add node</DialogTitle>
          <DialogDescription>
            {currentStep === 1
              ? "Prepare the node details, then generate a one-click install command."
              : "Copy the generated command and run it on the target server to enroll the node automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="border-b px-6 py-3.5">
          <div className="grid gap-2 sm:grid-cols-2">
            <StepCard
              step={1}
              title="Configure node"
              description="Choose the node name, team, and optional notes."
              active={currentStep === 1}
              complete={currentStep > 1}
            />
            <StepCard
              step={2}
              title="Install agent"
              description="Copy the command and run it on the target server."
              active={currentStep === 2}
            />
          </div>
        </div>

        <div className="px-6 py-4">
          {currentStep === 1 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex items-center gap-3 rounded-[18px] border bg-muted/30 px-4 py-3 lg:col-span-2">
                <div className="tone-brand flex size-8 items-center justify-center rounded-full border">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    One-click install
                  </p>
                  <p className="text-sm font-medium">
                    Noderax will create the node record when the installer
                    consumes the bootstrap token.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-display-name">Node name</Label>
                <Input
                  id="node-display-name"
                  placeholder="Production Node EU-1"
                  aria-invalid={Boolean(form.formState.errors.nodeName)}
                  {...form.register("nodeName")}
                />
                {form.formState.errors.nodeName ? (
                  <p className="text-sm text-tone-danger">
                    {form.formState.errors.nodeName.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="node-team">Team ownership</Label>
                <Select
                  value={teamId}
                  onValueChange={(value) => setTeamId(value ?? "none")}
                >
                  <SelectTrigger id="node-team" className="w-full">
                    <SelectValue placeholder="Select a team">
                      {selectedTeam?.name ?? null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team</SelectItem>
                    {(teamsQuery.data ?? []).map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The selected team will be assigned automatically after the
                  server finishes bootstrapping.
                </p>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="node-description">Description</Label>
                <Textarea
                  id="node-description"
                  placeholder="Optional notes about where this node belongs or how it will be used."
                  className="min-h-24"
                  {...form.register("description")}
                />
              </div>

              {generationError ? (
                <p className="text-sm text-tone-danger">{generationError}</p>
              ) : null}
            </div>
          ) : installData ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.45fr)]">
              <div className="space-y-4">
                <div className="rounded-[20px] border bg-muted/20 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <SummaryField
                      label="Node name"
                      value={form.getValues("nodeName").trim()}
                    />
                    <SummaryField
                      label="Team ownership"
                      value={selectedTeam?.name ?? "No team"}
                    />
                    <SummaryField
                      label="Description"
                      value={
                        form.getValues("description").trim() || "No description"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-[20px] border bg-muted/20 p-4">
                {activeInstall ? (
                  <InstallProgressCard
                    install={activeInstall}
                    syncing={installStatusQuery.isFetching}
                  />
                ) : null}

                <div className="space-y-2">
                  <Label>Install command</Label>
                  <div className="flex items-start gap-2">
                    <Textarea
                      readOnly
                      value={installData.installCommand}
                      className="min-h-24 bg-muted/40 font-mono text-xs"
                    />
                    <CopyButton
                      copied={copiedField === "command"}
                      onClick={() =>
                        void copyValue(
                          "command",
                          installData.installCommand,
                          "Install command copied to clipboard.",
                        )
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <ReadOnlyCopyField
                    label="Agent API URL"
                    value={installData.apiUrl}
                    copied={copiedField === "api"}
                    onCopy={() =>
                      void copyValue(
                        "api",
                        installData.apiUrl,
                        "API URL copied to clipboard.",
                      )
                    }
                  />

                  <ReadOnlyCopyField
                    label="Installer script URL"
                    value={installData.scriptUrl}
                    copied={copiedField === "script"}
                    onCopy={() =>
                      void copyValue(
                        "script",
                        installData.scriptUrl,
                        "Installer script URL copied to clipboard.",
                      )
                    }
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Expires at{" "}
                  {new Date(
                    (activeInstall ?? installData).expiresAt,
                  ).toLocaleString()}
                  . Run the command on the target Ubuntu or Debian host with
                  `sudo`.
                </p>

                {installStatusQuery.error instanceof Error ? (
                  <p className="text-xs text-tone-danger">
                    Live status refresh failed:{" "}
                    {installStatusQuery.error.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 border-t bg-(--surface-dialog) px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          {currentStep === 2 ? (
            <Button
              variant="outline"
              type="button"
              onClick={handleBackToDetails}
            >
              Back to details
            </Button>
          ) : (
            <DialogClose render={<Button variant="outline" type="button" />}>
              Close
            </DialogClose>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {currentStep === 2 ? (
              <DialogClose render={<Button variant="outline" type="button" />}>
                Close
              </DialogClose>
            ) : null}
            <ShimmerButton
              type="button"
              className="action-btn"
              onClick={() => void handleGenerate()}
              disabled={createNodeInstallMutation.isPending}
            >
              {createNodeInstallMutation.isPending
                ? "Generating..."
                : installData
                  ? "Regenerate command"
                  : "Generate install command"}
            </ShimmerButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const INSTALL_STATUS_LABELS: Record<NodeInstallStatus, string> = {
  pending: "Waiting",
  installing: "Installing",
  completed: "Completed",
  failed: "Failed",
  expired: "Expired",
};

const INSTALL_STAGE_LABELS: Record<string, string> = {
  command_generated: "Waiting for installer start",
  installer_started: "Installer started",
  dependencies_installing: "Installing system packages",
  dependencies_ready: "Dependencies ready",
  service_user_ready: "Preparing noderax service account",
  binary_download_started: "Downloading agent binary",
  binary_downloaded: "Agent binary downloaded",
  agent_bootstrapping: "Bootstrapping node credentials",
  bootstrap_token_consumed: "Node created in control plane",
  service_started: "Starting background service",
  completed: "Installation completed",
  failed: "Installation failed",
  expired: "Install token expired",
};

const installStatusVariant = (status: NodeInstallStatus) => {
  switch (status) {
    case "completed":
      return "default";
    case "failed":
      return "destructive";
    case "installing":
      return "secondary";
    case "expired":
      return "outline";
    default:
      return "outline";
  }
};

const formatInstallStage = (stage: string) =>
  INSTALL_STAGE_LABELS[stage] ??
  stage
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");

const InstallProgressCard = ({
  install,
  syncing,
}: {
  install: NodeInstallDto;
  syncing: boolean;
}) => (
  <div className="rounded-[18px] border bg-background/80 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Live install status
        </p>
        <p className="text-sm font-semibold text-foreground">
          {formatInstallStage(install.stage)}
        </p>
      </div>
      <Badge
        variant={installStatusVariant(install.status)}
        className="rounded-full px-3 py-1"
      >
        {INSTALL_STATUS_LABELS[install.status]}
      </Badge>
    </div>

    <Progress value={install.progressPercent} className="mt-3">
      <div className="flex w-full items-center gap-3">
        <ProgressLabel className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Realtime progress
        </ProgressLabel>
        <span className="ml-auto text-xs font-semibold text-foreground tabular-nums">
          {Math.round(install.progressPercent)}%
        </span>
      </div>
    </Progress>

    <p className="mt-3 text-sm leading-6 text-muted-foreground">
      {install.statusMessage ?? "Waiting for the installer to report progress."}
    </p>

    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-muted-foreground">
      <span className="rounded-full border bg-muted/30 px-2.5 py-1">
        Updated {new Date(install.updatedAt).toLocaleTimeString()}
      </span>
      {syncing ? (
        <span className="rounded-full border bg-muted/30 px-2.5 py-1">
          Live sync active
        </span>
      ) : null}
      {install.hostname ? (
        <span className="rounded-full border bg-muted/30 px-2.5 py-1">
          Host {install.hostname}
        </span>
      ) : null}
      {install.nodeId ? (
        <span className="rounded-full border bg-muted/30 px-2.5 py-1">
          Node created
        </span>
      ) : null}
    </div>
  </div>
);

const StepCard = ({
  step,
  title,
  description,
  active,
  complete = false,
}: {
  step: number;
  title: string;
  description: string;
  active: boolean;
  complete?: boolean;
}) => (
  <div
    className={`rounded-[18px] border px-4 py-3 transition-colors ${
      active
        ? "border-[var(--tone-brand-border)] bg-[var(--tone-brand-soft)]"
        : complete
          ? "border-border bg-muted/20"
          : "border-dashed border-border/80 bg-background/40"
    }`}
  >
    <div className="mb-2 flex items-center gap-2">
      <div
        className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
          active
            ? "tone-brand border"
            : complete
              ? "border bg-muted text-foreground"
              : "border border-dashed text-muted-foreground"
        }`}
      >
        {complete ? <Check className="size-3.5" /> : step}
      </div>
      <p className="text-sm font-semibold">{title}</p>
    </div>
    <p className="text-xs leading-5 text-muted-foreground">{description}</p>
  </div>
);

const SummaryField = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1 rounded-2xl border bg-background/70 px-4 py-3">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </p>
    <p className="text-sm font-medium leading-6 text-foreground">{value}</p>
  </div>
);

const ReadOnlyCopyField = ({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="flex items-center gap-2">
      <Input
        readOnly
        value={value}
        className="cursor-default bg-muted/40 font-mono text-xs focus-visible:border-border focus-visible:ring-0"
      />
      <CopyButton copied={copied} onClick={onCopy} />
    </div>
  </div>
);

const CopyButton = ({
  copied,
  onClick,
}: {
  copied: boolean;
  onClick: () => void;
}) => (
  <Button
    size="icon"
    variant="outline"
    type="button"
    onClick={onClick}
    className="relative shrink-0 overflow-hidden"
  >
    <AnimatePresence mode="wait" initial={false}>
      {copied ? (
        <motion.div
          key="check"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          <Check className="size-4 text-tone-success" />
        </motion.div>
      ) : (
        <motion.div
          key="copy"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          <Copy className="size-4" />
        </motion.div>
      )}
    </AnimatePresence>
  </Button>
);
