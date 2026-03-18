import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/severity-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  <Card className="border-0 bg-card/70 shadow-dashboard">
    <CardHeader>
      <CardTitle>Recent events</CardTitle>
      <CardDescription>
        Alerts, node state changes, and task transitions ordered by recency.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <ScrollArea className="h-[380px]">
        <div className="space-y-3 pr-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={getEventHref(event)}
              className="group block rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/30 hover:bg-background/70"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={event.severity} />
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {event.source}
                    </p>
                  </div>
                  <p className="mt-3 text-sm font-medium">{event.title}</p>
                </div>
                <ChevronRight className="mt-0.5 size-4 text-muted-foreground transition group-hover:text-foreground" />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {event.message}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {formatDistanceToNowStrict(new Date(event.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </CardContent>
  </Card>
);
