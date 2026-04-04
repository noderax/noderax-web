import { describe, expect, it } from "vitest";

import {
  getOperationalRootAccessState,
  profileAllowsSurface,
} from "@/lib/root-access";

describe("root access helpers", () => {
  it("allows operational actions only when the applied profile includes operational root", () => {
    expect(
      getOperationalRootAccessState({
        rootAccessProfile: "operational",
        rootAccessAppliedProfile: "operational",
        rootAccessSyncStatus: "applied",
        rootAccessLastError: null,
      }),
    ).toEqual({
      allowed: true,
      reason: null,
    });
  });

  it("keeps operational actions disabled while the desired profile is still pending sync", () => {
    expect(
      getOperationalRootAccessState({
        rootAccessProfile: "operational",
        rootAccessAppliedProfile: "off",
        rootAccessSyncStatus: "pending",
        rootAccessLastError: null,
      }),
    ).toEqual({
      allowed: false,
      reason:
        "Operational root is configured but still waiting for agent sync. Package actions, restart, and reboot stay locked until the applied profile updates.",
    });
  });

  it("surfaces sync failures when operational root could not be applied", () => {
    expect(
      getOperationalRootAccessState({
        rootAccessProfile: "operational",
        rootAccessAppliedProfile: "off",
        rootAccessSyncStatus: "failed",
        rootAccessLastError: "sudo: a password is required",
      }),
    ).toEqual({
      allowed: false,
      reason:
        "Operational root could not be applied. Last sync error: sudo: a password is required",
    });
  });

  it("keeps task and terminal surface selection unchanged", () => {
    expect(profileAllowsSurface("task", "task")).toBe(true);
    expect(profileAllowsSurface("task", "operational")).toBe(false);
    expect(profileAllowsSurface("terminal", "terminal")).toBe(true);
    expect(profileAllowsSurface("terminal", "task")).toBe(false);
  });
});
