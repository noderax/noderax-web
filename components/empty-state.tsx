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
  variant?: "default" | "plain";
}

export const EmptyState = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  className,
  variant = "default",
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex min-h-56 flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center",
      variant === "plain" ? "bg-transparent" : "surface-subtle",
      className,
    )}
  >
    <div className="mb-4 flex size-12 items-center justify-center rounded-full border bg-background text-primary shadow-sm">
      <Icon className="size-5" />
    </div>
    <h3 className="text-lg font-medium tracking-tight">{title}</h3>
    <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
    {actionLabel && onAction ? (
      <Button className="mt-5" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
);
