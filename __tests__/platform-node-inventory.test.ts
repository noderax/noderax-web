import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api";

const node = (index: number) => ({
  id: `node-${index}`,
  workspaceId: "workspace-1",
  name: `Node ${index}`,
  hostname: `node-${index}.example.com`,
  status: "online",
  arch: "amd64",
  os: "linux",
  agentVersion: "2026.6.4",
});

afterEach(() => vi.unstubAllGlobals());

describe("platform rollout inventory", () => {
  it("loads every page without requesting telemetry", async () => {
    const inventory = Array.from({ length: 201 }, (_, i) => node(i));
    const offsets: number[] = [];
    const fetchMock = vi.fn(async (input: string) => {
      const url = new URL(input, "https://console.example.com");
      // The obsolete global metrics endpoint fails, as it does in the API.
      if (url.pathname !== "/api/proxy/nodes") {
        return Response.json({ message: "Not found" }, { status: 404 });
      }
      expect(url.searchParams.get("limit")).toBe("100");
      expect(url.searchParams.get("status")).toBe("online");
      const offset = Number(url.searchParams.get("offset"));
      offsets.push(offset);
      return Response.json(inventory.slice(offset, offset + 100));
    });
    vi.stubGlobal("fetch", fetchMock);

    const nodes = await apiClient.getPlatformNodeSummaries({ status: "online" });

    expect(offsets).toEqual([0, 100, 200]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(nodes).toHaveLength(201);
    expect(nodes[200]).toMatchObject({
      id: "node-200",
      status: "online",
      agentVersion: "2026.6.4",
      latestMetric: null,
    });
  });

  it("finishes when the fleet has exactly one full page", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(Array.from({ length: 100 }, (_, i) => node(i))))
      .mockResolvedValueOnce(Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    expect(await apiClient.getPlatformNodeSummaries()).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("reports a failed later page instead of presenting incomplete inventory", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json(Array.from({ length: 100 }, (_, i) => node(i))))
      .mockResolvedValueOnce(Response.json({ message: "Inventory unavailable" }, { status: 503 })));

    await expect(apiClient.getPlatformNodeSummaries()).rejects.toThrow("Inventory unavailable");
  });

  it("uses the JSON metrics route globally and keeps workspace metrics scoped", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await apiClient.getMetrics({ limit: 100 });
    await apiClient.getMetrics({ limit: 100 }, "workspace-1");

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/proxy/platform-metrics?limit=100",
      "/api/proxy/workspaces/workspace-1/metrics?limit=100",
    ]);
  });
});
