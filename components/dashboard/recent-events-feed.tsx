import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/severity-badge";
import { GridPattern } from "@/components/magic/grid-pattern";
import { Reveal } from "@/components/magic/reveal";
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
  <Reveal>
    <Card className="relative overflow-hidden border-0 bg-card/70 shadow-dashboard">
      <GridPattern className="opacity-15" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_34%)]" />
      <CardHeader className="relative z-10">
        <CardTitle>Recent events</CardTitle>
        <CardDescription>
          Alerts, node state changes, and task transitions ordered by recency.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        <ScrollArea className="h-[380px]">
          <div className="space-y-3 pr-3">
            {events.map((event, index) => (
              <Reveal key={event.id} delay={0.04 * index}>
                <Link
                  href={getEventHref(event)}
                  className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-background/40 p-4 transition hover:border-primary/30 hover:bg-background/70"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={event.severity} />
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {event.sourceLabel}
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
              </Reveal>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </Reveal>
);
