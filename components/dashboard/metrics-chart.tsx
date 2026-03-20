"use client";

import { format } from "date-fns";
import { useState } from "react";
import { Activity, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/empty-state";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MetricPoint } from "@/lib/types";

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

const metricMeta = {
  cpu: {
    label: "CPU usage",
    icon: Cpu,
  },
  memory: {
    label: "Memory pressure",
    icon: MemoryStick,
  },
  disk: {
    label: "Disk utilization",
    icon: HardDrive,
  },
} satisfies Record<
  keyof typeof chartConfig,
  { label: string; icon: typeof Cpu }
>;

export const MetricsChart = ({
  data,
  title = "Resource utilization",
  description = "Recent telemetry samples across connected infrastructure.",
}: {
  data: MetricPoint[];
  title?: string;
  description?: string;
}) => {
  const [metric, setMetric] = useState<keyof typeof chartConfig>("cpu");
  const latestPoint = data.at(-1);
  const MetricIcon = metricMeta[metric].icon;

  return (
    <Card className="border">
      <CardHeader className="border-b border-border/80 bg-muted/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Tabs
            value={metric}
            onValueChange={(value) =>
              setMetric(value as keyof typeof chartConfig)
            }
          >
            <TabsList
              variant="line"
              className="h-auto gap-1 rounded-xl bg-muted/70 p-1"
            >
              {Object.keys(chartConfig).map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="rounded-lg px-3 py-1.5 text-xs"
                >
                  {chartConfig[key as keyof typeof chartConfig].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!data.length ? (
          <EmptyState
            title="No telemetry yet"
            description="Metrics will appear here once nodes begin reporting samples to the metrics pipeline."
            icon={Activity}
            className="min-h-[320px] border-0 bg-transparent"
          />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex items-center gap-3">
                <div className="tone-brand flex size-11 items-center justify-center rounded-xl border">
                  <MetricIcon className="size-4.5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {metricMeta[metric].label}
                  </p>
                  <p className="text-2xl font-semibold tracking-tight">
                    {latestPoint?.[metric as keyof MetricPoint]}%
                  </p>
                </div>
              </div>
              {latestPoint ? (
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {(
                    [
                      ["CPU", latestPoint.cpu],
                      ["Memory", latestPoint.memory],
                      ["Disk", latestPoint.disk],
                    ] as const
                  ).map(([label, value]) => (
                    <div
                      key={label}
                      className="surface-subtle rounded-xl border px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 font-medium">{value}%</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={data}>
                <defs>
                  {Object.keys(chartConfig).map((key) => (
                    <linearGradient
                      key={key}
                      id={`gradient-${key}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="8%"
                        stopColor={`var(--color-${key})`}
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="95%"
                        stopColor={`var(--color-${key})`}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                />
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
                  dataKey={metric}
                  stroke={`var(--color-${metric})`}
                  fill={`url(#gradient-${metric})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
};
