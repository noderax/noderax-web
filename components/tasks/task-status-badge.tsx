import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

const styles: Record<TaskStatus, string> = {
  queued: "tone-brand",
  running: "tone-warning",
  success: "tone-success",
  failed: "tone-danger",
  cancelled: "tone-neutral",
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
