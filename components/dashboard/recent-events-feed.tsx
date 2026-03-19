import Link from "next/link";

import { SeverityBadge } from "@/components/severity-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimeDisplay } from "@/components/ui/time-display";
import type { EventRecord } from "@/lib/types";

const getEventHref = (event: EventRecord) => {
  if (event.entityType === "node" && event.entityId) {
    return `/nodes/${event.entityId}`;
  }

  if (event.entityType === "task" && event.entityId) {
    return `/tasks/${event.entityId}`;
  }

  return "/events";
};

export const RecentEventsFeed = ({ events }: { events: EventRecord[] }) => (
  <Card className="border">
    <CardHeader className="border-b border-border/80 bg-muted/20">
      <CardTitle>Recent events</CardTitle>
      <CardDescription>
        Alerts, state changes, and task transitions ordered by recency.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      <ScrollArea className="h-[380px]">
        <div className="divide-y divide-border/80">
          {events.map((event) => (
            <Link
              key={event.id}
              href={getEventHref(event)}
              className="flex items-start gap-3 px-5 py-4 transition hover:bg-muted/25"
            >
              <div className="pt-0.5">
                <SeverityBadge severity={event.severity} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{event.title}</p>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {event.sourceLabel}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {event.message}
                </p>
              </div>
              <TimeDisplay
                value={event.createdAt}
                mode="relative"
                className="shrink-0 text-xs text-muted-foreground"
              />
            </Link>
          ))}
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
);
