"use client";

import { BellRing, RefreshCcw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/magic/reveal";
import { SeverityBadge } from "@/components/severity-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionPanel } from "@/components/ui/section-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const infoCount = events.filter((event) => event.severity === "info").length;
  const warningCount = events.filter((event) => event.severity === "warning").length;
  const criticalCount = events.filter((event) => event.severity === "critical").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Signals"
        title="Operational events"
        description="Filter platform events by severity and inspect alerting history in a single live-updating feed."
        meta={
          events.length ? (
            <>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Info</span>{" "}
                <span className="font-semibold">{infoCount}</span>
              </div>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Warning</span>{" "}
                <span className="font-semibold">{warningCount}</span>
              </div>
              <div className="meta-chip rounded-full border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Critical</span>{" "}
                <span className="font-semibold">{criticalCount}</span>
              </div>
            </>
          ) : null
        }
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

      {events.length ? (
        <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
          <SectionPanel
            eyebrow="Signal Map"
            title="Severity landscape"
            description="Use this lane to spot concentration shifts in operational noise and failure signals."
            contentClassName="space-y-3 p-6"
          >
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Filter state
              </p>
              <p className="mt-2 text-lg font-semibold capitalize">
                {eventSeverityFilter}
              </p>
              <p className="text-sm text-muted-foreground">
                Search-aware filtering follows the global command bar.
              </p>
            </div>
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Critical concentration
              </p>
              <p className="mt-2 text-3xl font-semibold">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">
                High-priority alerts in the currently visible stream.
              </p>
            </div>
            <div className="surface-subtle rounded-[24px] border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Latest signal
              </p>
              <p className="mt-2 text-lg font-semibold">{events[0]?.title}</p>
              <TimeDisplay
                value={events[0]?.createdAt}
                mode="relative"
                className="mt-1 block text-sm text-muted-foreground"
              />
            </div>
          </SectionPanel>

          <div className="space-y-4">
            {events.map((event, index) => (
              <Reveal key={event.id} delay={0.03 * index}>
                <Card className="surface-panel surface-hover border">
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
                    <span className="meta-chip rounded-full border px-3 py-1">
                      {event.sourceLabel}
                    </span>
                    <span className="meta-chip rounded-full border px-3 py-1">
                      {event.type}
                    </span>
                    <span className="meta-chip rounded-full border px-3 py-1">
                      <TimeDisplay value={event.createdAt} mode="datetime" />
                    </span>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
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
