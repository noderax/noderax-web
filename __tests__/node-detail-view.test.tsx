import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NodeDetailView } from "@/components/nodes/node-detail-view";
import type { NodeDetail } from "@/lib/types";

const useRouterMock = vi.fn();
const useWorkspaceContextMock = vi.fn();
const useNodeMock = vi.fn();
const useWorkspaceTeamsMock = vi.fn();
const useUpdateNodeTeamMock = vi.fn();
const useUpdateNodeNotificationsMock = vi.fn();
const useUpdateNodeRootAccessMock = vi.fn();
const useEnableNodeMaintenanceMock = vi.fn();
const useDisableNodeMaintenanceMock = vi.fn();
const useNodeRealtimeSubscriptionMock = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <div data-testid="speedometer" />,
}));

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/nodes/delete-node-dialog", () => ({
  DeleteNodeDialog: () => <button type="button">Delete node</button>,
}));

vi.mock("@/components/packages/node-packages-screen", () => ({
  NodePackagesScreen: () => <div>Packages</div>,
}));

vi.mock("@/components/dashboard/metrics-chart", () => ({
  MetricsChart: () => <div>Metrics chart</div>,
}));

vi.mock("@/components/ui/shimmer-button", () => ({
  ShimmerButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    background?: string;
    shimmerColor?: string;
  }) => {
    const {
      background,
      shimmerColor,
      ...buttonProps
    } = props;
    void background;
    void shimmerColor;

    return (
      <button type="button" {...buttonProps}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked = false,
    disabled = false,
    id,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    disabled?: boolean;
    id?: string;
    onCheckedChange?: (checked: boolean) => void;
    "aria-labelledby"?: string;
  }) => (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    />
  ),
}));

vi.mock("@/components/ui/time-display", () => ({
  TimeDisplay: ({ value }: { value: string | null }) => <span>{value ?? "N/A"}</span>,
}));

vi.mock("@/lib/hooks/use-realtime", () => ({
  useNodeRealtimeSubscription: (...args: unknown[]) =>
    useNodeRealtimeSubscriptionMock(...args),
}));

vi.mock("@/lib/hooks/use-workspace-context", () => ({
  useWorkspaceContext: () => useWorkspaceContextMock(),
}));

vi.mock("@/lib/hooks/use-noderax-data", () => ({
  useNode: (...args: unknown[]) => useNodeMock(...args),
  useWorkspaceTeams: (...args: unknown[]) => useWorkspaceTeamsMock(...args),
  useUpdateNodeTeam: (...args: unknown[]) => useUpdateNodeTeamMock(...args),
  useUpdateNodeNotifications: (...args: unknown[]) =>
    useUpdateNodeNotificationsMock(...args),
  useUpdateNodeRootAccess: (...args: unknown[]) =>
    useUpdateNodeRootAccessMock(...args),
  useEnableNodeMaintenance: (...args: unknown[]) =>
    useEnableNodeMaintenanceMock(...args),
  useDisableNodeMaintenance: (...args: unknown[]) =>
    useDisableNodeMaintenanceMock(...args),
}));

const buildNode = (overrides?: Partial<NodeDetail>): NodeDetail => ({
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
  agentVersion: "1.2.3",
  platformVersion: "24.04",
  kernelVersion: "6.8.0",
  lastVersionReportedAt: null,
  location: null,
  lastSeenAt: null,
  os: "ubuntu-24.04",
  arch: "amd64",
  createdAt: "2026-04-05T10:00:00.000Z",
  updatedAt: "2026-04-05T10:00:00.000Z",
  latestMetric: null,
  metrics: [],
  recentEvents: [],
  runningTasks: [],
  networkStats: null,
  ...overrides,
});

describe("NodeDetailView notification delivery controls", () => {
  beforeEach(() => {
    useRouterMock.mockReturnValue({
      push: vi.fn(),
      replace: vi.fn(),
    });
    useWorkspaceContextMock.mockReturnValue({
      workspace: {
        id: "workspace-1",
        slug: "default",
        isArchived: false,
        automationEmailEnabled: false,
        automationTelegramEnabled: false,
      },
      isWorkspaceAdmin: true,
      buildWorkspaceHref: (path: string) => `/w/default/${path}`,
    });
    useNodeMock.mockReturnValue({
      data: buildNode(),
      isPending: false,
      isError: false,
    });
    useWorkspaceTeamsMock.mockReturnValue({
      data: [],
    });
    useUpdateNodeTeamMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    useUpdateNodeNotificationsMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useUpdateNodeRootAccessMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    useEnableNodeMaintenanceMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    useDisableNodeMaintenanceMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    useNodeRealtimeSubscriptionMock.mockReturnValue(undefined);
  });

  it("opens the modal, shows helper notes, and enables save only when dirty", () => {
    render(<NodeDetailView id="node-1" />);

    expect(screen.getByText(/^Active$/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /notification settings/i }),
    );

    const saveButton = screen.getByRole("button", {
      name: /save notification settings/i,
    });

    expect(saveButton).toBeDisabled();
    expect(
      screen.getByText(/workspace email automation is currently off/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/workspace telegram automation is currently off/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /email info/i }));

    expect(saveButton).not.toBeDisabled();
  });

  it("disables notification switches for non-admin users", () => {
    useWorkspaceContextMock.mockReturnValue({
      workspace: {
        id: "workspace-1",
        slug: "default",
        isArchived: false,
        automationEmailEnabled: true,
        automationTelegramEnabled: true,
      },
      isWorkspaceAdmin: false,
      buildWorkspaceHref: (path: string) => `/w/default/${path}`,
    });

    render(<NodeDetailView id="node-1" />);

    fireEvent.click(
      screen.getByRole("button", { name: /notification settings/i }),
    );

    expect(
      screen.getByRole("switch", { name: /email notifications/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("switch", { name: /telegram notifications/i }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /email info/i })).toBeDisabled();
  });
});
