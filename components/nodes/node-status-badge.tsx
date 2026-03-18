import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/types";

const styles: Record<NodeStatus, string> = {
  online: "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  offline: "border-rose-500/20 bg-rose-500/12 text-rose-700 dark:text-rose-300",
};

export const NodeStatusBadge = ({ status }: { status: NodeStatus }) => (
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
