import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { SeverityBadge } from "@/components/severity-badge";
import { GridPattern } from "@/components/magic/grid-pattern";
import { Reveal } from "@/components/magic/reveal";
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
  <Reveal>
    <Card className="surface-panel relative overflow-hidden border">
      <GridPattern className="opacity-12" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(156,28,41,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%)]" />
      <CardHeader className="relative z-10 border-b border-border/60">
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
                  className="surface-subtle surface-hover group relative block overflow-hidden rounded-[24px] border p-4"
                >
                  <div className="absolute bottom-4 left-4 top-4 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />
                  <div className="flex items-start justify-between gap-3 pl-4">
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
                  <p className="mt-2 pl-4 text-sm leading-6 text-muted-foreground">
                    {event.message}
                  </p>
                  <TimeDisplay
                    value={event.createdAt}
                    mode="relative"
                    className="mt-3 block pl-4 text-xs text-muted-foreground"
                  />
                </Link>
              </Reveal>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  </Reveal>
);
