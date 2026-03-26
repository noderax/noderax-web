"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, Layers3, Plus, Sparkles } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/lib/hooks/use-auth-session";
import {
  useCreateBatchScheduledTasks,
  useCreateBatchTasks,
  useCreateScheduledTask,
  useCreateTask,
} from "@/lib/hooks/use-noderax-data";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import type {
  CreateScheduledTaskPayload,
  NodeSummary,
  ScheduledTaskCadence,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const scheduledCadenceOptions = [
  "minutely",
  "custom",
  "hourly",
  "daily",
  "weekly",
] as const;

type DialogTab = "on-demand" | "scheduled" | "multi-tasking";
type MultiTaskMode = "run-now" | "scheduled";

type SharedScheduledValues = {
  name: string;
  command: string;
  cadence: ScheduledTaskCadence;
  minuteText: string;
  intervalMinutesText: string;
  timeText: string;
  dayOfWeek: string;
};

const validatePayloadText = (
  value: string,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["payloadText"],
) => {
  try {
    const parsed = JSON.parse(value);

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: "Payload must be a JSON object.",
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message: "Payload must be valid JSON.",
    });
  }
};

const validateScheduledFields = (
  value: SharedScheduledValues,
  ctx: z.RefinementCtx,
) => {
  if (value.name.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["name"],
      message: "Schedule name must be at least 2 characters.",
    });
  }

  if (!value.command.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["command"],
      message: "Command is required.",
    });
  }

  if (value.cadence === "minutely") {
    return;
  }

  if (value.cadence === "custom") {
    const intervalMinutes = Number.parseInt(value.intervalMinutesText, 10);

    if (
      !Number.isInteger(intervalMinutes) ||
      intervalMinutes < 1 ||
      intervalMinutes > 10080
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["intervalMinutesText"],
        message: "Interval must be between 1 and 10080 minutes.",
      });
    }
    return;
  }

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
      message: "Enter a valid time.",
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
};

const buildScheduledMutationPayload = (
  values: SharedScheduledValues,
): Omit<CreateScheduledTaskPayload, "nodeId"> => {
  if (values.cadence === "minutely") {
    return {
      name: values.name.trim(),
      command: values.command.trim(),
      cadence: "minutely",
      minute: 0,
    };
  }

  if (values.cadence === "custom") {
    return {
      name: values.name.trim(),
      command: values.command.trim(),
      cadence: "custom",
      minute: 0,
      intervalMinutes: Number.parseInt(values.intervalMinutesText, 10),
    };
  }

  if (values.cadence === "hourly") {
    return {
      name: values.name.trim(),
      command: values.command.trim(),
      cadence: "hourly",
      minute: Number.parseInt(values.minuteText, 10),
    };
  }

  const [hour, minute] = values.timeText.split(":").map(Number);

  return {
    name: values.name.trim(),
    command: values.command.trim(),
    cadence: values.cadence,
    minute,
    hour,
    ...(values.cadence === "weekly"
      ? { dayOfWeek: Number.parseInt(values.dayOfWeek, 10) }
      : {}),
  };
};

const parsePayloadObject = (payloadText: string) =>
  JSON.parse(payloadText) as Record<string, unknown>;

const createTaskSchema = z.object({
  nodeId: z.string().min(1, "Select a node."),
  type: z.string().min(2, "Task type must be at least 2 characters."),
  payloadText: z.string().superRefine((value, ctx) => {
    validatePayloadText(value, ctx);
  }),
});

const scheduledTaskSchema = z
  .object({
    nodeId: z.string().min(1, "Select a node."),
    name: z.string(),
    command: z.string(),
    cadence: z.enum(scheduledCadenceOptions),
    minuteText: z.string(),
    intervalMinutesText: z.string(),
    timeText: z.string(),
    dayOfWeek: z.string(),
  })
  .superRefine((value, ctx) => {
    validateScheduledFields(value, ctx);
  });

