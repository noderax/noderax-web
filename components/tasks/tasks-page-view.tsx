"use client";

import { AlertTriangle, CircleCheckBig, CirclePlay, Clock3 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { TasksTable } from "@/components/tasks/tasks-table";
import { StatStrip } from "@/components/ui/stat-strip";
import { useTasks } from "@/lib/hooks/use-noderax-data";

export const TasksPageView = () => {
  const tasksQuery = useTasks({ limit: 50 });
  const tasks = tasksQuery.data ?? [];
  const queuedCount = tasks.filter((task) => task.status === "queued").length;
  const runningCount = tasks.filter((task) => task.status === "running").length;
  const successCount = tasks.filter((task) => task.status === "success").length;
  const failedCount = tasks.filter((task) => task.status === "failed").length;

  return (
    <AppShell>
      <div className="space-y-6">
        <StatStrip
          items={[
            {
              label: "Queued",
              value: queuedCount,
              description: "Tasks waiting for pickup or available agent capacity.",
              icon: Clock3,
              tone: "brand",
            },
            {
              label: "Running",
              value: runningCount,
              description: "Executions currently consuming cluster resources.",
              icon: CirclePlay,
              tone: "amber",
            },
            {
              label: "Successful",
              value: successCount,
              description: "Completed tasks with a successful exit outcome.",
              icon: CircleCheckBig,
              tone: "emerald",
            },
            {
              label: "Failed",
              value: failedCount,
              description: "Workflows that require retry, rollback, or review.",
              icon: AlertTriangle,
              tone: "rose",
            },
          ]}
        />
        <TasksTable tasks={tasks} isLoading={tasksQuery.isPending} />
      </div>
    </AppShell>
  );
};
