import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

const styles: Record<TaskStatus, string> = {
  queued: "border-primary/16 bg-primary/[0.08] text-primary",
  running:
    "border-amber-500/16 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
  success:
    "border-emerald-500/16 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300",
  failed:
    "border-rose-500/16 bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
  cancelled:
    "border-zinc-500/16 bg-zinc-500/[0.08] text-zinc-700 dark:text-zinc-300",
};

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
      styles[status],
    )}
  >
    {status}
  </Badge>
);
