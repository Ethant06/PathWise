import type { RouteChoice, Walk } from "./types";

/** "4:05" under an hour, "1 h 05 min" after. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, "0")} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function routeChoiceLabel(choice: RouteChoice): string {
  return choice === "fastest" ? "Fastest" : "Safer";
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function endpointLabel(endpoint: Walk["origin"], fallback: string): string {
  return endpoint.label?.trim() || fallback;
}

export type Commute = {
  key: string;
  from: string;
  to: string;
  count: number;
  medianMin: number;
  minMin: number;
  maxMin: number;
};

/** Minimum walks between the same two saved places before a typical time is shown. */
export const COMMUTE_MIN_WALKS = 3;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Typical actual walk time between two saved places, once there are at least three walks.
 * Only walks that ended at the destination count, so a walk cut short does not skew it.
 */
export function commutes(walks: Walk[]): Commute[] {
  const groups = new Map<string, Walk[]>();
  for (const walk of walks) {
    if (walk.ended_by !== "arrived" || !walk.origin.place_id || !walk.destination.place_id) continue;
    const key = `${walk.origin.place_id}->${walk.destination.place_id}`;
    groups.set(key, [...(groups.get(key) ?? []), walk]);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.length >= COMMUTE_MIN_WALKS)
    .map(([key, group]) => {
      const minutes = group.map((walk) => walk.actual_duration_min);
      return {
        key,
        from: endpointLabel(group[0].origin, "Start"),
        to: endpointLabel(group[0].destination, "Destination"),
        count: group.length,
        medianMin: median(minutes),
        minMin: Math.min(...minutes),
        maxMin: Math.max(...minutes),
      };
    });
}

/** The commute this walk belongs to, if any. */
export function commuteFor(walk: Walk, all: Commute[]): Commute | null {
  if (!walk.origin.place_id || !walk.destination.place_id) return null;
  return all.find((commute) => commute.key === `${walk.origin.place_id}->${walk.destination.place_id}`) ?? null;
}
