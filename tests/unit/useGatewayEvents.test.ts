import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGatewayEvents } from "@/lib/gateway/useGatewayEvents";
import type { EventFrame, GatewayClient } from "@/lib/gateway/GatewayClient";

function createMockClient() {
  const handlers = new Set<(e: EventFrame) => void>();
  return {
    onEvent: vi.fn((handler: (e: EventFrame) => void) => {
      handlers.add(handler);
      return () => { handlers.delete(handler); };
    }),
    emit(event: EventFrame) {
      handlers.forEach((h) => h(event));
    },
    get handlerCount() { return handlers.size; },
  };
}

function mkEvent(event: string, payload?: unknown): EventFrame {
  return { type: "event", event, payload };
}

describe("useGatewayEvents", () => {
  let client: ReturnType<typeof createMockClient>;
  let callback: ReturnType<typeof vi.fn<(e: EventFrame) => void>>;

  beforeEach(() => {
    client = createMockClient();
    callback = vi.fn<(e: EventFrame) => void>();
  });

  it("subscribes on mount and unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useGatewayEvents(client as unknown as GatewayClient, null, callback),
    );

    expect(client.onEvent).toHaveBeenCalledOnce();
    expect(client.handlerCount).toBe(1);

    unmount();
    expect(client.handlerCount).toBe(0);
  });

  it("receives all events when filter is null", () => {
    renderHook(() =>
      useGatewayEvents(client as unknown as GatewayClient, null, callback),
    );

    client.emit(mkEvent("chat.message", { text: "hi" }));
    client.emit(mkEvent("agent.spawn", { id: "a1" }));

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("filters by single event type string", () => {
    renderHook(() =>
      useGatewayEvents(client as unknown as GatewayClient, "chat.message", callback),
    );

    client.emit(mkEvent("chat.message", { text: "hi" }));
    client.emit(mkEvent("agent.spawn", { id: "a1" }));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(mkEvent("chat.message", { text: "hi" }));
  });

  it("filters by array of event types", () => {
    renderHook(() =>
      useGatewayEvents(
        client as unknown as GatewayClient,
        ["chat.message", "error"],
        callback,
      ),
    );

    client.emit(mkEvent("chat.message"));
    client.emit(mkEvent("error"));
    client.emit(mkEvent("agent.spawn"));

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("filters by predicate function", () => {
    renderHook(() =>
      useGatewayEvents(
        client as unknown as GatewayClient,
        (e) => e.event.startsWith("chat."),
        callback,
      ),
    );

    client.emit(mkEvent("chat.message"));
    client.emit(mkEvent("chat.typing"));
    client.emit(mkEvent("agent.spawn"));

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("does not subscribe when client is null", () => {
    const { unmount } = renderHook(() =>
      useGatewayEvents(null, null, callback),
    );

    expect(callback).not.toHaveBeenCalled();
    unmount(); // should not throw
  });
});
