"use client";

import { BellRing, RefreshCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/magic/reveal";
import { SeverityBadge } from "@/components/severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  return (
    <AppShell>
      <PageHeader
        eyebrow="Signals"
        title="Operational events"
        description="Filter platform events by severity and inspect alerting history in a single live-updating feed."
        actions={
          <>
            <Select
              value={eventSeverityFilter}
              onValueChange={(value) =>
                setEventSeverityFilter(value as typeof eventSeverityFilter)
              }
            >
              <SelectTrigger className="min-w-44 rounded-full bg-card/70">
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
      />

      {eventsQuery.data?.length ? (
        <div className="space-y-4">
          {eventsQuery.data.map((event, index) => (
            <Reveal key={event.id} delay={0.03 * index}>
              <Card className="border-0 bg-card/70 shadow-dashboard transition hover:bg-card/80">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {event.message}
                    </CardDescription>
                  </div>
                  <SeverityBadge severity={event.severity} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full border border-border/70 px-3 py-1">
                      {event.sourceLabel}
                </span>
                <span className="rounded-full border border-border/70 px-3 py-1">
                  {event.type}
                </span>
                <span className="rounded-full border border-border/70 px-3 py-1">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </CardContent>
            </Card>
            </Reveal>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No events found"
          description="No events match the current severity and search criteria. Try broadening the filters."
          icon={BellRing}
        />
      )}
    </AppShell>
  );
}
