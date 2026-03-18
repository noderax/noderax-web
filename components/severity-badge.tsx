import { Badge } from "@/components/ui/badge";
import type { EventSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityStyles: Record<EventSeverity, string> = {
  info: "border-primary/16 bg-primary/[0.08] text-primary",
  warning:
    "border-amber-500/16 bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
  critical:
    "border-rose-500/16 bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
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
