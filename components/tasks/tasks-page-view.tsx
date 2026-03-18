"use client";

import { AlertTriangle, CircleCheckBig, CirclePlay, Clock3 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { TasksTable } from "@/components/tasks/tasks-table";
import { useTasksQuery } from "@/lib/hooks/use-noderax-data";

export const TasksPageView = () => {
  const tasksQuery = useTasksQuery();
  const tasks = tasksQuery.data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Execution"
        title="Task management"
        description="Track queued work, inspect live execution state, and drill into streaming task logs."
      />
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            title="Pending"
            value={tasks.filter((task) => task.status === "pending").length}
            description="Queued tasks waiting for capacity or placement."
            icon={Clock3}
            tone="blue"
          />
          <OverviewCard
            title="Running"
            value={tasks.filter((task) => task.status === "running").length}
            description="Active executions currently consuming compute resources."
            icon={CirclePlay}
            tone="amber"
            delay={0.04}
          />
          <OverviewCard
            title="Successful"
            value={tasks.filter((task) => task.status === "success").length}
            description="Completed tasks with a successful exit code."
            icon={CircleCheckBig}
            tone="emerald"
            delay={0.08}
          />
          <OverviewCard
            title="Failed"
            value={tasks.filter((task) => task.status === "failed").length}
            description="Executions requiring retry, rollback, or manual inspection."
            icon={AlertTriangle}
            tone="rose"
            delay={0.12}
          />
        </div>
        <TasksTable tasks={tasks} isLoading={tasksQuery.isPending} />
      </div>
    </AppShell>
  );
};
