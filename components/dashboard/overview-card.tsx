"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface OverviewCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  tone: "brand" | "success" | "warning" | "danger";
  delay?: number;
}

const tones = {
  brand: {
    icon: "tone-brand",
  },
  success: {
    icon: "tone-success",
  },
  warning: {
    icon: "tone-warning",
  },
  danger: {
    icon: "tone-danger",
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
        <div className={`rounded-xl border p-3 ${tones[tone].icon}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);
