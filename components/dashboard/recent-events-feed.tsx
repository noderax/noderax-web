"use client";

import Link from "next/link";

import { SeverityBadge } from "@/components/severity-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TimeDisplay } from "@/components/ui/time-display";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import type { EventRecord } from "@/lib/types";

export const RecentEventsFeed = ({ events }: { events: EventRecord[] }) => {
  const { buildWorkspaceHref } = useWorkspaceContext();

  const getEventHref = (event: EventRecord) => {
    if (event.entityType === "node" && event.entityId) {
      return buildWorkspaceHref(`nodes/${event.entityId}`) ?? "/workspaces";
    }

    if (event.entityType === "task" && event.entityId) {
      return buildWorkspaceHref(`tasks/${event.entityId}`) ?? "/workspaces";
    }

    return buildWorkspaceHref("events") ?? "/workspaces";
  };

  return (
    <Card
      className="border"
      style={{
        background: "#d4d0c8",
        border: "2px solid",
        borderColor: "#ffffff #808080 #808080 #ffffff",
        boxShadow: "1px 1px 0 #404040",
        borderRadius: "0",
      }}
    >
      <CardHeader
        className="border-b border-border/80 bg-muted/20"
        style={{
          background: "linear-gradient(to right, #0a246a, #a6caf0)",
          borderBottom: "2px solid #404040",
          padding: "4px 8px",
        }}
      >
        <CardTitle style={{ color: "#ffffff", fontSize: "12px", fontWeight: "bold" }}>Recent events</CardTitle>
        <CardDescription style={{ color: "#c8d8f0", fontSize: "10px" }}>
          Alerts, state changes, and task transitions ordered by recency.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[380px]" style={{ background: "#ffffff" }}>
          <div className="divide-y divide-border/80">
            {events.map((event) => (
              <Link
                key={event.id}
                href={getEventHref(event)}
                className="flex items-start gap-3 px-5 py-4"
                style={{
                  borderBottom: "1px solid #d0d0d0",
                  background: "#ffffff",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "4px 8px",
                  color: "#000000",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#000080";
                  (e.currentTarget as HTMLElement).style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "#ffffff";
                  (e.currentTarget as HTMLElement).style.color = "#000000";
                }}
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
};
