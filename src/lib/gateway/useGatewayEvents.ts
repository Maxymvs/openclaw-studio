"use client";

import { useEffect, useRef } from "react";
import type { EventFrame } from "./GatewayClient";
import type { GatewayClient } from "./GatewayClient";

/**
 * Filter for gateway events. Pass a string or array of event type names,
 * or a predicate function for custom filtering.
 */
export type EventFilter =
  | string
  | string[]
  | ((event: EventFrame) => boolean);

/**
 * Subscribe to gateway EventFrames, optionally filtered by event type.
 *
 * @param client  - GatewayClient instance (or null if not yet available)
 * @param filter  - Event type string, array of types, or predicate function.
 *                  Pass `null` or `undefined` to receive all events.
 * @param callback - Called for each matching event.
 */
export function useGatewayEvents(
  client: GatewayClient | null | undefined,
  filter: EventFilter | null | undefined,
  callback: (event: EventFrame) => void,
): void {
  // Keep callback ref stable to avoid re-subscribing on every render
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  // Memoize filter to a stable predicate ref
  const filterRef = useRef(filter);
  filterRef.current = filter;

  useEffect(() => {
    if (!client) return;

    const handler = (event: EventFrame) => {
      const f = filterRef.current;
      if (f == null) {
        // No filter — pass everything through
        callbackRef.current(event);
        return;
      }
      if (typeof f === "string") {
        if (event.event === f) callbackRef.current(event);
        return;
      }
      if (Array.isArray(f)) {
        if (f.includes(event.event)) callbackRef.current(event);
        return;
      }
      // predicate function
      if (f(event)) callbackRef.current(event);
    };

    const unsubscribe = client.onEvent(handler);
    return unsubscribe;
  }, [client]);
}
