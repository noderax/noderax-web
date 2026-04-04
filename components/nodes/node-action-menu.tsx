"use client";

import { useState } from "react";
import { MoreVertical, Power, RefreshCw, RotateCcw } from "lucide-react";

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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateTask } from "@/lib/hooks/use-noderax-data";
import { getOperationalRootAccessState } from "@/lib/root-access";
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

type NodeAction = "reboot" | "restart-agent" | "update-packages";

const actionMeta: Record<
  NodeAction,
  {
    label: string;
    description: string;
    command: string;
    icon: typeof Power;
    tone: string;
  }
> = {
  reboot: {
    label: "Reboot node",
    description:
      "This will reboot the server immediately. The node will go offline and come back after the system restarts.",
    command: "reboot",
    icon: Power,
    tone: "text-destructive",
  },
  "restart-agent": {
    label: "Restart Noderax agent",
    description:
      "This will restart the noderax-agent systemd service. The node may briefly disconnect while the agent restarts.",
    command: "systemctl restart noderax-agent",
    icon: RotateCcw,
    tone: "text-orange-500",
  },
  "update-packages": {
    label: "Update packages",
    description:
      "This will run 'apt-get update' on the node to synchronize the package index from its package sources.",
    command: "apt-get update",
    icon: RefreshCw,
    tone: "text-blue-500",
  },
};

export const NodeActionMenu = ({
  node,
  variant = "icon",
  className,
}: {
  node: Pick<
    NodeSummary,
    | "id"
    | "name"
    | "rootAccessAppliedProfile"
    | "rootAccessProfile"
    | "rootAccessSyncStatus"
    | "rootAccessLastError"
  >;
  variant?: "icon" | "outline";
  className?: string;
}) => {
  const createTask = useCreateTask();
  const [pendingAction, setPendingAction] = useState<NodeAction | null>(null);
  const meta = pendingAction ? actionMeta[pendingAction] : null;
  const operationalRoot = getOperationalRootAccessState(node);
  const canRunOperationalActions = operationalRoot.allowed;
  const disabledReason = canRunOperationalActions ? null : operationalRoot.reason;

  const handleActionClick = (action: NodeAction) => {
    if (!canRunOperationalActions) {
      return;
    }

    // We use a small timeout to let the dropdown close before opening the dialog
    // to avoid potential focus trap/portal conflicts in Base UI
    setTimeout(() => {
      setPendingAction(action);
    }, 10);
  };

  const handleConfirm = () => {
    if (!meta) return;

    createTask.mutate(
      {
        nodeId: node.id,
        type: "shell.exec",
        payload: {
          command: meta.command,
          runAsRoot: true,
          rootScope: "operational",
        },
      },
      {
        onSettled: () => {
          setPendingAction(null);
        },
      },
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            variant === "icon"
              ? "flex size-8 items-center justify-center rounded-xl border bg-background/80 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              : "inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted",
            className,
          )}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <MoreVertical className="size-4" />
          {variant !== "icon" ? <span>Actions</span> : null}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {node.name ?? "Node"} actions
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {disabledReason ? (
            <>
              <p className="px-2 py-1 whitespace-normal text-xs font-normal leading-5 text-muted-foreground">
                {disabledReason}
              </p>
              <DropdownMenuSeparator />
            </>
          ) : null}
          {(Object.keys(actionMeta) as NodeAction[]).map((action) => {
            const { label, icon: Icon, tone } = actionMeta[action];

            return (
              <DropdownMenuItem
                key={action}
                disabled={!canRunOperationalActions}
                onClick={(e) => {
                  e.stopPropagation();
                  handleActionClick(action);
                }}
                className="gap-2"
              >
                <Icon className={cn("size-4", tone)} />
                <span>{label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <DialogContent
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{meta?.label ?? "Node action"}</DialogTitle>
            <DialogDescription>
              {meta?.description ?? "Select an action to proceed."}
            </DialogDescription>
          </DialogHeader>
          <div className="surface-subtle rounded-[14px] border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Command
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {meta?.command ?? "..."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={createTask.isPending || !meta}
              variant={pendingAction === "reboot" ? "destructive" : "default"}
            >
              {createTask.isPending ? "Sending…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
