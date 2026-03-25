"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Plus, Sparkles } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateScheduledTask,
  useCreateTask,
} from "@/lib/hooks/use-noderax-data";
import type { NodeSummary } from "@/lib/types";

const createTaskSchema = z.object({
  nodeId: z.string().min(1, "Select a node."),
  type: z.string().min(2, "Task type must be at least 2 characters."),
  payloadText: z.string().superRefine((value, ctx) => {
    try {
      const parsed = JSON.parse(value);

      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Payload must be a JSON object.",
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Payload must be valid JSON.",
      });
    }
  }),
});

const scheduledTaskSchema = z
  .object({
    nodeId: z.string().min(1, "Select a node."),
    name: z.string().trim().min(2, "Schedule name must be at least 2 characters."),
    command: z.string().trim().min(1, "Command is required."),
    cadence: z.enum(["hourly", "daily", "weekly"]),
    minuteText: z.string(),
    timeText: z.string(),
    dayOfWeek: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.cadence === "hourly") {
      const minute = Number.parseInt(value.minuteText, 10);

      if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minuteText"],
          message: "Minute must be between 0 and 59.",
        });
      }
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(value.timeText)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeText"],
        message: "Enter a valid time in HH:MM format.",
      });
      return;
    }

    const [hourValue, minuteValue] = value.timeText.split(":").map(Number);
    if (
      !Number.isInteger(hourValue) ||
      hourValue < 0 ||
      hourValue > 23 ||
      !Number.isInteger(minuteValue) ||
      minuteValue < 0 ||
      minuteValue > 59
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeText"],
        message: "Enter a valid UTC time.",
      });
    }

    if (value.cadence === "weekly") {
      const dayOfWeek = Number.parseInt(value.dayOfWeek, 10);
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dayOfWeek"],
          message: "Select a valid day of week.",
        });
      }
    }
  });

type CreateTaskValues = z.infer<typeof createTaskSchema>;
type ScheduledTaskValues = z.infer<typeof scheduledTaskSchema>;

const defaultTaskValues: CreateTaskValues = {
  nodeId: "",
  type: "",
  payloadText: "{}",
};

const defaultScheduledValues: ScheduledTaskValues = {
  nodeId: "",
  name: "",
  command: "",
  cadence: "hourly",
  minuteText: "0",
  timeText: "00:00",
  dayOfWeek: "1",
};

const WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

