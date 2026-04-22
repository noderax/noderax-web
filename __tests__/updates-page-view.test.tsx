import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UpdatesPageView } from "@/components/updates/updates-page-view";
import { useAppStore } from "@/store/useAppStore";

const useWorkspaceContextMock = vi.fn();
const useWorkspacesMock = vi.fn();
const useControlPlaneUpdateSummaryMock = vi.fn();
const useAgentUpdateSummaryMock = vi.fn();
const useAgentUpdateReleasesMock = vi.fn();
const useAgentUpdateRolloutsMock = vi.fn();
const usePlatformNodesMock = vi.fn();
const useQueueControlPlaneUpdateDownloadMock = vi.fn();
const useQueueControlPlaneUpdateApplyMock = vi.fn();
const useCreateAgentUpdateRolloutMock = vi.fn();
const useResumeAgentUpdateRolloutMock = vi.fn();
const useCancelAgentUpdateRolloutMock = vi.fn();
const useRetryAgentUpdateRolloutTargetMock = vi.fn();
const useSkipAgentUpdateRolloutTargetMock = vi.fn();

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/animated-gradient-text", () => ({
  AnimatedGradientText: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/shimmer-button", () => ({
  ShimmerButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    background?: string;
    shimmerColor?: string;
  }) => {
    const { background, shimmerColor, ...buttonProps } = props;
    void background;
    void shimmerColor;

    return (
      <button type="button" {...buttonProps}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/time-display", () => ({
  TimeDisplay: ({ value }: { value: string | null }) => (
    <span>{value ?? "N/A"}</span>
  ),
}));

vi.mock("@/lib/hooks/use-workspace-context", () => ({
  useWorkspaceContext: () => useWorkspaceContextMock(),
}));

vi.mock("@/lib/hooks/use-noderax-data", () => ({
  useWorkspaces: (...args: unknown[]) => useWorkspacesMock(...args),
  useControlPlaneUpdateSummary: (...args: unknown[]) =>
    useControlPlaneUpdateSummaryMock(...args),
  useAgentUpdateSummary: (...args: unknown[]) =>
    useAgentUpdateSummaryMock(...args),
  useAgentUpdateReleases: (...args: unknown[]) =>
    useAgentUpdateReleasesMock(...args),
  useAgentUpdateRollouts: (...args: unknown[]) =>
    useAgentUpdateRolloutsMock(...args),
  usePlatformNodes: (...args: unknown[]) => usePlatformNodesMock(...args),
  useQueueControlPlaneUpdateDownload: (...args: unknown[]) =>
    useQueueControlPlaneUpdateDownloadMock(...args),
  useQueueControlPlaneUpdateApply: (...args: unknown[]) =>
    useQueueControlPlaneUpdateApplyMock(...args),
  useCreateAgentUpdateRollout: (...args: unknown[]) =>
    useCreateAgentUpdateRolloutMock(...args),
  useResumeAgentUpdateRollout: (...args: unknown[]) =>
    useResumeAgentUpdateRolloutMock(...args),
  useCancelAgentUpdateRollout: (...args: unknown[]) =>
    useCancelAgentUpdateRolloutMock(...args),
  useRetryAgentUpdateRolloutTarget: (...args: unknown[]) =>
    useRetryAgentUpdateRolloutTargetMock(...args),
  useSkipAgentUpdateRolloutTarget: (...args: unknown[]) =>
    useSkipAgentUpdateRolloutTargetMock(...args),
}));

const buildMutation = () => ({
  mutate: vi.fn(),
  isPending: false,
});

const buildControlPlaneSummary = (overrides?: Record<string, unknown>) => ({
  supported: true,
  deploymentMode: "installer_managed",
  currentRelease: {
    version: "1.0.0",
    releaseId: "20260413T214149Z",
    releasedAt: "2026-04-13T21:41:49Z",
    changelog: [
      {
        title: "Runtime",
        items: ["Stabilized installer-managed runtime metadata."],
      },
    ],
  },
  latestRelease: {
    version: "1.0.0",
    releaseId: "20260413T214149Z",
    releasedAt: "2026-04-13T21:41:49Z",
    changelog: [
      {
        title: "Runtime",
        items: ["Stabilized installer-managed runtime metadata."],
      },
    ],
  },
  preparedRelease: null,
  updateAvailable: false,
  operation: null,
  releaseCheckedAt: "2026-04-15T10:00:00Z",
  ...overrides,
});

describe("UpdatesPageView control-plane rendering", () => {
  beforeEach(() => {
    useAppStore.setState({
      realtimeStatus: "connected",
      realtimeHealth: {
        status: "connected",
        lastEventAt: "2026-04-15T10:00:00Z",
        lastHeartbeatAt: "2026-04-15T10:00:00Z",
        eventAgeMs: 0,
        degradedReason: null,
      },
    });

    useWorkspaceContextMock.mockReturnValue({
      isPlatformAdmin: true,
    });
    useWorkspacesMock.mockReturnValue({
      data: [],
      isPending: false,
    });
    useControlPlaneUpdateSummaryMock.mockReturnValue({
      data: buildControlPlaneSummary(),
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useAgentUpdateSummaryMock.mockReturnValue({
      data: {
        latestRelease: {
          version: "2.3.4",
          publishedAt: "2026-04-15T09:00:00Z",
        },
        activeRollout: null,
        outdatedNodeCount: 0,
        eligibleOutdatedNodeCount: 0,
        releaseCheckedAt: "2026-04-15T09:00:00Z",
      },
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useAgentUpdateReleasesMock.mockReturnValue({
      data: [
        {
          version: "2.3.4",
          publishedAt: "2026-04-15T09:00:00Z",
        },
      ],
      isPending: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useAgentUpdateRolloutsMock.mockReturnValue({
      data: [],
      isPending: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    usePlatformNodesMock.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });
    useQueueControlPlaneUpdateDownloadMock.mockReturnValue(buildMutation());
    useQueueControlPlaneUpdateApplyMock.mockReturnValue(buildMutation());
    useCreateAgentUpdateRolloutMock.mockReturnValue(buildMutation());
    useResumeAgentUpdateRolloutMock.mockReturnValue(buildMutation());
    useCancelAgentUpdateRolloutMock.mockReturnValue(buildMutation());
    useRetryAgentUpdateRolloutTargetMock.mockReturnValue(buildMutation());
    useSkipAgentUpdateRolloutTargetMock.mockReturnValue(buildMutation());
  });

  it("renders cleanly when no control-plane update is available", () => {
    render(<UpdatesPageView />);

    expect(screen.getByText("Control plane updates")).toBeInTheDocument();
    expect(screen.getByText("No control-plane update operation is active. If the latest release differs from the installed build, you can stage it here and confirm the apply separately.")).toBeInTheDocument();
  });

  it("renders the prepared control-plane state without crashing", () => {
    useControlPlaneUpdateSummaryMock.mockReturnValue({
      data: buildControlPlaneSummary({
        preparedRelease: {
          version: "1.0.0",
          releaseId: "20260415T094500Z",
          releasedAt: "2026-04-15T09:45:00Z",
        },
      }),
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<UpdatesPageView />);

    expect(screen.getAllByText("Apply prepared update").length).toBeGreaterThan(0);
  });

  it("renders control-plane changelog sections for known releases", () => {
    render(<UpdatesPageView />);

    expect(screen.getByText("Control-plane changelog")).toBeInTheDocument();
    expect(
      screen.getAllByText("Stabilized installer-managed runtime metadata.").length,
    ).toBeGreaterThan(0);
  });
});
