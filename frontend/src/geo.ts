export type LatLng = { latitude: number; longitude: number };

const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_DEG_LNG = 75_000;

/** Leave the drawn path by about this far before asking for a new route. */
export const OFF_ROUTE_METERS = 40;
/** Close enough to the pin to stop recalculating. */
export const ARRIVE_METERS = 30;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dy = (a.latitude - b.latitude) * METERS_PER_DEG_LAT;
  const dx = (a.longitude - b.longitude) * METERS_PER_DEG_LNG;
  return Math.hypot(dx, dy);
}

function distanceToSegment(point: LatLng, start: LatLng, end: LatLng): number {
  const ax = start.longitude * METERS_PER_DEG_LNG;
  const ay = start.latitude * METERS_PER_DEG_LAT;
  const bx = end.longitude * METERS_PER_DEG_LNG;
  const by = end.latitude * METERS_PER_DEG_LAT;
  const px = point.longitude * METERS_PER_DEG_LNG;
  const py = point.latitude * METERS_PER_DEG_LAT;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Total length in meters of a route line. */
export function pathLength(path: LatLng[]): number {
  let total = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    total += distanceMeters(path[index], path[index + 1]);
  }
  return total;
}

/**
 * Meters left along a route line from the point on it closest to the walker. Used for the
 * walk session's "left to walk" figure; straight-line distance would undercount bends.
 */
export function remainingAlongPath(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return 0;
  if (path.length === 1) return distanceMeters(point, path[0]);
  let bestIndex = 0;
  let bestT = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const ax = start.longitude * METERS_PER_DEG_LNG;
    const ay = start.latitude * METERS_PER_DEG_LAT;
    const dx = end.longitude * METERS_PER_DEG_LNG - ax;
    const dy = end.latitude * METERS_PER_DEG_LAT - ay;
    const px = point.longitude * METERS_PER_DEG_LNG - ax;
    const py = point.latitude * METERS_PER_DEG_LAT - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, (px * dx + py * dy) / lengthSquared));
    const distance = Math.hypot(px - t * dx, py - t * dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
      bestT = t;
    }
  }
  const current = distanceMeters(path[bestIndex], path[bestIndex + 1]) * (1 - bestT);
  return current + pathLength(path.slice(bestIndex + 1));
}

/** Shortest distance in meters from a GPS point to a route line. */
export function distanceToPath(point: LatLng, path: LatLng[]): number {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  if (path.length === 1) return distanceMeters(point, path[0]);
  let best = Number.POSITIVE_INFINITY;
  for (let index = 0; index < path.length - 1; index += 1) {
    best = Math.min(best, distanceToSegment(point, path[index], path[index + 1]));
  }
  return best;
}
