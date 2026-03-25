"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_TIMEZONE,
  getBrowserTimeZone,
  getSupportedTimeZones,
} from "@/lib/timezone";
import { cn } from "@/lib/utils";

export const TimezonePicker = ({
  value,
  onValueChange,
  disabled,
}: {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const timezones = useMemo(() => getSupportedTimeZones(), []);

  const featuredTimeZones = useMemo(
    () =>
      Array.from(
        new Set([value, browserTimeZone, DEFAULT_TIMEZONE].filter(Boolean)),
      ),
    [browserTimeZone, value],
  );

  const filteredTimeZones = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return timezones.filter((timezone) =>
      normalizedQuery ? timezone.toLowerCase().includes(normalizedQuery) : true,
    );
  }, [query, timezones]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <DialogTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
          />
        }
      >
        <span className="truncate">{value || DEFAULT_TIMEZONE}</span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choose timezone</DialogTitle>
          <DialogDescription>
            Search IANA timezones and store one preference for all absolute
            timestamps in the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search timezone, for example Europe/Istanbul"
              className="pl-9"
            />
          </div>

          {!query ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Quick picks
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {featuredTimeZones.map((timezone) => (
                  <button
                    key={timezone}
                    type="button"
                    className={cn(
                      "surface-subtle flex items-center justify-between rounded-[18px] border px-4 py-3 text-left text-sm transition-colors hover:border-border hover:bg-muted/60",
                      value === timezone && "tone-brand",
                    )}
                    onClick={() => {
                      onValueChange(timezone);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{timezone}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {timezone === browserTimeZone
                          ? "Browser detected timezone"
                          : timezone === DEFAULT_TIMEZONE
                            ? "Fallback timezone"
                            : "Current preference"}
                      </p>
                    </div>
                    {value === timezone ? (
                      <Check className="size-4 shrink-0 text-tone-brand" />
                    ) : timezone === browserTimeZone ? (
                      <Globe2 className="size-4 shrink-0 text-muted-foreground" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {query ? "Results" : "All timezones"}
            </p>
            <div className="surface-subtle max-h-80 overflow-y-auto rounded-[20px] border p-2">
              {filteredTimeZones.length ? (
                <div className="space-y-1">
                  {filteredTimeZones.map((timezone) => (
                    <button
                      key={timezone}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-muted/70",
                        value === timezone && "tone-brand",
                      )}
                      onClick={() => {
                        onValueChange(timezone);
                        setOpen(false);
                      }}
                    >
                      <span className="truncate">{timezone}</span>
                      {value === timezone ? (
                        <Check className="size-4 shrink-0 text-tone-brand" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed px-4 text-sm text-muted-foreground">
                  No timezone matched your search.
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
