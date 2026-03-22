"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { Activity, Eraser, Pause, Play, TerminalSquare } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { SectionPanel } from "@/components/ui/section-panel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTaskLogs } from "@/lib/hooks/use-noderax-data";
import type { TaskLogLevel, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const streamStyles: Record<TaskLogLevel, string> = {
  stdout: "text-foreground",
  stderr: "text-tone-danger",
  info: "text-tone-brand",
  error: "text-tone-danger",
};

export const TaskLogStream = ({
  taskId,
  taskStatus,
}: {
  taskId: string;
  taskStatus: TaskStatus;
}) => {
  const [autoscroll, setAutoscroll] = useState(true);
  const [terminalMode, setTerminalMode] = useState(false);
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const realtimeStatus = useAppStore((state) => state.realtimeStatus);
  const logsQuery = useTaskLogs(taskId, {
    limit: 100,
    liveForStatus: taskStatus,
  });

  const logs = useMemo(
    () =>
      (logsQuery.data ?? []).filter((log) =>
        clearedAt ? log.timestamp > clearedAt : true,
      ),
    [clearedAt, logsQuery.data],
  );

  useEffect(() => {
    if (autoscroll) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [autoscroll, logs]);

  return (
    <SectionPanel
      eyebrow="Logs"
      title="Live log stream"
      description="Task updates arrive via realtime events, while persisted logs are reconciled from HTTP polling so execution continues even during temporary realtime interruptions."
      action={
        <>
          <div className="flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-xs text-muted-foreground">
            <Activity className="size-3.5" />
            {realtimeStatus}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-xs text-muted-foreground">
            <Switch checked={autoscroll} onCheckedChange={setAutoscroll} />
            Auto-scroll
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/80 px-3 py-2 text-xs text-muted-foreground">
            <Switch checked={terminalMode} onCheckedChange={setTerminalMode} />
            Terminal view
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearedAt(new Date().toISOString())}
          >
            <Eraser className="size-4" />
            Clear
          </Button>
        </>
      }
      contentClassName="p-0"
    >
      {logsQuery.isPending ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-11 animate-pulse rounded-[16px] bg-muted/60"
            />
          ))}
        </div>
      ) : logs.length ? (
        <>
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3 text-xs text-muted-foreground">
            <span>{logs.length} log lines</span>
            <span className="flex items-center gap-2">
              {autoscroll ? (
                <Play className="size-3.5" />
              ) : (
                <Pause className="size-3.5" />
              )}
              {taskStatus === "running"
                ? "Polling active"
                : "Awaiting new task activity"}
            </span>
          </div>
          <ScrollArea className="h-[460px]">
            {terminalMode ? (
              <div className="bg-[#0e0e0e] min-h-full">
                <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-[#0e0e0e]/95 px-5 py-3 backdrop-blur">
                  <TerminalSquare className="size-4 text-emerald-400" />
                  <span className="font-mono text-xs font-medium text-emerald-400">
                    Terminal Window
                  </span>
                </div>
                <div className="p-5">
                  <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-[#a8ff60] selection:bg-emerald-900">
                    {logs.map((line) => line.message).join("\n")}
                  </pre>
                  <div ref={bottomRef} className="pt-2" />
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-5 font-mono text-[13px]">
                {logs.map((line) => (
                  <div
                    key={line.id}
                    className="surface-subtle grid grid-cols-[84px_72px_1fr] gap-3 rounded-[14px] border px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {format(new Date(line.timestamp), "HH:mm:ss")}
                    </span>
                    <span className="uppercase tracking-[0.16em] text-muted-foreground">
                      {line.level}
                    </span>
                    <span
                      className={cn(
                        "break-words leading-6",
                        streamStyles[line.level],
                      )}
                    >
                      {line.message}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </ScrollArea>
        </>
      ) : (
        <div className="p-6">
          <EmptyState
            title="No log lines yet"
            description="This task has not emitted persisted log entries yet. New lines will appear automatically while the task is active."
            icon={Activity}
            className="min-h-72"
          />
        </div>
      )}
    </SectionPanel>
  );
};