export const CreateTaskDialog = ({ nodes }: { nodes: NodeSummary[] }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"on-demand" | "scheduled">("on-demand");
  const [taskSubmissionError, setTaskSubmissionError] = useState<string | null>(null);
  const [scheduleSubmissionError, setScheduleSubmissionError] = useState<string | null>(null);
  const createTaskMutation = useCreateTask();
  const createScheduledTaskMutation = useCreateScheduledTask();
  const taskForm = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: defaultTaskValues,
  });
  const scheduledForm = useForm<ScheduledTaskValues>({
    resolver: zodResolver(scheduledTaskSchema),
    defaultValues: defaultScheduledValues,
  });

  const taskNodeIdValue = useWatch({
    control: taskForm.control,
    name: "nodeId",
  });
  const scheduleNodeIdValue = useWatch({
    control: scheduledForm.control,
    name: "nodeId",
  });
  const cadenceValue = useWatch({
    control: scheduledForm.control,
    name: "cadence",
  });
  const scheduleDayOfWeekValue = useWatch({
    control: scheduledForm.control,
    name: "dayOfWeek",
  });
  const selectedTaskNode = nodes.find((node) => node.id === taskNodeIdValue);
  const selectedScheduleNode = nodes.find((node) => node.id === scheduleNodeIdValue);

  const resetDialogState = () => {
    taskForm.reset(defaultTaskValues);
    scheduledForm.reset(defaultScheduledValues);
    setTaskSubmissionError(null);
    setScheduleSubmissionError(null);
    setTab("on-demand");
  };

  const onSubmitTask = taskForm.handleSubmit(async (values) => {
    setTaskSubmissionError(null);

    try {
      await createTaskMutation.mutateAsync({
        nodeId: values.nodeId,
        type: values.type.trim(),
        payload: JSON.parse(values.payloadText) as Record<string, unknown>,
      });
      resetDialogState();
      setOpen(false);
    } catch (error) {
      setTaskSubmissionError(
        error instanceof Error ? error.message : "Unable to create the task right now.",
      );
    }
  });

  const onSubmitScheduledTask = scheduledForm.handleSubmit(async (values) => {
    setScheduleSubmissionError(null);

    try {
      if (values.cadence === "hourly") {
        await createScheduledTaskMutation.mutateAsync({
          nodeId: values.nodeId,
          name: values.name.trim(),
          command: values.command.trim(),
          cadence: "hourly",
          minute: Number.parseInt(values.minuteText, 10),
          timezone: "UTC",
        });
      } else {
        const [hour, minute] = values.timeText.split(":").map(Number);

        await createScheduledTaskMutation.mutateAsync({
          nodeId: values.nodeId,
          name: values.name.trim(),
          command: values.command.trim(),
          cadence: values.cadence,
          minute,
          hour,
          ...(values.cadence === "weekly"
            ? { dayOfWeek: Number.parseInt(values.dayOfWeek, 10) }
            : {}),
          timezone: "UTC",
        });
      }

      resetDialogState();
      setOpen(false);
    } catch (error) {
      setScheduleSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to create the scheduled task right now.",
      );
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDialogState();
        }
      }}
    >
      <DialogTrigger render={<Button size="sm" disabled={!nodes.length} />}>
        <Plus className="size-4" />
        Create task
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Queue a one-off task or configure a recurring shell command in UTC.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="on-demand">
              <Sparkles className="size-4" />
              On-demand
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarClock className="size-4" />
              Scheduled
            </TabsTrigger>
          </TabsList>

          <TabsContent value="on-demand" className="mt-0">
            <form className="space-y-4" onSubmit={onSubmitTask}>
              <div className="space-y-2">
                <Label htmlFor="task-node">Node</Label>
                <Select
                  value={taskNodeIdValue}
                  onValueChange={(value) =>
                    taskForm.setValue("nodeId", value ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="task-node" className="w-full">
                    <SelectValue placeholder="Select a node">
                      {selectedTaskNode
                        ? `${selectedTaskNode.name} (${selectedTaskNode.hostname})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name} ({node.hostname})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {taskForm.formState.errors.nodeId ? (
                  <p className="text-sm text-tone-danger">
                    {taskForm.formState.errors.nodeId.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-type">Task type</Label>
                <Input
                  id="task-type"
                  placeholder="shell.exec"
                  aria-invalid={Boolean(taskForm.formState.errors.type)}
                  {...taskForm.register("type")}
                />
                {taskForm.formState.errors.type ? (
                  <p className="text-sm text-tone-danger">
                    {taskForm.formState.errors.type.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-payload">Payload JSON</Label>
                <Textarea
                  id="task-payload"
                  className="min-h-44 font-mono text-xs"
                  aria-invalid={Boolean(taskForm.formState.errors.payloadText)}
                  {...taskForm.register("payloadText")}
                />
                {taskForm.formState.errors.payloadText ? (
                  <p className="text-sm text-tone-danger">
                    {taskForm.formState.errors.payloadText.message}
                  </p>
                ) : null}
              </div>

              {taskSubmissionError ? (
                <p className="text-sm text-tone-danger">{taskSubmissionError}</p>
              ) : null}

              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Queue task"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-0">
            <form className="space-y-4" onSubmit={onSubmitScheduledTask}>
              <div className="space-y-2">
                <Label htmlFor="schedule-node">Node</Label>
                <Select
                  value={scheduleNodeIdValue}
                  onValueChange={(value) =>
                    scheduledForm.setValue("nodeId", value ?? "", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="schedule-node" className="w-full">
                    <SelectValue placeholder="Select a node">
                      {selectedScheduleNode
                        ? `${selectedScheduleNode.name} (${selectedScheduleNode.hostname})`
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {nodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name} ({node.hostname})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scheduledForm.formState.errors.nodeId ? (
                  <p className="text-sm text-tone-danger">
                    {scheduledForm.formState.errors.nodeId.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-name">Schedule name</Label>
                <Input
                  id="schedule-name"
                  placeholder="Daily hostname check"
                  aria-invalid={Boolean(scheduledForm.formState.errors.name)}
                  {...scheduledForm.register("name")}
                />
                {scheduledForm.formState.errors.name ? (
                  <p className="text-sm text-tone-danger">
                    {scheduledForm.formState.errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule-command">Command</Label>
                <Textarea
                  id="schedule-command"
                  placeholder="hostname"
                  className="min-h-28 font-mono text-xs"
                  aria-invalid={Boolean(scheduledForm.formState.errors.command)}
                  {...scheduledForm.register("command")}
                />
                {scheduledForm.formState.errors.command ? (
                  <p className="text-sm text-tone-danger">
                    {scheduledForm.formState.errors.command.message}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schedule-cadence">Cadence</Label>
                  <Select
                    value={cadenceValue}
                    onValueChange={(value) =>
                      scheduledForm.setValue(
                        "cadence",
                        (value ?? "hourly") as ScheduledTaskValues["cadence"],
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <SelectTrigger id="schedule-cadence" className="w-full">
                      <SelectValue placeholder="Select cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {cadenceValue === "hourly" ? (
                  <div className="space-y-2">
                    <Label htmlFor="schedule-minute">Minute</Label>
                    <Input
                      id="schedule-minute"
                      type="number"
                      min={0}
                      max={59}
                      placeholder="15"
                      aria-invalid={Boolean(scheduledForm.formState.errors.minuteText)}
                      {...scheduledForm.register("minuteText")}
                    />
                    {scheduledForm.formState.errors.minuteText ? (
                      <p className="text-sm text-tone-danger">
                        {scheduledForm.formState.errors.minuteText.message}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="schedule-time">UTC time</Label>
                    <Input
                      id="schedule-time"
                      type="time"
                      aria-invalid={Boolean(scheduledForm.formState.errors.timeText)}
                      {...scheduledForm.register("timeText")}
                    />
                    {scheduledForm.formState.errors.timeText ? (
                      <p className="text-sm text-tone-danger">
                        {scheduledForm.formState.errors.timeText.message}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {cadenceValue === "weekly" ? (
                <div className="space-y-2">
                  <Label htmlFor="schedule-day">Day of week</Label>
                  <Select
                    value={scheduleDayOfWeekValue}
                    onValueChange={(value) =>
                      scheduledForm.setValue("dayOfWeek", value ?? "1", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="schedule-day" className="w-full">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scheduledForm.formState.errors.dayOfWeek ? (
                    <p className="text-sm text-tone-danger">
                      {scheduledForm.formState.errors.dayOfWeek.message}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                Scheduled runs are stored and evaluated in <span className="font-medium text-foreground">UTC</span>.
              </div>

              {scheduleSubmissionError ? (
                <p className="text-sm text-tone-danger">{scheduleSubmissionError}</p>
              ) : null}

              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={createScheduledTaskMutation.isPending}>
                  {createScheduledTaskMutation.isPending ? "Creating..." : "Create schedule"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
