import { Badge } from "@/components/ui/badge";
import type { EventSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityStyles: Record<EventSeverity, string> = {
  info: "tone-brand",
  warning: "tone-warning",
  critical: "tone-danger",
};

export const SeverityBadge = ({ severity }: { severity: EventSeverity }) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
      severityStyles[severity],
    )}
  >
    {severity}
  </Badge>
);
