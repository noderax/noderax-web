"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

type TimeDisplayMode = "relative" | "datetime" | "date" | "time";

const subscribe = () => () => undefined;

const formatServerFallback = (date: Date, mode: TimeDisplayMode) => {
  const iso = date.toISOString();

  if (mode === "date") {
    return iso.slice(0, 10);
  }

  if (mode === "time") {
    return `${iso.slice(11, 19)} UTC`;
  }

  if (mode === "relative") {
    return `${iso.slice(0, 16).replace("T", " ")} UTC`;
  }

  return `${iso.slice(0, 19).replace("T", " ")} UTC`;
};

const formatClientValue = (
  date: Date,
  mode: TimeDisplayMode,
  addSuffix: boolean,
) => {
  if (mode === "date") {
    return date.toLocaleDateString();
  }

  if (mode === "time") {
    return date.toLocaleTimeString();
  }

  if (mode === "relative") {
    return formatDistanceToNowStrict(date, {
      addSuffix,
    });
  }

  return date.toLocaleString();
};

export const TimeDisplay = ({
  value,
  mode = "datetime",
  emptyLabel = "N/A",
  addSuffix = true,
  className,
}: {
  value?: string | null;
  mode?: TimeDisplayMode;
  emptyLabel?: string;
  addSuffix?: boolean;
  className?: string;
}) => {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!value) {
    return <span className={className}>{emptyLabel}</span>;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span className={className}>{emptyLabel}</span>;
  }

  return (
    <time
      dateTime={date.toISOString()}
      suppressHydrationWarning
      className={cn(className)}
    >
      {mounted
        ? formatClientValue(date, mode, addSuffix)
        : formatServerFallback(date, mode)}
    </time>
  );
};
