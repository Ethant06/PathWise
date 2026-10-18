/**
 * The area the backend's walk graph covers, as [west, south, east, north]. It matches BBOX in
 * backend/app/config.py and the bbox that GET /api/data-status returns.
 */
export type Bbox = [number, number, number, number];

export const UW_AREA_BBOX: Bbox = [-122.365, 47.62, -122.27, 47.7];

export function inBbox(lat: number, lng: number, [west, south, east, north]: Bbox): boolean {
  return lng >= west && lng <= east && lat >= south && lat <= north;
}
