"use client";

import Link from "next/link";
import { TerminalSquare } from "lucide-react";

import { CancelTaskDialog } from "@/components/tasks/cancel-task-dialog";
import { EmptyState } from "@/components/empty-state";
import { TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { NodeSummary, TaskSummary, TeamDto } from "@/lib/types";
import { cn } from "@/lib/utils";

export const TasksTable = ({
  tasks,
  rawTaskCount,
  nodes,
  isLoading,
  isError,
  onRetry,
  statusFilter,
  onStatusFilterChange,
  nodeFilter,
  onNodeFilterChange,
  teams,
  teamFilter,
  onTeamFilterChange,
  page,
  onPreviousPage,
  onNextPage,
  hasNextPage,
  createAction,
  canManage,
}: {
  tasks: TaskSummary[];
  rawTaskCount: number;
  nodes: NodeSummary[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  statusFilter:
    | "all"
    | "queued"
    | "running"
    | "success"
    | "failed"
    | "cancelled";
  onStatusFilterChange: (
    value: "all" | "queued" | "running" | "success" | "failed" | "cancelled",
  ) => void;
  nodeFilter: "all" | string;
  onNodeFilterChange: (value: "all" | string) => void;
  teams: TeamDto[];
  teamFilter: "all" | string;
  onTeamFilterChange: (value: "all" | string) => void;
  page: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
  hasNextPage: boolean;
  createAction?: React.ReactNode;
  canManage?: boolean;
}) => {
  const { buildWorkspaceHref } = useWorkspaceContext();
  const selectedNode = nodes.find((node) => node.id === nodeFilter);
  const selectedTeam = teams.find((team) => team.id === teamFilter);

  const statusControl = (
    <Select
      value={statusFilter}
      onValueChange={(value) =>
        onStatusFilterChange((value ?? "all") as typeof statusFilter)
      }
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

  const nodeControl = (
    <Select
      value={nodeFilter}
      onValueChange={(value) => onNodeFilterChange(value ?? "all")}
    >
      <SelectTrigger className="min-w-52">
        <SelectValue placeholder="Filter node">
          {nodeFilter === "all" ? "All nodes" : selectedNode?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All nodes</SelectItem>
        {nodes.map((node) => (
          <SelectItem key={node.id} value={node.id}>
            {node.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const teamControl = (
    <Select
      value={teamFilter}
      onValueChange={(value) => onTeamFilterChange(value ?? "all")}
    >
      <SelectTrigger className="min-w-52">
        <SelectValue placeholder="Filter team">
          {teamFilter === "all" ? "All teams" : selectedTeam?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All teams</SelectItem>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const pager = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onPreviousPage}
        disabled={page === 0}
      >
        Previous
      </Button>
      <span className="px-1 text-xs font-medium text-muted-foreground">
        Page {page + 1}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onNextPage}
        disabled={!hasNextPage}
      >
        Next
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <SectionPanel
        eyebrow="Ledger"
        title="Task list"
        description="Filter current execution work and open full task detail."
        action={
          <>
            {statusControl}
            {nodeControl}
            {teamControl}
            {pager}
            {createAction}
          </>
        }
        contentClassName="space-y-3"
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-[18px]" />
        ))}
      </SectionPanel>
    );
  }

  if (isError) {
    return (
      <SectionPanel
        eyebrow="Ledger"
        title="Task list"
        description="Filter current execution work and open full task detail."
        action={
          <>
            {statusControl}
            {nodeControl}
            {teamControl}
            {pager}
            {createAction}
          </>
        }
      >
        <EmptyState
          title="Task list is unavailable"
          description="The task inventory could not be loaded from the authenticated API connection."
          icon={TerminalSquare}
          actionLabel="Retry"
          onAction={onRetry}
        />
      </SectionPanel>
    );
  }

  if (!tasks.length) {
    return (
      <SectionPanel
        eyebrow="Ledger"
        title="Task list"
        description="Filter current execution work and open full task detail."
        action={
          <>
            {statusControl}
            {nodeControl}
            {teamControl}
            {pager}
            {createAction}
          </>
        }
      >
        <EmptyState
          title={
            rawTaskCount
              ? "No tasks match the current search"
              : "No tasks found"
          }
          description={
            rawTaskCount
              ? "The current page has tasks, but the global search did not match any of them."
              : "No tasks were returned for the current server-side filters or page."
          }
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
      action={
        <>
          {statusControl}
          {nodeControl}
          {teamControl}
          {pager}
          {createAction}
        </>
      }
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{task.name}</p>
                    {task.scheduleId ? (
                      <Badge variant="outline">Scheduled</Badge>
                    ) : null}
                    {task.targetTeamName ? (
                      <Badge variant="secondary">{task.targetTeamName}</Badge>
                    ) : null}
                    {task.templateName ? (
                      <Badge variant="outline">{task.templateName}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {task.scheduleName
                      ? `${task.command ?? task.type} • ${task.scheduleName}`
                      : (task.command ?? task.type)}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div>
                  <p>{task.nodeName}</p>
                  {task.targetTeamName ? (
                    <p className="text-xs text-muted-foreground">
                      Broadcast via {task.targetTeamName}
                    </p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <TimeDisplay value={task.createdAt} mode="relative" />
              </TableCell>
              <TableCell className="max-w-[24rem] text-muted-foreground">
                <span className="line-clamp-2 text-sm">
                  {task.lastOutput ?? "No task output recorded yet."}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {canManage ? (
                    <CancelTaskDialog
                      taskId={task.id}
                      taskStatus={task.status}
                      triggerVariant="outline"
                      triggerLabel="Stop"
                    />
                  ) : null}
                  <Link
                    href={buildWorkspaceHref(`tasks/${task.id}`) ?? "/workspaces"}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                    )}
                  >
                    Details
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionPanel>
  );
};