const multiTaskSchema = z
  .object({
    nodeIds: z.array(z.string()).min(1, "Select at least one node."),
    mode: z.enum(["run-now", "scheduled"]),
    type: z.string(),
    payloadText: z.string(),
    name: z.string(),
    command: z.string(),
    cadence: z.enum(scheduledCadenceOptions),
    minuteText: z.string(),
    intervalMinutesText: z.string(),
    timeText: z.string(),
    dayOfWeek: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === "run-now") {
      if (value.type.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["type"],
          message: "Task type must be at least 2 characters.",
        });
      }

      validatePayloadText(value.payloadText, ctx);
      return;
    }

    validateScheduledFields(value, ctx);
  });

type CreateTaskValues = z.infer<typeof createTaskSchema>;
type ScheduledTaskValues = z.infer<typeof scheduledTaskSchema>;
type MultiTaskValues = z.infer<typeof multiTaskSchema>;

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
  intervalMinutesText: "5",
  timeText: "00:00",
  dayOfWeek: "1",
};

const defaultMultiValues: MultiTaskValues = {
  nodeIds: [],
  mode: "run-now",
  type: "",
  payloadText: "{}",
  name: "",
  command: "",
  cadence: "hourly",
  minuteText: "0",
  intervalMinutesText: "5",
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

export const CreateTaskDialog = ({
  nodes,
  defaultTab = "on-demand",
  triggerLabel = "Create task",
  title = "Create task",
  description = "Queue a one-off task, configure a recurring shell command, or target multiple nodes in your saved timezone.",
}: {
  nodes: NodeSummary[];
  defaultTab?: DialogTab;
  triggerLabel?: string;
  title?: string;
  description?: string;
}) => {
  const authQuery = useAuthSession();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<DialogTab>(defaultTab);
  const [taskSubmissionError, setTaskSubmissionError] = useState<string | null>(
    null,
  );
  const [scheduleSubmissionError, setScheduleSubmissionError] = useState<
    string | null
  >(null);
  const [multiSubmissionError, setMultiSubmissionError] = useState<
    string | null
  >(null);
  const createTaskMutation = useCreateTask();
  const createScheduledTaskMutation = useCreateScheduledTask();
  const createBatchTaskMutation = useCreateBatchTasks();
  const createBatchScheduledTaskMutation = useCreateBatchScheduledTasks();
  const timezone = authQuery.session?.user.timezone ?? DEFAULT_TIMEZONE;

  const taskForm = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: defaultTaskValues,
  });
  const scheduledForm = useForm<ScheduledTaskValues>({
    resolver: zodResolver(scheduledTaskSchema),
    defaultValues: defaultScheduledValues,
  });
  const multiForm = useForm<MultiTaskValues>({
    resolver: zodResolver(multiTaskSchema),
    defaultValues: defaultMultiValues,
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
  const multiNodeIdsValue = useWatch({
    control: multiForm.control,
    name: "nodeIds",
  });
  const multiModeValue = useWatch({
    control: multiForm.control,
    name: "mode",
  });
  const multiCadenceValue = useWatch({
    control: multiForm.control,
    name: "cadence",
  });
  const multiDayOfWeekValue = useWatch({
    control: multiForm.control,
    name: "dayOfWeek",
  });

  const selectedTaskNode = nodes.find((node) => node.id === taskNodeIdValue);
  const selectedScheduleNode = nodes.find(
    (node) => node.id === scheduleNodeIdValue,
  );
  const selectedMultiNodes = useMemo(
    () =>
      nodes.filter((node) => (multiNodeIdsValue ?? []).includes(node.id)),
    [multiNodeIdsValue, nodes],
  );
  const selectedMultiNodeCount = selectedMultiNodes.length;
  const isMultiSubmitting =
    multiModeValue === "scheduled"
      ? createBatchScheduledTaskMutation.isPending
      : createBatchTaskMutation.isPending;

  const resetDialogState = () => {
    taskForm.reset(defaultTaskValues);
    scheduledForm.reset(defaultScheduledValues);
    multiForm.reset(defaultMultiValues);
    setTaskSubmissionError(null);
    setScheduleSubmissionError(null);
    setMultiSubmissionError(null);
    setTab(defaultTab);
  };

  const setMultiNodeIds = (nodeIds: string[]) => {
    multiForm.setValue("nodeIds", Array.from(new Set(nodeIds)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleMultiNode = (nodeId: string) => {
    const currentNodeIds = multiForm.getValues("nodeIds");

    if (currentNodeIds.includes(nodeId)) {
      setMultiNodeIds(currentNodeIds.filter((value) => value !== nodeId));
      return;
    }

    setMultiNodeIds([...currentNodeIds, nodeId]);
  };

  const onSubmitTask = taskForm.handleSubmit(async (values) => {
    setTaskSubmissionError(null);

    try {
      await createTaskMutation.mutateAsync({
        nodeId: values.nodeId,
        type: values.type.trim(),
        payload: parsePayloadObject(values.payloadText),
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
      await createScheduledTaskMutation.mutateAsync({
        nodeId: values.nodeId,
        ...buildScheduledMutationPayload(values),
      });
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

  const onSubmitMultiTask = multiForm.handleSubmit(async (values) => {
    setMultiSubmissionError(null);

    try {
      if (values.mode === "scheduled") {
        await createBatchScheduledTaskMutation.mutateAsync({
          nodeIds: values.nodeIds,
          ...buildScheduledMutationPayload(values),
        });
      } else {
        await createBatchTaskMutation.mutateAsync({
          nodeIds: values.nodeIds,
          type: values.type.trim(),
          payload: parsePayloadObject(values.payloadText),
        });
      }

      resetDialogState();
      setOpen(false);
    } catch (error) {
      setMultiSubmissionError(
        error instanceof Error
          ? error.message
          : "Unable to create the multi-node action right now.",
      );
    }
  });

  const multiSubmitLabel =
    multiModeValue === "scheduled"
      ? isMultiSubmitting
        ? "Creating..."
        : selectedMultiNodeCount > 0
          ? `Create ${selectedMultiNodeCount} schedule${selectedMultiNodeCount === 1 ? "" : "s"}`
          : "Create schedules"
      : isMultiSubmitting
        ? "Creating..."
        : selectedMultiNodeCount > 0
          ? `Queue ${selectedMultiNodeCount} task${selectedMultiNodeCount === 1 ? "" : "s"}`
          : "Queue tasks";

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
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as DialogTab)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="on-demand">
              <Sparkles className="size-4" />
              On-demand
            </TabsTrigger>
            <TabsTrigger value="scheduled">
              <CalendarClock className="size-4" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="multi-tasking">
              <Layers3 className="size-4" />
              Multi Tasking
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
                      <SelectItem value="minutely">Every minute</SelectItem>
                      <SelectItem value="custom">Custom interval</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {cadenceValue === "minutely" ? (
                  <div className="surface-subtle flex items-center rounded-[16px] border px-4 py-3 text-sm text-muted-foreground">
                    This schedule runs every minute.
                  </div>
                ) : cadenceValue === "custom" ? (
                  <div className="space-y-2">
                    <Label htmlFor="schedule-interval-minutes">
                      Interval in minutes
                    </Label>
                    <Input
                      id="schedule-interval-minutes"
                      type="number"
                      min={1}
                      max={10080}
                      placeholder="5"
                      aria-invalid={Boolean(
                        scheduledForm.formState.errors.intervalMinutesText,
                      )}
                      {...scheduledForm.register("intervalMinutesText")}
                    />
                    {scheduledForm.formState.errors.intervalMinutesText ? (
                      <p className="text-sm text-tone-danger">
                        {
                          scheduledForm.formState.errors.intervalMinutesText
                            .message
                        }
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Example: 5 for every 5 minutes, 7 for every 7 minutes.
                      </p>
                    )}
                  </div>
                ) : cadenceValue === "hourly" ? (
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
                    <Label htmlFor="schedule-time">Local time</Label>
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
                New schedules follow your saved timezone{" "}
                <span className="font-medium text-foreground">{timezone}</span>.
                If you change it later in settings, existing schedules move with
                that preference.
              </div>

              {scheduleSubmissionError ? (
                <p className="text-sm text-tone-danger">{scheduleSubmissionError}</p>
              ) : null}

              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={createScheduledTaskMutation.isPending}>
                  {createScheduledTaskMutation.isPending
                    ? "Creating..."
                    : "Create schedule"}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="multi-tasking" className="mt-0">
            <form className="space-y-4" onSubmit={onSubmitMultiTask}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <Label>Target nodes</Label>
                    <p className="text-xs text-muted-foreground">
                      Pick one or more nodes to run the same action from a single place.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMultiNodeIds(nodes.map((node) => node.id))}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setMultiNodeIds([])}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-56 rounded-[20px] border">
                  <div className="grid gap-2 p-3 sm:grid-cols-2">
                    {nodes.map((node) => {
                      const isSelected = selectedMultiNodes.some(
                        (selectedNode) => selectedNode.id === node.id,
                      );

                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => toggleMultiNode(node.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            "text-left rounded-[18px] border px-4 py-3 transition-colors",
                            isSelected
                              ? "border-primary/50 bg-primary/8"
                              : "control-surface hover:border-border/80 hover:bg-[var(--control-hover)]",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {node.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {node.hostname}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em]",
                                isSelected
                                  ? "bg-primary/14 text-primary"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {isSelected ? "Selected" : node.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {node.os} / {node.arch}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>

                {multiForm.formState.errors.nodeIds ? (
                  <p className="text-sm text-tone-danger">
                    {multiForm.formState.errors.nodeIds.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {selectedMultiNodeCount > 0
                      ? `${selectedMultiNodeCount} ${selectedMultiNodeCount === 1 ? "node is" : "nodes are"} selected.`
                      : "No nodes selected yet."}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-2">
                  <Label htmlFor="multi-mode">Mode</Label>
                  <Select
                    value={multiModeValue}
                    onValueChange={(value) =>
                      multiForm.setValue(
                        "mode",
                        (value ?? "run-now") as MultiTaskMode,
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      )
                    }
                  >
                    <SelectTrigger id="multi-mode" className="w-full">
                      <SelectValue placeholder="Choose a mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="run-now">Run now on all selected nodes</SelectItem>
                      <SelectItem value="scheduled">
                        Create the same schedule on all selected nodes
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="surface-subtle rounded-[18px] border px-4 py-3 text-sm text-muted-foreground">
                  {multiModeValue === "scheduled" ? (
                    <>
                      Batch schedules follow your saved timezone{" "}
                      <span className="font-medium text-foreground">{timezone}</span>.
                    </>
                  ) : (
                    <>
                      One submission queues the same task definition for every selected node.
                    </>
                  )}
                </div>
              </div>

              {multiModeValue === "run-now" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="multi-task-type">Task type</Label>
                    <Input
                      id="multi-task-type"
                      placeholder="shell.exec"
                      aria-invalid={Boolean(multiForm.formState.errors.type)}
                      {...multiForm.register("type")}
                    />
                    {multiForm.formState.errors.type ? (
                      <p className="text-sm text-tone-danger">
                        {multiForm.formState.errors.type.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="multi-task-payload">Payload JSON</Label>
                    <Textarea
                      id="multi-task-payload"
                      className="min-h-44 font-mono text-xs"
                      aria-invalid={Boolean(multiForm.formState.errors.payloadText)}
                      {...multiForm.register("payloadText")}
                    />
                    {multiForm.formState.errors.payloadText ? (
                      <p className="text-sm text-tone-danger">
                        {multiForm.formState.errors.payloadText.message}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="multi-schedule-name">Schedule name</Label>
                    <Input
                      id="multi-schedule-name"
                      placeholder="Daily hostname check"
                      aria-invalid={Boolean(multiForm.formState.errors.name)}
                      {...multiForm.register("name")}
                    />
                    {multiForm.formState.errors.name ? (
                      <p className="text-sm text-tone-danger">
                        {multiForm.formState.errors.name.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="multi-schedule-command">Command</Label>
                    <Textarea
                      id="multi-schedule-command"
                      placeholder="hostname"
                      className="min-h-28 font-mono text-xs"
                      aria-invalid={Boolean(multiForm.formState.errors.command)}
                      {...multiForm.register("command")}
                    />
                    {multiForm.formState.errors.command ? (
                      <p className="text-sm text-tone-danger">
                        {multiForm.formState.errors.command.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="multi-schedule-cadence">Cadence</Label>
                      <Select
                        value={multiCadenceValue}
                        onValueChange={(value) =>
                          multiForm.setValue(
                            "cadence",
                            (value ?? "hourly") as ScheduledTaskValues["cadence"],
                            {
                              shouldDirty: true,
                              shouldValidate: true,
                            },
                          )
                        }
                      >
                        <SelectTrigger id="multi-schedule-cadence" className="w-full">
                          <SelectValue placeholder="Select cadence" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minutely">Every minute</SelectItem>
                          <SelectItem value="custom">Custom interval</SelectItem>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {multiCadenceValue === "minutely" ? (
                      <div className="surface-subtle flex items-center rounded-[16px] border px-4 py-3 text-sm text-muted-foreground">
                        This schedule runs every minute on each selected node.
                      </div>
                    ) : multiCadenceValue === "custom" ? (
                      <div className="space-y-2">
                        <Label htmlFor="multi-schedule-interval">
                          Interval in minutes
                        </Label>
                        <Input
                          id="multi-schedule-interval"
                          type="number"
                          min={1}
                          max={10080}
                          placeholder="5"
                          aria-invalid={Boolean(
                            multiForm.formState.errors.intervalMinutesText,
                          )}
                          {...multiForm.register("intervalMinutesText")}
                        />
                        {multiForm.formState.errors.intervalMinutesText ? (
                          <p className="text-sm text-tone-danger">
                            {
                              multiForm.formState.errors.intervalMinutesText
                                .message
                            }
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Example: 5 for every 5 minutes, 7 for every 7 minutes.
                          </p>
                        )}
                      </div>
                    ) : multiCadenceValue === "hourly" ? (
                      <div className="space-y-2">
                        <Label htmlFor="multi-schedule-minute">Minute</Label>
                        <Input
                          id="multi-schedule-minute"
                          type="number"
                          min={0}
                          max={59}
                          placeholder="15"
                          aria-invalid={Boolean(
                            multiForm.formState.errors.minuteText,
                          )}
                          {...multiForm.register("minuteText")}
                        />
                        {multiForm.formState.errors.minuteText ? (
                          <p className="text-sm text-tone-danger">
                            {multiForm.formState.errors.minuteText.message}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="multi-schedule-time">Local time</Label>
                        <Input
                          id="multi-schedule-time"
                          type="time"
                          aria-invalid={Boolean(multiForm.formState.errors.timeText)}
                          {...multiForm.register("timeText")}
                        />
                        {multiForm.formState.errors.timeText ? (
                          <p className="text-sm text-tone-danger">
                            {multiForm.formState.errors.timeText.message}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {multiCadenceValue === "weekly" ? (
                    <div className="space-y-2">
                      <Label htmlFor="multi-schedule-day">Day of week</Label>
                      <Select
                        value={multiDayOfWeekValue}
                        onValueChange={(value) =>
                          multiForm.setValue("dayOfWeek", value ?? "1", {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger id="multi-schedule-day" className="w-full">
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
                      {multiForm.formState.errors.dayOfWeek ? (
                        <p className="text-sm text-tone-danger">
                          {multiForm.formState.errors.dayOfWeek.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}

              {multiSubmissionError ? (
                <p className="text-sm text-tone-danger">{multiSubmissionError}</p>
              ) : null}

              <DialogFooter>
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isMultiSubmitting}>
                  {multiSubmitLabel}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
