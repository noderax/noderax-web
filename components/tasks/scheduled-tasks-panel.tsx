"use client";

import Link from "next/link";
import { Clock3, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionPanel } from "@/components/ui/section-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import {
  useDeleteScheduledTask,
  useUpdateScheduledTask,
} from "@/lib/hooks/use-noderax-data";
import type { ScheduledTaskSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ScheduledTasksPanel = ({
  schedules,
  isLoading,
  isError,
  onRetry,
}: {
  schedules: ScheduledTaskSummary[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}) => {
  const updateScheduledTask = useUpdateScheduledTask();
  const deleteScheduledTask = useDeleteScheduledTask();
  const [pendingDelete, setPendingDelete] = useState<ScheduledTaskSummary | null>(null);

  const orderedSchedules = useMemo(
    () =>
      schedules
        .slice()
        .sort((left, right) => {
          if (left.enabled !== right.enabled) {
            return left.enabled ? -1 : 1;
          }

          if (!left.nextRunAt && !right.nextRunAt) {
            return left.createdAt.localeCompare(right.createdAt);
          }

          if (!left.nextRunAt) {
            return 1;
          }

          if (!right.nextRunAt) {
            return -1;
          }

          return left.nextRunAt.localeCompare(right.nextRunAt);
        }),
    [schedules],
  );

  if (isLoading) {
    return (
      <SectionPanel
        eyebrow="Automation"
        title="Scheduled tasks"
        description="Recurring shell commands evaluated in UTC."
        contentClassName="space-y-3"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-[18px]" />
        ))}
      </SectionPanel>
    );
  }

  if (isError) {
    return (
      <SectionPanel
        eyebrow="Automation"
        title="Scheduled tasks"
        description="Recurring shell commands evaluated in UTC."
      >
        <EmptyState
          title="Scheduled tasks are unavailable"
          description="The recurring task configuration could not be loaded from the authenticated API connection."
          icon={Clock3}
          actionLabel="Retry"
          onAction={onRetry}
        />
      </SectionPanel>
    );
  }

  if (!orderedSchedules.length) {
    return (
      <SectionPanel
        eyebrow="Automation"
        title="Scheduled tasks"
        description="Recurring shell commands evaluated in UTC."
      >
        <EmptyState
          title="No scheduled tasks yet"
          description="Create a recurring shell command from the Scheduled tab in the task dialog."
          icon={Clock3}
        />
      </SectionPanel>
    );
  }

  return (
    <>
      <SectionPanel
        eyebrow="Automation"
        title="Scheduled tasks"
        description="Recurring shell commands evaluated in UTC."
        contentClassName="p-0"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Status</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Node</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next run</TableHead>
              <TableHead>Last run</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderedSchedules.map((schedule) => (
              <TableRow key={schedule.id}>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                      schedule.enabled
                        ? "tone-success"
                        : "tone-neutral text-muted-foreground",
                    )}
                  >
                    {schedule.enabled ? "Enabled" : "Disabled"}
                  </span>
                </TableCell>
                <TableCell className="max-w-[22rem]">
                  <div>
                    <p className="font-medium">{schedule.name}</p>
                    <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
                      {schedule.command}
                    </p>
                    {schedule.lastError ? (
                      <p className="mt-2 line-clamp-2 text-xs text-tone-danger">
                        Last error: {schedule.lastError}
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {schedule.nodeName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {schedule.frequencyLabel}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {schedule.nextRunAt ? (
                    <TimeDisplay value={schedule.nextRunAt} mode="datetime" />
                  ) : (
                    "Paused"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {schedule.lastRunAt ? (
                    <TimeDisplay value={schedule.lastRunAt} mode="datetime" />
                  ) : (
                    "Never"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <Switch
                      checked={schedule.enabled}
                      size="sm"
                      disabled={updateScheduledTask.isPending || deleteScheduledTask.isPending}
                      aria-label={schedule.enabled ? "Disable schedule" : "Enable schedule"}
                      onCheckedChange={(checked) =>
                        updateScheduledTask.mutate({
                          id: schedule.id,
                          payload: { enabled: Boolean(checked) },
                        })
                      }
                    />
                    {schedule.lastRunTaskId ? (
                      <Link
                        href={`/tasks/${schedule.lastRunTaskId}`}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                      >
                        Details
                      </Link>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-tone-danger"
                      disabled={deleteScheduledTask.isPending}
                      onClick={() => setPendingDelete(schedule)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionPanel>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scheduled task</DialogTitle>
            <DialogDescription>
              This will stop future runs for{" "}
              <span className="font-medium text-foreground">
                {pendingDelete?.name ?? "this schedule"}
              </span>
              . Existing task history will remain available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteScheduledTask.isPending || !pendingDelete}
              onClick={() => {
                if (!pendingDelete) {
                  return;
                }

                deleteScheduledTask.mutate(pendingDelete.id, {
                  onSuccess: () => setPendingDelete(null),
                });
              }}
            >
              {deleteScheduledTask.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
