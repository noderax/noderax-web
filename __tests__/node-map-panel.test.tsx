import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NodeMapPanel } from "@/components/dashboard/node-map-panel";
import type { NodeSummary } from "@/lib/types";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/hooks/use-workspace-context", () => ({
  useWorkspaceContext: () => ({
    buildWorkspaceHref: (path: string) => `/w/default/${path}`,
  }),
}));

vi.mock("@/components/ui/time-display", () => ({
  TimeDisplay: ({ value, emptyLabel }: { value: string | null; emptyLabel?: string }) => (
    <span>{value ?? emptyLabel ?? "N/A"}</span>
  ),
}));

vi.mock("@/components/ui/map", () => ({
  Map: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="node-map">{children}</div>
  ),
  MapTileLayer: () => <div data-testid="tile-layer" />,
  MapZoomControl: () => <div data-testid="zoom-control" />,
  MapFitBounds: () => <div data-testid="fit-bounds" />,
  MapMarker: ({
    children,
    position,
  }: {
    children: React.ReactNode;
    position: [number, number];
  }) => (
    <div data-testid="map-marker" data-position={position.join(",")}>
      {children}
    </div>
  ),
  MapPopup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-popup">{children}</div>
  ),
}));

const buildNode = (overrides: Partial<NodeSummary>): NodeSummary => ({
  id: "node-1",
  workspaceId: "workspace-1",
  name: "srv-01",
  hostname: "srv-01.example",
  status: "online",
  teamId: null,
  teamName: null,
  maintenanceMode: false,
  notificationEmailEnabled: true,
  notificationEmailLevels: ["info", "warning", "critical"],
  notificationTelegramEnabled: true,
  notificationTelegramLevels: ["info", "warning", "critical"],
  rootAccessProfile: "off",
  rootAccessAppliedProfile: "off",
  rootAccessSyncStatus: "pending",
  rootAccessUpdatedAt: null,
  rootAccessUpdatedByUserId: null,
  rootAccessLastAppliedAt: null,
  rootAccessLastError: null,
  maintenanceReason: null,
  agentVersion: null,
  platformVersion: null,
  kernelVersion: null,
  lastVersionReportedAt: null,
  location: null,
  lastSeenAt: "2026-04-05T10:00:00.000Z",
  os: "ubuntu-24.04",
  arch: "amd64",
  createdAt: "2026-04-05T10:00:00.000Z",
  updatedAt: "2026-04-05T10:00:00.000Z",
  latestMetric: null,
  ...overrides,
});

describe("NodeMapPanel", () => {
  it("renders popup details for grouped nodes and excludes unmapped nodes", () => {
    render(
      <NodeMapPanel
        nodes={[
          buildNode({
            id: "node-1",
            name: "Frankfurt API",
            hostname: "fra-api-01",
            latestMetric: {
              timestamp: "2026-04-05T10:00:00.000Z",
              cpu: 17,
              memory: 42,
              disk: 68,
              temperature: null,
            },
            location: {
              provider: "aws",
              source: "cloud_metadata",
              region: "eu-central-1",
              zone: "eu-central-1a",
              latitude: 50.1109,
              longitude: 8.6821,
            },
          }),
          buildNode({
            id: "node-2",
            name: "No Region Node",
            hostname: "no-region-01",
            status: "offline",
            location: null,
          }),
        ]}
      />,
    );

    expect(screen.getByTestId("node-map")).toBeInTheDocument();
    expect(screen.getAllByTestId("map-marker")).toHaveLength(1);
    expect(screen.getByText("1 without location")).toBeInTheDocument();
    expect(screen.getByText("Frankfurt API")).toBeInTheDocument();
    expect(screen.getByText("fra-api-01")).toBeInTheDocument();
    expect(screen.getAllByText("AWS")).not.toHaveLength(0);
    expect(screen.getByText("eu-central-1a")).toBeInTheDocument();
    expect(screen.getByText("17% / 42%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /details/i })).toHaveAttribute(
      "href",
      "/w/default/nodes/node-1",
    );
    expect(screen.queryByText("No Region Node")).not.toBeInTheDocument();
  });

  it("renders an empty state when no nodes have coordinates", () => {
    render(
      <NodeMapPanel
        nodes={[
          buildNode({
            id: "node-1",
            name: "Metadata Pending",
            location: {
              provider: "gcp",
              source: "cloud_metadata",
              region: "unknown-region",
              latitude: null,
              longitude: null,
            },
          }),
        ]}
      />,
    );

    expect(screen.queryByTestId("node-map")).not.toBeInTheDocument();
    expect(screen.getByText("No node locations yet")).toBeInTheDocument();
    expect(screen.getByText("1 without location")).toBeInTheDocument();
  });
});
