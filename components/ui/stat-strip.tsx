import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatTone = "brand" | "emerald" | "amber" | "rose" | "neutral";

type StatStripItem = {
  label: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
};

const tones: Record<StatTone, string> = {
  brand: "text-primary bg-primary/8 border-primary/12",
  emerald: "text-emerald-700 bg-emerald-500/8 border-emerald-500/12 dark:text-emerald-300",
  amber: "text-amber-700 bg-amber-500/8 border-amber-500/12 dark:text-amber-300",
  rose: "text-rose-700 bg-rose-500/8 border-rose-500/12 dark:text-rose-300",
  neutral: "text-foreground bg-muted/60 border-border/70",
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
          className="surface-panel flex min-h-[132px] flex-col justify-between rounded-[22px] border p-5"
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
                  "flex size-9 items-center justify-center rounded-full border",
                  tones[item.tone ?? "neutral"],
                )}
              >
                <Icon className="size-4" />
              </div>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.description}</p>
          ) : null}
        </div>
      );
    })}
  </div>
);
