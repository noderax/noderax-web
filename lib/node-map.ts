import type { NodeStatus, NodeSummary } from "@/lib/types";

export type NodeMapGroupTone = "online" | "offline" | "mixed";

export interface NodeMapGroup {
  key: string;
  latitude: number;
  longitude: number;
  nodes: NodeSummary[];
  tone: NodeMapGroupTone;
}

export const getMappableNodes = (nodes: NodeSummary[]) =>
  nodes.filter(
    (node) =>
      typeof node.location?.latitude === "number" &&
      Number.isFinite(node.location.latitude) &&
      typeof node.location.longitude === "number" &&
      Number.isFinite(node.location.longitude),
  );

export const groupNodesByLocation = (nodes: NodeSummary[]): NodeMapGroup[] => {
  const groups = new Map<string, NodeMapGroup>();

  getMappableNodes(nodes).forEach((node) => {
    const latitude = node.location?.latitude as number;
    const longitude = node.location?.longitude as number;
    const key = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
    const existing = groups.get(key);

    if (existing) {
      existing.nodes.push(node);
      existing.tone = resolveGroupTone(existing.nodes.map((item) => item.status));
      return;
    }

    groups.set(key, {
      key,
      latitude,
      longitude,
      nodes: [node],
      tone: node.status,
    });
  });

  return Array.from(groups.values()).sort((left, right) =>
    left.key.localeCompare(right.key),
  );
};

const resolveGroupTone = (statuses: NodeStatus[]): NodeMapGroupTone => {
  const online = statuses.filter((status) => status === "online").length;
  if (online === statuses.length) {
    return "online";
  }
  if (online === 0) {
    return "offline";
  }
  return "mixed";
};
