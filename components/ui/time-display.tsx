"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { useSyncExternalStore } from "react";

import {
  DEFAULT_TIMEZONE,
  formatAbsoluteTime,
  type TimeDisplayMode,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

const subscribe = () => () => undefined;

const formatServerFallback = (
  date: Date,
  mode: TimeDisplayMode,
  timezone: string,
) => {
  if (mode === "relative") {
    return formatAbsoluteTime(date, "datetime", timezone);
  }

  return formatAbsoluteTime(date, mode, timezone);
};

const formatClientValue = (
  date: Date,
  mode: TimeDisplayMode,
  addSuffix: boolean,
  timezone: string,
) => {
  if (mode === "date") {
    return formatAbsoluteTime(date, "date", timezone);
  }

  if (mode === "time") {
    return formatAbsoluteTime(date, "time", timezone);
  }

  if (mode === "relative") {
    return formatDistanceToNowStrict(date, {
      addSuffix,
    });
  }

  return formatAbsoluteTime(date, "datetime", timezone);
};

export const TimeDisplay = ({
  value,
  mode = "datetime",
  emptyLabel = "N/A",
  addSuffix = true,
  className,
  timezone,
}: {
  value?: string | null;
  mode?: TimeDisplayMode;
  emptyLabel?: string;
  addSuffix?: boolean;
  className?: string;
  timezone?: string | null;
}) => {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const sessionTimeZone = useAppStore(
    (state) => state.session?.user.timezone ?? DEFAULT_TIMEZONE,
  );

  if (!value) {
    return <span className={className}>{emptyLabel}</span>;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span className={className}>{emptyLabel}</span>;
  }

  const resolvedTimeZone = timezone ?? sessionTimeZone;

  return (
    <time
      dateTime={date.toISOString()}
      suppressHydrationWarning
      className={cn(className)}
    >
      {mounted
        ? formatClientValue(date, mode, addSuffix, resolvedTimeZone)
        : formatServerFallback(date, mode, resolvedTimeZone)}
    </time>
  );
};
