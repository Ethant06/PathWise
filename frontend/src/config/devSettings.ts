import { useSyncExternalStore } from "react";

/**
 * Developer switch that makes every mock call fail, so error states can be tested.
 * It only works in development builds of the JS bundle (__DEV__) and resets when the app reloads.
 */
let failMocks = false;
const listeners = new Set<() => void>();

export function mocksShouldFail(): boolean {
  return __DEV__ && failMocks;
}

export function setMocksShouldFail(value: boolean): void {
  failMocks = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMocksShouldFail(): boolean {
  return useSyncExternalStore(subscribe, mocksShouldFail);
}
