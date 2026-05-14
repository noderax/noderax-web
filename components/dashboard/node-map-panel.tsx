"use client";

import Link from "next/link";
import { ExternalLinkIcon, MapPinIcon } from "lucide-react";
import { useMemo } from "react";

import { NodeStatusBadge } from "@/components/nodes/node-status-badge";
import {
  Map,
  MapFitBounds,
  MapMarker,
  MapPopup,
  MapTileLayer,
  MapZoomControl,
} from "@/components/ui/map";
import { SectionPanel } from "@/components/ui/section-panel";
import { TimeDisplay } from "@/components/ui/time-display";
import { useWorkspaceContext } from "@/lib/hooks/use-workspace-context";
import {
  getMappableNodes,
  groupNodesByLocation,
  type NodeMapGroup,
  type NodeMapGroupTone,
} from "@/lib/node-map";
import type { NodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClasses: Record<NodeMapGroupTone, string> = {
  online: "border-emerald-300 bg-emerald-500 text-white shadow-emerald-500/35",
  offline: "border-red-300 bg-red-500 text-white shadow-red-500/35",
  mixed:
    "border-amber-200 bg-[linear-gradient(90deg,#22c55e_0_50%,#ef4444_50%_100%)] text-white shadow-amber-500/35",
};

const toneLabels: Record<NodeMapGroupTone, string> = {
  online: "Online",
  offline: "Offline",
  mixed: "Mixed",
};

const locationProviderLabels: Record<string, string> = {
  aws: "AWS",
  gcp: "GCP",
  azure: "Azure",
  manual: "Manual",
  public_ip: "Public IP",
};

export const NodeMapPanel = ({ nodes }: { nodes: NodeSummary[] }) => {
  const { buildWorkspaceHref } = useWorkspaceContext();
  const groups = useMemo(() => groupNodesByLocation(nodes), [nodes]);
  const mappableCount = useMemo(() => getMappableNodes(nodes).length, [nodes]);
  const unmappedCount = nodes.length - mappableCount;
  const bounds = useMemo(
    () => groups.map((group) => [group.latitude, group.longitude] as [number, number]),
    [groups],
  );
  const center = groups[0]
    ? ([groups[0].latitude, groups[0].longitude] as [number, number])
    : ([20, 0] as [number, number]);

  return (
    <SectionPanel
      eyebrow="Node Map"
      title="Node location footprint"
      description="Nodes with reported coordinates are placed at their approximate provider, manual, or public-IP location."
      action={
        unmappedCount > 0 ? (
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            {unmappedCount} without location
          </span>
        ) : null
      }
      contentClassName="p-0"
    >
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="relative h-[360px] min-h-[360px] overflow-hidden bg-muted/20 xl:h-[430px]">
          {groups.length > 0 ? (
            <Map
              center={center}
              zoom={3}
              minZoom={2}
              worldCopyJump
              className="h-full min-h-full rounded-none"
            >
              <MapTileLayer />
              <MapZoomControl />
              {bounds.length > 0 ? <MapFitBounds bounds={bounds} /> : null}
              {groups.map((group) => (
                <MapMarker
                  key={group.key}
                  position={[group.latitude, group.longitude]}
                  icon={<NodeMarkerIcon group={group} />}
                  iconAnchor={[18, 18]}
                  popupAnchor={[0, -18]}
                >
                  <MapPopup>
                    <NodeGroupPopup
                      group={group}
                      buildNodeHref={(nodeId) =>
                        buildWorkspaceHref(`nodes/${nodeId}`) ?? "/workspaces"
                      }
                    />
                  </MapPopup>
                </MapMarker>
              ))}
            </Map>
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div className="max-w-sm space-y-2">
                <MapPinIcon className="mx-auto size-8 text-muted-foreground" />
                <p className="text-sm font-medium">No node locations yet</p>
                <p className="text-sm text-muted-foreground">
                  Agents continue reporting normally; map markers appear after cloud
                  region metadata is available.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-muted/10 p-4 xl:border-l xl:border-t-0">
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
            <MapSummaryItem label="Mapped" value={mappableCount} tone="neutral" />
            <MapSummaryItem
              label="Online"
              value={nodes.filter((node) => node.status === "online").length}
              tone="online"
            />
            <MapSummaryItem label="Offline" value={nodes.filter((node) => node.status === "offline").length} tone="offline" />
          </div>
          <div className="mt-4 space-y-2">
            {groups.slice(0, 5).map((group) => (
              <div
                key={group.key}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {formatGroupLocation(group)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {group.nodes.length} node{group.nodes.length === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
                    group.tone === "online" && "tone-success",
                    group.tone === "offline" && "tone-danger",
                    group.tone === "mixed" && "tone-warning",
                  )}
                >
                  {toneLabels[group.tone]}
                </span>
              </div>
            ))}
            {groups.length > 5 ? (
              <p className="text-xs text-muted-foreground">
                {groups.length - 5} more region group{groups.length - 5 === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </SectionPanel>
  );
};

const NodeMarkerIcon = ({ group }: { group: NodeMapGroup }) => (
  <div
    className={cn(
      "relative flex size-9 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-lg ring-2 ring-background",
      toneClasses[group.tone],
    )}
  >
    {group.nodes.length}
  </div>
);

const NodeGroupPopup = ({
  group,
  buildNodeHref,
}: {
  group: NodeMapGroup;
  buildNodeHref: (nodeId: string) => string;
}) => (
  <div className="w-[290px] p-3">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{formatGroupLocation(group)}</p>
        <p className="text-xs text-muted-foreground">
          {group.latitude.toFixed(3)}, {group.longitude.toFixed(3)}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
          group.tone === "online" && "tone-success",
          group.tone === "offline" && "tone-danger",
          group.tone === "mixed" && "tone-warning",
        )}
      >
        {toneLabels[group.tone]}
      </span>
    </div>

    <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
      {group.nodes.map((node) => (
        <div key={node.id} className="rounded-md border bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{node.name}</p>
              <p className="truncate text-xs text-muted-foreground">{node.hostname}</p>
            </div>
            <NodeStatusBadge status={node.status} />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <NodePopupField
              label="Provider"
              value={formatLocationProvider(node.location?.provider)}
            />
            <NodePopupField label="Region" value={node.location?.region} />
            <NodePopupField label="Zone" value={node.location?.zone ?? "N/A"} />
            <NodePopupField
              label="CPU / Memory"
              value={
                node.latestMetric
                  ? `${node.latestMetric.cpu}% / ${node.latestMetric.memory}%`
                  : "N/A"
              }
            />
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              Last seen{" "}
              <TimeDisplay value={node.lastSeenAt} mode="relative" emptyLabel="never" />
            </span>
            <Link
              href={buildNodeHref(node.id)}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Details
              <ExternalLinkIcon className="size-3" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const NodePopupField = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) => (
  <div className="min-w-0 rounded-md bg-muted/40 px-2 py-1.5">
    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      {label}
    </p>
    <p className="truncate font-medium">{value ?? "N/A"}</p>
  </div>
);

const MapSummaryItem = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "online" | "offline";
}) => (
  <div className="rounded-md border bg-card px-3 py-2">
    <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </p>
    <p
      className={cn(
        "mt-1 text-xl font-semibold",
        tone === "online" && "text-tone-success",
        tone === "offline" && "text-tone-danger",
        tone === "neutral" && "text-foreground",
      )}
    >
      {value}
    </p>
  </div>
);

const formatGroupLocation = (group: NodeMapGroup) => {
  const firstLocation = group.nodes[0]?.location;
  if (!firstLocation) {
    return "Unknown region";
  }

  return [formatLocationProvider(firstLocation.provider), firstLocation.region]
    .filter(Boolean)
    .join(" / ");
};

const formatLocationProvider = (provider?: string | null) => {
  if (!provider) {
    return undefined;
  }
  return locationProviderLabels[provider] ?? provider.toUpperCase();
};
