"use client";

import { AlertTriangle, CircleCheckBig, CirclePlay, Clock3 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OverviewCard } from "@/components/dashboard/overview-card";
import { TasksTable } from "@/components/tasks/tasks-table";
import { SectionPanel } from "@/components/ui/section-panel";
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
        description="Track queued work, inspect live execution state, and drill into task logs and task-scoped events."
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
              <span className="text-muted-foreground">Successful</span>{" "}
              <span className="font-semibold">{successCount}</span>
            </div>
            <div className="meta-chip rounded-full border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Failed</span>{" "}
              <span className="font-semibold">{failedCount}</span>
            </div>
          </>
        }
        actions={
          <div className="min-w-[12rem] flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Latest execution
            </p>
            <p className="mt-1 text-sm font-medium">
              {mostRecentTask?.name ?? "No tasks yet"}
            </p>
            <TimeDisplay
              value={mostRecentTask?.createdAt}
              mode="relative"
              emptyLabel="Waiting"
              className="mt-1 block text-xs text-muted-foreground"
            />
          </div>
        }
      />
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <SectionPanel
            variant="feature"
            eyebrow="Queue Posture"
            title="Execution command lane"
            description="A tighter view of the current backlog and the work currently consuming cluster capacity."
            contentClassName="grid gap-4 p-6 sm:grid-cols-2"
          >
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Queue pressure
              </p>
              <p className="mt-2 text-3xl font-semibold">{queuedCount}</p>
              <p className="text-sm text-muted-foreground">
                Tasks are waiting for pickup or free capacity.
              </p>
            </div>
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Active work
              </p>
              <p className="mt-2 text-3xl font-semibold">{runningCount}</p>
              <p className="text-sm text-muted-foreground">
                Executions actively consuming fleet resources.
              </p>
            </div>
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Reliability
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {tasks.length ? Math.round((successCount / tasks.length) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">
                Success rate for the tasks currently visible in this window.
              </p>
            </div>
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Last queued
              </p>
              <p className="mt-2 text-lg font-semibold">
                {mostRecentTask?.name ?? "No tasks yet"}
              </p>
              <TimeDisplay
                value={mostRecentTask?.createdAt}
                mode="relative"
                emptyLabel="Waiting"
                className="mt-1 block text-sm text-muted-foreground"
              />
            </div>
          </SectionPanel>

          <div className="grid gap-4 sm:grid-cols-2">
            <OverviewCard
              title="Queued"
              value={queuedCount}
              description="Tasks waiting for agent pickup or available capacity."
              icon={Clock3}
              tone="brand"
            />
            <OverviewCard
              title="Running"
              value={runningCount}
              description="Active executions currently consuming cluster resources."
              icon={CirclePlay}
              tone="amber"
              delay={0.04}
            />
            <OverviewCard
              title="Successful"
              value={successCount}
              description="Completed tasks with a successful exit outcome."
              icon={CircleCheckBig}
              tone="emerald"
              delay={0.08}
            />
            <OverviewCard
              title="Failed"
              value={failedCount}
              description="Executions requiring retry, rollback, or deeper inspection."
              icon={AlertTriangle}
              tone="rose"
              delay={0.12}
            />
          </div>
        </div>
        <TasksTable tasks={tasks} isLoading={tasksQuery.isPending} />
      </div>
    </AppShell>
  );
};
