import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/types";

const styles: Record<NodeStatus, string> = {
  online:
    "border-emerald-500/16 bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300",
  offline:
    "border-rose-500/16 bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
};

export const NodeStatusBadge = ({ status }: { status: NodeStatus }) => (
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
