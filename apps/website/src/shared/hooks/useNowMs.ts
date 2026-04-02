import { useSyncExternalStore } from "react";

// Module-level singleton: one setInterval shared across all subscribers.
// The interval only runs while at least one component is subscribed.

let nowMs = Date.now();
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  if (listeners.size === 1) {
    intervalId = setInterval(() => {
      nowMs = Date.now();
      for (const fn of listeners) fn();
    }, 1000);
  }
  return () => {
    listeners.delete(callback);
    if (listeners.size === 0 && intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

function getSnapshot(): number {
  return nowMs;
}

function getServerSnapshot(): number {
  return Date.now();
}

/**
 * Returns a timestamp (ms) that updates every ~1 second while any component
 * is subscribed. Uses a shared singleton interval so multiple callers share
 * the same tick — only the components that call this hook re-render.
 */
export function useNowMs(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
