"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/empty-state";
import { GridPattern } from "@/components/magic/grid-pattern";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MetricPoint } from "@/lib/types";
import { Activity } from "lucide-react";

const chartConfig = {
  cpu: {
    label: "CPU",
    color: "var(--color-chart-1)",
  },
  memory: {
    label: "Memory",
    color: "var(--color-chart-2)",
  },
  disk: {
    label: "Disk",
    color: "var(--color-chart-3)",
  },
} satisfies ChartConfig;

const labels: Record<keyof typeof chartConfig, string> = {
  cpu: "CPU usage",
  memory: "Memory pressure",
  disk: "Disk utilization",
};

export const MetricsChart = ({
  data,
  title = "Resource utilization",
  description = "24-hour blended load across connected infrastructure.",
}: {
  data: MetricPoint[];
  title?: string;
  description?: string;
}) => {
  const [metric, setMetric] = useState<keyof typeof chartConfig>("cpu");
  const latestPoint = data.at(-1);

  return (
    <Card className="surface-panel relative overflow-hidden border">
      <GridPattern className="opacity-12" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(156,28,41,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_26%)]" />
      <CardHeader className="relative z-10 border-b border-border/60">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {latestPoint ? (
            <div className="grid grid-cols-3 gap-2">
              {([
                ["CPU", latestPoint.cpu],
                ["Memory", latestPoint.memory],
                ["Disk", latestPoint.disk],
              ] as const).map(([label, value]) => (
                <div key={label} className="meta-chip rounded-2xl border px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-semibold">{value}%</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="relative z-10 space-y-5">
        {!data.length ? (
          <EmptyState
            title="No telemetry yet"
            description="Metrics will appear here once nodes begin reporting samples to the metrics pipeline."
            icon={Activity}
            className="min-h-[320px] border-0 bg-transparent shadow-none"
          />
        ) : (
        <Tabs value={metric} onValueChange={(value) => setMetric(value as keyof typeof chartConfig)}>
          <TabsList variant="line" className="w-full justify-start gap-2 rounded-none bg-transparent p-0">
            {Object.keys(chartConfig).map((key) => (
              <TabsTrigger key={key} value={key} className="rounded-full px-3">
                {labels[key as keyof typeof chartConfig]}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.keys(chartConfig).map((key) => (
            <TabsContent key={key} value={key} className="mt-0">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current</p>
                  <p className="mt-1 text-3xl font-semibold">
                    {latestPoint?.[key as keyof MetricPoint]}%
                  </p>
                </div>
                <p className="max-w-xs text-sm text-muted-foreground sm:text-right">
                  Streaming telemetry refreshes automatically and is also reconciled through query invalidation.
                </p>
              </div>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={`var(--color-${key})`}
                        stopOpacity={0.45}
                      />
                      <stop
                        offset="95%"
                        stopColor={`var(--color-${key})`}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => format(new Date(value), "HH:mm")}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    axisLine={false}
                    width={42}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono tabular-nums">{value}%</span>
                        )}
                        labelFormatter={(value) =>
                          format(new Date(String(value)), "MMM d, HH:mm")
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey={key}
                    stroke={`var(--color-${key})`}
                    fill={`url(#gradient-${key})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </TabsContent>
          ))}
        </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
