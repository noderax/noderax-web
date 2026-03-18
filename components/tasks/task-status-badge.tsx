import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

const styles: Record<TaskStatus, string> = {
  queued: "border-primary/20 bg-primary/10 text-primary",
  running: "border-amber-500/20 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  success: "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  failed: "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
  cancelled: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
};

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
      styles[status],
    )}
  >
    {status}
  </Badge>
);
