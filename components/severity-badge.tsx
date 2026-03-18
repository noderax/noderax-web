import { Badge } from "@/components/ui/badge";
import type { EventSeverity } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityStyles: Record<EventSeverity, string> = {
  info: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  critical: "border-rose-500/20 bg-rose-500/10 text-rose-300",
};

export const SeverityBadge = ({ severity }: { severity: EventSeverity }) => (
  <Badge
    variant="outline"
    className={cn(
      "rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
      severityStyles[severity],
    )}
  >
    {severity}
  </Badge>
);
