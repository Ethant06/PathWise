import { useEffect, useSyncExternalStore } from "react";

export type CollectionState<T> =
  | { status: "loading"; items: T[]; error: null }
  | { status: "ready"; items: T[]; error: null }
  | { status: "error"; items: T[]; error: string };

export type Collection<T> = {
  /** Subscribes a component. The first subscriber triggers the first load. */
  use: () => CollectionState<T>;
  get: () => CollectionState<T>;
  refresh: () => Promise<void>;
  /** Replace the cached list after a successful create, update, or delete. */
  set: (items: T[]) => void;
};

export function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * A cached list shared by every screen that shows it (saved places, zones, reports, walks).
 * Screens call the feature's service for changes, then `set` the new list here.
 */
export function createCollection<T>(load: () => Promise<T[]>, failure: string): Collection<T> {
  let state: CollectionState<T> = { status: "loading", items: [], error: null };
  let started = false;
  const listeners = new Set<() => void>();

  function publish(next: CollectionState<T>) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  async function refresh() {
    started = true;
    if (state.status === "error") publish({ status: "loading", items: state.items, error: null });
    try {
      publish({ status: "ready", items: await load(), error: null });
    } catch (error) {
      publish({ status: "error", items: state.items, error: errorText(error, failure) });
    }
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function use() {
    const snapshot = useSyncExternalStore(subscribe, () => state);
    useEffect(() => {
      if (!started) void refresh();
    }, []);
    return snapshot;
  }

  return {
    use,
    get: () => state,
    refresh,
    set: (items) => publish({ status: "ready", items, error: null }),
  };
}
