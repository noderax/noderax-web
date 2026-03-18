import type { LucideIcon } from "lucide-react";

import { AnimatedCard } from "@/components/magic/animated-card";
import { GridPattern } from "@/components/magic/grid-pattern";
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
  <AnimatedCard className={cn("rounded-[28px]", className)}>
    <div
      className={cn(
        "surface-panel relative flex min-h-60 flex-col items-center justify-center overflow-hidden rounded-[32px] border border-dashed px-6 py-12 text-center shadow-dashboard",
        className,
      )}
    >
      <GridPattern className="opacity-14" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(156,28,41,0.14),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
      <div className="relative z-10 max-w-lg">
        <div className="mb-4 inline-flex rounded-[1.35rem] border border-primary/20 bg-primary/10 p-3 text-primary">
          <Icon className="size-5" />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {actionLabel && onAction ? (
          <Button className="mt-5" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  </AnimatedCard>
);
