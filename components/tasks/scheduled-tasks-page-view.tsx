"use client";

import { useDeferredValue, useMemo } from "react";
import { Clock3, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { ScheduledTasksPanel } from "@/components/tasks/scheduled-tasks-panel";
import { SectionPanel } from "@/components/ui/section-panel";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import {
  useNodes,
  useScheduledTasks,
} from "@/lib/hooks/use-noderax-data";
import { useAppStore } from "@/store/useAppStore";

export const ScheduledTasksPageView = () => {
  const authQuery = useAuthSession();
  const { isWorkspaceAdmin, workspace } = useWorkspaceContext();
  const searchQuery = useAppStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const nodesQuery = useNodes({ limit: 100 });
  const isAdmin = isWorkspaceAdmin && !workspace?.isArchived;
  const timezone = workspace?.defaultTimezone;
  const scheduledTasksQuery = useScheduledTasks(isAdmin);
  const filteredSchedules = useMemo(
    () =>
      (scheduledTasksQuery.data ?? []).filter((schedule) =>
        deferredSearchQuery
          ? [
              schedule.name,
              schedule.command,
              schedule.nodeName,
              schedule.ownerName ?? "",
              schedule.frequencyLabel,
            ]
              .join(" ")
              .toLowerCase()
              .includes(deferredSearchQuery)
          : true,
      ),
    [deferredSearchQuery, scheduledTasksQuery.data],
  );
  const createAction =
    nodesQuery.data !== undefined && !workspace?.isArchived ? (
      <CreateTaskDialog
        nodes={nodesQuery.data}
        defaultTab="scheduled"
        triggerLabel="Create schedule"
        title="Create schedule"
        description={`Configure a recurring shell command. New schedules follow the workspace timezone${timezone ? ` (${timezone})` : ""}.`}
      />
    ) : undefined;

  if (!authQuery.session && authQuery.isPending) {
    return (
      <AppShell>
        <ScheduledTasksPanel schedules={[]} isLoading />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <SectionPanel
          eyebrow="Automation"
          title="Scheduled tasks"
          description="Recurring shell command management is available to admins."
        >
          <EmptyState
            title="Admin access required"
            description="Only admins can review or manage recurring scheduled tasks in this workspace."
            icon={ShieldAlert}
          />
        </SectionPanel>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <ScheduledTasksPanel
          schedules={filteredSchedules}
          isLoading={scheduledTasksQuery.isPending}
          isError={scheduledTasksQuery.isError}
          onRetry={() => scheduledTasksQuery.refetch()}
        action={createAction}
        canManage={!workspace?.isArchived}
      />

        {nodesQuery.isError ? (
          <SectionPanel
            eyebrow="Automation"
            title="Schedule targets"
            description="Node inventory could not be loaded for schedule creation."
          >
            <EmptyState
              title="Nodes are unavailable"
              description="Load the node inventory before creating a new recurring schedule."
              icon={Clock3}
            />
          </SectionPanel>
        ) : null}
      </div>
    </AppShell>
  );
};
