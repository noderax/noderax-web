"use client";

import { Clock3, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { ScheduledTasksPanel } from "@/components/tasks/scheduled-tasks-panel";
import { SectionPanel } from "@/components/ui/section-panel";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import {
  useNodes,
  useScheduledTasks,
} from "@/lib/hooks/use-noderax-data";

export const ScheduledTasksPageView = () => {
  const authQuery = useAuthSession();
  const nodesQuery = useNodes({ limit: 100 });
  const isAdmin = authQuery.session?.user.role === "admin";
  const timezone = authQuery.session?.user.timezone;
  const scheduledTasksQuery = useScheduledTasks(isAdmin);
  const createAction =
    nodesQuery.data !== undefined ? (
      <CreateTaskDialog
        nodes={nodesQuery.data}
        defaultTab="scheduled"
        triggerLabel="Create schedule"
        title="Create schedule"
        description={`Configure a recurring shell command. New schedules follow your saved timezone${timezone ? ` (${timezone})` : ""}.`}
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
          schedules={scheduledTasksQuery.data ?? []}
          isLoading={scheduledTasksQuery.isPending}
          isError={scheduledTasksQuery.isError}
          onRetry={() => scheduledTasksQuery.refetch()}
          action={createAction}
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
