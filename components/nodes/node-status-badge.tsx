import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NodeStatus } from "@/lib/types";

const styles: Record<NodeStatus, string> = {
  online: "tone-success",
  offline: "tone-danger",
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
