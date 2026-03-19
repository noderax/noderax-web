"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { AlertTriangle, CircleCheckBig, CirclePlay, Clock3 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TasksTable } from "@/components/tasks/tasks-table";
import { StatStrip } from "@/components/ui/stat-strip";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import { useNodes, useTasks } from "@/lib/hooks/use-noderax-data";
import type { NodeSummary, TaskSummary } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const PAGE_SIZE = 25;
const EMPTY_TASKS: TaskSummary[] = [];
const EMPTY_NODES: NodeSummary[] = [];

export const TasksPageView = () => {
  const authQuery = useAuthSession();
  const searchQuery = useAppStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const [pageState, setPageState] = useState({
    index: 0,
    scope: "all:all",
  });
  const [statusFilter, setStatusFilter] = useState<
    "all" | "queued" | "running" | "success" | "failed" | "cancelled"
  >("all");
  const [nodeFilter, setNodeFilter] = useState<"all" | string>("all");
  const pageScope = `${statusFilter}:${nodeFilter}`;
  const page = pageState.scope === pageScope ? pageState.index : 0;
  const tasksQuery = useTasks({
    status: statusFilter === "all" ? undefined : statusFilter,
    nodeId: nodeFilter === "all" ? undefined : nodeFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const nodesQuery = useNodes({ limit: 100 });
  const tasks = tasksQuery.data ?? EMPTY_TASKS;
  const nodes = nodesQuery.data ?? EMPTY_NODES;
  const isAdmin = authQuery.session?.user.role === "admin";

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) =>
        deferredSearchQuery
          ? [task.name, task.command ?? "", task.nodeName, task.type]
              .join(" ")
              .toLowerCase()
              .includes(deferredSearchQuery)
          : true,
      ),
    [deferredSearchQuery, tasks],
  );

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
              description: "Queued tasks visible in the current server-side page.",
              icon: Clock3,
              tone: "brand",
            },
            {
              label: "Running",
              value: runningCount,
              description: "Active executions currently loaded in this page.",
              icon: CirclePlay,
              tone: "warning",
            },
            {
              label: "Successful",
              value: successCount,
              description: "Loaded tasks that completed with a successful outcome.",
              icon: CircleCheckBig,
              tone: "success",
            },
            {
              label: "Failed",
              value: failedCount,
              description: "Loaded tasks that still need review or retry.",
              icon: AlertTriangle,
              tone: "danger",
            },
          ]}
        />
        <TasksTable
          tasks={visibleTasks}
          rawTaskCount={tasks.length}
          nodes={nodes}
          isLoading={tasksQuery.isPending}
          isError={tasksQuery.isError}
          onRetry={() => tasksQuery.refetch()}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
          }}
          nodeFilter={nodeFilter}
          onNodeFilterChange={(value) => {
            setNodeFilter(value);
          }}
          page={page}
          onPreviousPage={() =>
            setPageState({
              index: Math.max(0, page - 1),
              scope: pageScope,
            })
          }
          onNextPage={() =>
            setPageState({
              index: page + 1,
              scope: pageScope,
            })
          }
          hasNextPage={tasks.length === PAGE_SIZE}
          createAction={isAdmin ? <CreateTaskDialog nodes={nodes} /> : null}
        />
      </div>
    </AppShell>
  );
};
