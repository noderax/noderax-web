"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { TerminalSquare } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
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
import { buttonVariants } from "@/components/ui/button";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
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
    "all" | "pending" | "running" | "success" | "failed"
  >("all");
  const searchQuery = useAppStore((state) => state.searchQuery);

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesStatus =
          statusFilter === "all" ? true : task.status === statusFilter;
        const matchesQuery = searchQuery
          ? [task.name, task.command, task.nodeName]
              .join(" ")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          : true;

        return matchesStatus && matchesQuery;
      }),
    [searchQuery, statusFilter, tasks],
  );

  if (isLoading) {
    return (
      <div className="space-y-3 rounded-3xl border border-border/70 bg-card/70 p-4 shadow-dashboard">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!filteredTasks.length) {
    return (
      <EmptyState
        title="No tasks match the current filters"
        description="Broaden the page search or switch the execution status filter to inspect additional tasks."
        icon={TerminalSquare}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
          <SelectTrigger className="min-w-44 rounded-full bg-card/80">
            <SelectValue placeholder="Filter task status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tasks</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-dashboard">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Status</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Node</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="pr-4 text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="pl-4">
                  <TaskStatusBadge status={task.status} />
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{task.name}</p>
                    <p className="text-xs text-muted-foreground">{task.command}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{task.nodeName}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNowStrict(new Date(task.createdAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="min-w-52">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{task.status}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} />
                  </div>
                </TableCell>
                <TableCell className="pr-4 text-right">
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
      </div>
    </>
  );
};
