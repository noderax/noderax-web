"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { BellRing, RefreshCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { SeverityBadge } from "@/components/severity-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionPanel } from "@/components/ui/section-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import { useEvents, useNodes } from "@/lib/hooks/use-noderax-data";
import type { EventRecord } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const EMPTY_EVENTS: EventRecord[] = [];

export default function EventsPage() {
  const eventSeverityFilter = useAppStore((state) => state.eventSeverityFilter);
  const setEventSeverityFilter = useAppStore((state) => state.setEventSeverityFilter);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim().toLowerCase());
  const [nodeFilter, setNodeFilter] = useState<"all" | string>("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [limit, setLimit] = useState<25 | 50 | 100>(50);
  const nodesQuery = useNodes({ limit: 100 });
  const eventsQuery = useEvents({
    severity: eventSeverityFilter,
    nodeId: nodeFilter === "all" ? undefined : nodeFilter,
    type: typeFilter.trim() || undefined,
    limit,
  });
  const rawEvents = eventsQuery.data ?? EMPTY_EVENTS;
  const events = useMemo(
    () =>
      rawEvents.filter((event) =>
        deferredSearchQuery
          ? [event.title, event.message, event.sourceLabel, event.type]
              .join(" ")
              .toLowerCase()
              .includes(deferredSearchQuery)
          : true,
      ),
    [deferredSearchQuery, rawEvents],
  );

  const actionControls = (
    <>
      <Select
        value={eventSeverityFilter}
        onValueChange={(value) =>
          setEventSeverityFilter(value as typeof eventSeverityFilter)
        }
      >
        <SelectTrigger className="min-w-44">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>

      <Select value={nodeFilter} onValueChange={(value) => setNodeFilter(value ?? "all")}>
        <SelectTrigger className="min-w-52">
          <SelectValue placeholder="Node" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All nodes</SelectItem>
          {(nodesQuery.data ?? []).map((node) => (
            <SelectItem key={node.id} value={node.id}>
              {node.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={typeFilter}
        onChange={(event) => setTypeFilter(event.target.value)}
        placeholder="Filter type"
        className="w-full min-w-44 sm:max-w-52"
      />

      <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value) as 25 | 50 | 100)}>
        <SelectTrigger className="min-w-32">
          <SelectValue placeholder="Limit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="25">25 rows</SelectItem>
          <SelectItem value="50">50 rows</SelectItem>
          <SelectItem value="100">100 rows</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={() => eventsQuery.refetch()}>
        <RefreshCcw className="size-4" />
        Refresh
      </Button>
    </>
  );

  return (
    <AppShell>
      <SectionPanel
        eyebrow="Ledger"
        title="Event stream"
        description="Severity-aware operational events ordered by recency."
        action={actionControls}
        contentClassName={events.length ? "p-0" : undefined}
      >
        {eventsQuery.isPending ? (
          <div className="space-y-3 px-5 py-4 sm:px-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-[18px]" />
            ))}
          </div>
        ) : eventsQuery.isError ? (
          <EmptyState
            title="Event stream is unavailable"
            description="The event list could not be loaded from the authenticated API connection."
            icon={BellRing}
            actionLabel="Retry"
            onAction={() => eventsQuery.refetch()}
          />
        ) : events.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Severity</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <SeverityBadge severity={event.severity} />
                  </TableCell>
                  <TableCell className="max-w-[32rem]">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {event.message}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{event.sourceLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{event.type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <TimeDisplay value={event.createdAt} mode="datetime" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={rawEvents.length ? "No events match the current search" : "No events found"}
            description={
              rawEvents.length
                ? "The current event slice loaded successfully, but the global search did not match any entries."
                : "No events match the current server-side filters."
            }
            icon={BellRing}
          />
        )}
      </SectionPanel>
    </AppShell>
  );
}
