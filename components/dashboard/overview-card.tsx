"use client";

import type { LucideIcon } from "lucide-react";

import { AnimatedCard } from "@/components/magic/animated-card";
import { Card, CardContent } from "@/components/ui/card";

interface OverviewCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone: "blue" | "emerald" | "amber" | "rose";
  delay?: number;
}

const tones = {
  blue: "bg-sky-500/10 text-sky-300",
  emerald: "bg-emerald-500/10 text-emerald-300",
  amber: "bg-amber-500/10 text-amber-300",
  rose: "bg-rose-500/10 text-rose-300",
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
    <Card className="min-h-40 border-0 bg-card/70 shadow-dashboard">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className={`rounded-2xl p-3 ${tones[tone]}`}>
            <Icon className="size-5" />
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  </AnimatedCard>
);
