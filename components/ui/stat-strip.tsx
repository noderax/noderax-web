import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatTone = "brand" | "success" | "warning" | "danger" | "neutral";

type StatStripItem = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
};

const tones: Record<StatTone, string> = {
  brand: "tone-brand",
  success: "tone-success",
  warning: "tone-warning",
  danger: "tone-danger",
  neutral: "tone-neutral",
};

export const StatStrip = ({
  items,
  className,
}: {
  items: StatStripItem[];
  className?: string;
}) => (
  <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-4", className)}>
    {items.map((item, index) => {
      const Icon = item.icon;

      return (
        <div
          key={`${item.label}-${index}`}
          className="surface-panel flex min-h-35 flex-col justify-between rounded-2xl border p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {item.label}
              </p>
              <div className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                {item.value}
              </div>
            </div>
            {Icon ? (
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-xl border",
                  tones[item.tone ?? "neutral"],
                )}
              >
                <Icon className="size-4" />
              </div>
            ) : null}
          </div>
          {item.description ? (
            <div className="mt-4 text-sm leading-6 text-muted-foreground">
              {item.description}
            </div>
          ) : null}
        </div>
      );
    })}
  </div>
);
