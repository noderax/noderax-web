"use client";

import { AlertTriangle, CircleCheckBig, CirclePlay, Clock3 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TasksTable } from "@/components/tasks/tasks-table";
import { StatStrip } from "@/components/ui/stat-strip";
import { TimeDisplay } from "@/components/ui/time-display";
import { useTasks } from "@/lib/hooks/use-noderax-data";

export const TasksPageView = () => {
  const tasksQuery = useTasks({ limit: 50 });
  const tasks = tasksQuery.data ?? [];
  const queuedCount = tasks.filter((task) => task.status === "queued").length;
  const runningCount = tasks.filter((task) => task.status === "running").length;
  const successCount = tasks.filter((task) => task.status === "success").length;
  const failedCount = tasks.filter((task) => task.status === "failed").length;
  const mostRecentTask = tasks[0];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Execution"
        title="Task management"
        description="Track queued work, monitor live execution, and open task-specific detail from a quieter execution surface."
        meta={
          <>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Queued</span>{" "}
              <span className="font-semibold">{queuedCount}</span>
            </div>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Running</span>{" "}
              <span className="font-semibold">{runningCount}</span>
            </div>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Failed</span>{" "}
              <span className="font-semibold">{failedCount}</span>
            </div>
          </>
        }
        actions={
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Latest execution
            </p>
            <p className="text-sm font-medium">{mostRecentTask?.name ?? "No tasks yet"}</p>
            <TimeDisplay
              value={mostRecentTask?.createdAt}
              mode="relative"
              emptyLabel="Waiting"
              className="block text-xs text-muted-foreground"
            />
          </div>
        }
      />
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
