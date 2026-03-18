"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TerminalSquare } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import type { TaskSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

export const TasksTable = ({
  tasks,
  isLoading,
}: {
  tasks: TaskSummary[];
  isLoading?: boolean;
}) => {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "queued" | "running" | "success" | "failed" | "cancelled"
  >("all");
  const searchQuery = useAppStore((state) => state.searchQuery);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus =
          statusFilter === "all" ? true : task.status === statusFilter;
        const matchesQuery = searchQuery
          ? [task.name, task.command ?? "", task.nodeName, task.type]
              .join(" ")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true;

        return matchesStatus && matchesQuery;
      }),
    [searchQuery, statusFilter, tasks],
  );

  const filterControl = (
    <Select
      value={statusFilter}
      onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
    >
      <SelectTrigger className="min-w-44">
        <SelectValue placeholder="Filter task status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All tasks</SelectItem>
        <SelectItem value="queued">Queued</SelectItem>
        <SelectItem value="running">Running</SelectItem>
        <SelectItem value="success">Success</SelectItem>
        <SelectItem value="failed">Failed</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
      </SelectContent>
    </Select>
  );

  if (isLoading) {
    return (
      <SectionPanel
        eyebrow="Ledger"
        title="Task list"
        description="Filter current execution work and open full task detail."
        action={filterControl}
        contentClassName="space-y-3"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-[18px]" />
        ))}
      </SectionPanel>
    );
  }

  if (!filteredTasks.length) {
    return (
      <SectionPanel
        eyebrow="Ledger"
        title="Task list"
        description="Filter current execution work and open full task detail."
        action={filterControl}
      >
        <EmptyState
          title="No tasks match the current filters"
          description="Broaden the page search or switch the execution status filter to inspect additional tasks."
          icon={TerminalSquare}
        />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      eyebrow="Ledger"
      title="Task list"
      description="Filter current execution work and open full task detail."
      action={filterControl}
      contentClassName="p-0"
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Status</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Latest output</TableHead>
            <TableHead className="text-right">Open</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{task.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.command ?? task.type}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{task.nodeName}</TableCell>
              <TableCell className="text-muted-foreground">
                <TimeDisplay value={task.createdAt} mode="relative" />
              </TableCell>
              <TableCell className="max-w-[24rem] text-muted-foreground">
                <span className="line-clamp-2 text-sm">
                  {task.lastOutput ?? "No task output recorded yet."}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/tasks/${task.id}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  Details
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionPanel>
  );
};
