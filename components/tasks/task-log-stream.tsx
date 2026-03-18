"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Activity, Eraser, Pause, Play } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useTaskLogSubscription } from "@/lib/hooks/use-realtime";
import type { TaskLogLine } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const streamStyles: Record<TaskLogLine["stream"], string> = {
  stdout: "text-slate-100",
  stderr: "text-rose-300",
  system: "text-sky-300",
};

export const TaskLogStream = ({
  taskId,
  initialLogs,
}: {
  taskId: string;
  initialLogs: TaskLogLine[];
}) => {
  const [logs, setLogs] = useState<TaskLogLine[]>(initialLogs);
  const [autoscroll, setAutoscroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useTaskLogSubscription(taskId, (log) => {
    setLogs((current) =>
      current.some((entry) => entry.id === log.id) ? current : [...current, log],
    );
  });

  useEffect(() => {
    if (autoscroll) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [autoscroll, logs]);

  const lineCount = useMemo(() => logs.length, [logs]);

  return (
    <Card className="border-0 bg-card/70 shadow-dashboard">
      <CardHeader className="border-b border-border/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Live log stream</CardTitle>
            <CardDescription>
              Shared websocket updates are appended in real time without forcing a full task refetch.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs text-muted-foreground">
              <Activity className="size-3.5" />
              {realtimeStatus}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/70 px-3 py-2 text-xs text-muted-foreground">
              <Switch checked={autoscroll} onCheckedChange={setAutoscroll} />
              Auto-scroll
            </div>
            <Button variant="outline" size="sm" onClick={() => setLogs([])}>
              <Eraser className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length ? (
          <>
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-3 text-xs text-muted-foreground">
              <span>{lineCount} log lines</span>
              <span className="flex items-center gap-2">
                {autoscroll ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                {autoscroll ? "Streaming to latest line" : "Stream paused"}
              </span>
            </div>
            <ScrollArea className="h-[460px]">
              <div className="space-y-2 p-5 font-mono text-[13px]">
                {logs.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-[96px_minmax(64px,92px)_1fr] gap-3 rounded-xl bg-background/60 px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {format(new Date(line.timestamp), "HH:mm:ss")}
                    </span>
                    <span className="uppercase tracking-[0.18em] text-muted-foreground">
                      {line.stream}
                    </span>
                    <span className={cn("break-words leading-6", streamStyles[line.stream])}>
                      {line.message}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No log lines yet"
              description="The task has not emitted any websocket log events yet. Logs will appear here as execution progresses."
              icon={Activity}
              className="min-h-72"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
