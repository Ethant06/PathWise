import { mocksShouldFail } from "../../config/devSettings";

/** Center of the UW campus, used to place sample data. */
export const UW_CENTER = { lat: 47.6553, lng: -122.3035 };

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a mock implementation so it behaves like a network call: 300–800 ms of delay,
 * and a failure when the developer switch in Profile is on.
 */
export async function mockCall<T>(work: () => T | Promise<T>): Promise<T> {
  await wait(300 + Math.random() * 500);
  if (mocksShouldFail()) {
    throw new Error("Sample data failed on purpose. Turn off “Make sample data fail” in Profile.");
  }
  return work();
}

/** Random id for records created on the device. */
export function localId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** An ISO time `hours` before now. */
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}
