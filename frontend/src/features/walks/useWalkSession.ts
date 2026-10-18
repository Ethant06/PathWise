import { useEffect, useState } from "react";

import { remainingAlongPath, type LatLng } from "../../geo";
import type { RoutePayload } from "../../types";
import type { NewWalk, RouteChoice, WalkEndpoint } from "./types";

/** What the walk session needs from the screen that starts it. */
export type WalkPlan = {
  origin: WalkEndpoint;
  destination: WalkEndpoint;
  onEnded: (walk: NewWalk) => void;
};

/** Close enough to the destination to end the walk on its own. */
export const AUTO_END_METERS = 40;

/**
 * Foreground walk session used by the navigation screen: elapsed time, meters left along the
 * route line, and the record saved to history when the walk ends. No background tracking.
 */
export function useWalkSession({
  choice,
  initialRoute,
  path,
  here,
}: {
  choice: RouteChoice;
  /** The route chosen at the start. Reroutes do not change the planned figures. */
  initialRoute: RoutePayload;
  /** The line being followed now (it changes after a reroute). */
  path: LatLng[];
  here: LatLng | null;
}) {
  const [startedAt] = useState(() => new Date());
  const [planned] = useState(initialRoute);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const elapsedMs = Math.max(0, now - startedAt.getTime());
  const remainingMeters = here ? remainingAlongPath(here, path) : null;

  function buildWalk(endedBy: NewWalk["ended_by"], origin: WalkEndpoint, destination: WalkEndpoint): NewWalk {
    const endedAt = new Date();
    return {
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      ended_by: endedBy,
      origin,
      destination,
      route_choice: choice,
      planned_distance_m: planned.metrics.distance_m,
      planned_duration_min: planned.metrics.duration_min,
      actual_duration_min: Math.round(((endedAt.getTime() - startedAt.getTime()) / 60_000) * 10) / 10,
      geometry: planned.geometry,
    };
  }

  return { startedAt, elapsedMs, remainingMeters, buildWalk };
}
