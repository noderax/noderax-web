import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex min-h-60 flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center shadow-dashboard",
      className,
    )}
  >
    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary">
      <Icon className="size-5" />
    </div>
    <h3 className="text-lg font-semibold">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    {actionLabel && onAction ? (
      <Button className="mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);
