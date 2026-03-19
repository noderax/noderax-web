"use client";

import { BellRing, RefreshCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { SeverityBadge } from "@/components/severity-badge";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/section-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeDisplay } from "@/components/ui/time-display";
import { useEvents } from "@/lib/hooks/use-noderax-data";
import { useAppStore } from "@/store/useAppStore";

export default function EventsPage() {
  const eventSeverityFilter = useAppStore((state) => state.eventSeverityFilter);
  const setEventSeverityFilter = useAppStore((state) => state.setEventSeverityFilter);
  const searchQuery = useAppStore((state) => state.searchQuery);
  const eventsQuery = useEvents({
    severity: eventSeverityFilter,
    query: searchQuery,
    limit: 50,
  });
  const events = eventsQuery.data ?? [];

  return (
    <AppShell>
      <SectionPanel
        eyebrow="Ledger"
        title="Event stream"
        description="Severity-aware operational events ordered by recency."
        action={
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
            <Button variant="outline" onClick={() => eventsQuery.refetch()}>
              <RefreshCcw className="size-4" />
              Refresh
            </Button>
          </>
        }
        contentClassName={events.length ? "p-0" : undefined}
      >
        {events.length ? (
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
            title="No events found"
            description="No events match the current severity and search criteria. Try broadening the filters."
            icon={BellRing}
          />
        )}
      </SectionPanel>
    </AppShell>
  );
}
