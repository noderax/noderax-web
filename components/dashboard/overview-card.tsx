"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface OverviewCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone: "brand" | "emerald" | "amber" | "rose";
  delay?: number;
}

const tones = {
  brand: {
    icon: "bg-primary/[0.08] text-primary",
  },
  emerald: {
    icon: "bg-emerald-500/[0.08] text-emerald-800 dark:text-emerald-300",
  },
  amber: {
    icon: "bg-amber-500/[0.08] text-amber-800 dark:text-amber-300",
  },
  rose: {
    icon: "bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
  },
};

export const OverviewCard = ({
  title,
  value,
  description,
  icon: Icon,
  tone,
  delay,
}: OverviewCardProps) => (
  <Card
    className="surface-panel surface-hover min-h-[168px] border"
    style={delay ? { animationDelay: `${delay}s` } : undefined}
  >
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-xl border border-border/70 p-3 ${tones[tone].icon}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
