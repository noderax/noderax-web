import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  buildOperatorDisclaimerSessionStorageKey,
  buildOperatorDisclaimerStorageKey,
  OperatorDisclaimerModal,
} from "@/components/layout/operator-disclaimer-modal";
import type { AuthSession } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const baseSession: AuthSession = {
  user: {
    id: "user-1",
    name: "Operator",
    email: "operator@example.com",
    role: "platform_admin",
    isActive: true,
    timezone: "Europe/Istanbul",
    inviteStatus: "accepted",
    lastInvitedAt: null,
    activatedAt: "2026-04-01T00:00:00.000Z",
    criticalEventEmailsEnabled: true,
    enrollmentEmailsEnabled: true,
    mfaEnabled: false,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  scopes: ["nodes:read", "tasks:read", "events:read", "metrics:read"],
  expiresAt: null,
  tokenPreview: "token-a...preview",
};

const renderModal = (session: AuthSession = baseSession) => {
  useAppStore.setState({ session });

  return render(<OperatorDisclaimerModal />);
};

describe("OperatorDisclaimerModal", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAppStore.setState({
      session: null,
      activeWorkspaceSlug: null,
    });
  });

  it("shows when no storage keys exist", async () => {
    renderModal();

    expect(
      await screen.findByText("Operational Use Disclaimer"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Noderax provides operational controls/),
    ).toBeInTheDocument();
  });

  it("acknowledges without the checkbox and writes only the login-session key", async () => {
    renderModal();

    fireEvent.click(
      await screen.findByRole("button", { name: "I acknowledge" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByText("Operational Use Disclaimer"),
      ).not.toBeInTheDocument();
    });

    expect(
      window.localStorage.getItem(
        buildOperatorDisclaimerSessionStorageKey(
          baseSession.user.id,
          baseSession.tokenPreview,
        ),
      ),
    ).toBe("1");
    expect(
      window.localStorage.getItem(
        buildOperatorDisclaimerStorageKey(baseSession.user.id),
      ),
    ).toBeNull();
  });

  it("acknowledges with the checkbox and writes the permanent key", async () => {
    renderModal();

    fireEvent.click(
      await screen.findByLabelText("Don't show this again on this browser."),
    );
    fireEvent.click(screen.getByRole("button", { name: "I acknowledge" }));

    await waitFor(() => {
      expect(
        screen.queryByText("Operational Use Disclaimer"),
      ).not.toBeInTheDocument();
    });

    expect(
      window.localStorage.getItem(
        buildOperatorDisclaimerSessionStorageKey(
          baseSession.user.id,
          baseSession.tokenPreview,
        ),
      ),
    ).toBe("1");
    expect(
      window.localStorage.getItem(
        buildOperatorDisclaimerStorageKey(baseSession.user.id),
      ),
    ).toBe("1");
  });

  it("does not show when the permanent key exists", () => {
    window.localStorage.setItem(
      buildOperatorDisclaimerStorageKey(baseSession.user.id),
      "1",
    );

    renderModal();

    expect(
      screen.queryByText("Operational Use Disclaimer"),
    ).not.toBeInTheDocument();
  });

  it("uses the token preview to distinguish login sessions", async () => {
    const nextSession: AuthSession = {
      ...baseSession,
      tokenPreview: "token-b...preview",
    };

    window.localStorage.setItem(
      buildOperatorDisclaimerSessionStorageKey(
        baseSession.user.id,
        baseSession.tokenPreview,
      ),
      "1",
    );

    const { unmount } = renderModal();

    expect(
      screen.queryByText("Operational Use Disclaimer"),
    ).not.toBeInTheDocument();

    unmount();
    renderModal(nextSession);

    expect(
      await screen.findByText("Operational Use Disclaimer"),
    ).toBeInTheDocument();
  });
});
