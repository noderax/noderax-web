import { describe, expect, it } from "vitest";

import { getMappableNodes, groupNodesByLocation } from "@/lib/node-map";
import type { NodeSummary } from "@/lib/types";

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
  lastSeenAt: null,
  os: "ubuntu-24.04",
  arch: "amd64",
  createdAt: "2026-04-05T10:00:00.000Z",
  updatedAt: "2026-04-05T10:00:00.000Z",
  latestMetric: null,
  ...overrides,
});

describe("node map helpers", () => {
  it("filters nodes without finite coordinates", () => {
    const nodes = [
      buildNode({ id: "node-1", location: null }),
      buildNode({
        id: "node-2",
        location: {
          provider: "aws",
          source: "cloud_metadata",
          region: "us-east-1",
          latitude: 39.0438,
          longitude: -77.4874,
        },
      }),
      buildNode({
        id: "node-3",
        location: {
          provider: "aws",
          source: "cloud_metadata",
          region: "unknown",
          latitude: null,
          longitude: null,
        },
      }),
    ];

    expect(getMappableNodes(nodes).map((node) => node.id)).toEqual(["node-2"]);
  });

  it("groups nodes at the same coordinate and marks mixed status", () => {
    const nodes = [
      buildNode({
        id: "node-1",
        status: "online",
        location: {
          provider: "aws",
          source: "cloud_metadata",
          region: "eu-central-1",
          latitude: 50.1109,
          longitude: 8.6821,
        },
      }),
      buildNode({
        id: "node-2",
        status: "offline",
        location: {
          provider: "aws",
          source: "cloud_metadata",
          region: "eu-central-1",
          latitude: 50.11091,
          longitude: 8.68211,
        },
      }),
    ];

    const groups = groupNodesByLocation(nodes);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual(
      expect.objectContaining({
        key: "50.1109:8.6821",
        tone: "mixed",
      }),
    );
    expect(groups[0]?.nodes).toHaveLength(2);
  });
});
