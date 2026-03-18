import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

const styles: Record<TaskStatus, string> = {
  pending: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  running: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-300",
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
