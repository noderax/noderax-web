"use client";

import type { LucideIcon } from "lucide-react";

import { AnimatedCard } from "@/components/magic/animated-card";
import { GridPattern } from "@/components/magic/grid-pattern";
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
    icon: "bg-primary/12 text-primary",
    halo: "from-primary/24 via-primary/8 to-transparent",
    rail: "from-primary via-primary/45 to-transparent",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    halo: "from-emerald-500/18 via-emerald-500/6 to-transparent",
    rail: "from-emerald-500 via-emerald-500/45 to-transparent",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    halo: "from-amber-500/18 via-amber-500/6 to-transparent",
    rail: "from-amber-500 via-amber-500/45 to-transparent",
  },
  rose: {
    icon: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    halo: "from-rose-500/18 via-rose-500/6 to-transparent",
    rail: "from-rose-500 via-rose-500/45 to-transparent",
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
  <AnimatedCard delay={delay}>
    <Card className="surface-panel surface-hover relative min-h-[176px] overflow-hidden border">
      <div className={`absolute inset-0 bg-gradient-to-br ${tones[tone].halo}`} />
      <div className={`absolute inset-y-5 left-0 w-px bg-gradient-to-b ${tones[tone].rail}`} />
      <GridPattern className="opacity-16" />
      <CardContent className="relative z-10 flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {title}
            </p>
            <p className="text-4xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className={`rounded-[1.1rem] border border-white/10 p-3 ${tones[tone].icon}`}>
            <Icon className="size-5" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-px w-full bg-gradient-to-r from-border via-border/70 to-transparent" />
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  </AnimatedCard>
);
