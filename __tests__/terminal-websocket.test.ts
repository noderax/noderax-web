import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const emitWithAckMock = vi.fn();
const timeoutMock = vi.fn(() => ({
  emitWithAck: emitWithAckMock,
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiClient: {
    refreshTerminalSessionConnectToken: vi.fn(),
  },
}));

import { NoderaxTerminalClient } from "@/lib/terminal-websocket";

describe("NoderaxTerminalClient input buffering", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    emitWithAckMock.mockReset();
    timeoutMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("batches rapid terminal input into a single websocket request", async () => {
    emitWithAckMock.mockResolvedValue({ ok: true });

    const client = new NoderaxTerminalClient();
    (client as never as { socket: unknown }).socket = {
      connected: true,
      timeout: timeoutMock,
    };
    (client as never as { status: string }).status = "connected";
    (client as never as { sessionId: string }).sessionId =
      "9ea30193-3c8c-4d3a-b1ab-3428a8a25735";

    await Promise.all([
      client.sendInput("9ea30193-3c8c-4d3a-b1ab-3428a8a25735", "e"),
      client.sendInput("9ea30193-3c8c-4d3a-b1ab-3428a8a25735", "c"),
      client.sendInput("9ea30193-3c8c-4d3a-b1ab-3428a8a25735", "h"),
      client.sendInput("9ea30193-3c8c-4d3a-b1ab-3428a8a25735", "o"),
    ]);

    await vi.advanceTimersByTimeAsync(TERMINAL_INPUT_FLUSH_DELAY_MS_FOR_TEST);

    expect(timeoutMock).toHaveBeenCalledTimes(1);
    expect(emitWithAckMock).toHaveBeenCalledTimes(1);
    expect(emitWithAckMock).toHaveBeenCalledWith("terminal.input", {
      sessionId: "9ea30193-3c8c-4d3a-b1ab-3428a8a25735",
      payload: "ZWNobw==",
    });
  });

  it("retries queued input after a rate limit response without dropping the payload", async () => {
    emitWithAckMock
      .mockResolvedValueOnce({
        ok: false,
        message: "Terminal input rate limit exceeded for this socket.",
      })
      .mockResolvedValueOnce({ ok: true });

    const client = new NoderaxTerminalClient();
    (client as never as { socket: unknown }).socket = {
      connected: true,
      timeout: timeoutMock,
    };
    (client as never as { status: string }).status = "connected";
    (client as never as { sessionId: string }).sessionId =
      "9ea30193-3c8c-4d3a-b1ab-3428a8a25735";

    await client.sendInput("9ea30193-3c8c-4d3a-b1ab-3428a8a25735", "ls\n");
    await vi.advanceTimersByTimeAsync(TERMINAL_INPUT_FLUSH_DELAY_MS_FOR_TEST);

    expect(emitWithAckMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(TERMINAL_INPUT_RATE_LIMIT_RETRY_DELAY_MS_FOR_TEST);

    expect(emitWithAckMock).toHaveBeenCalledTimes(2);
    expect(emitWithAckMock).toHaveBeenLastCalledWith("terminal.input", {
      sessionId: "9ea30193-3c8c-4d3a-b1ab-3428a8a25735",
      payload: "bHMK",
    });
  });
});

const TERMINAL_INPUT_FLUSH_DELAY_MS_FOR_TEST = 8;
const TERMINAL_INPUT_RATE_LIMIT_RETRY_DELAY_MS_FOR_TEST = 5_000;
