import type { DataStatusResponse, LineStringGeometry } from "./types";

const METERS_PER_MILE = 1609.344;

export function formatMiles(meters: number): string {
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

export function formatMinutes(minutes: number): string {
  return `${Math.max(1, Math.round(minutes))} min`;
}

/** GeoJSON positions are [longitude, latitude]; react-native-maps wants objects. */
export function toLatLngs(geometry: LineStringGeometry) {
  return geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
}

/** Map region covering the API's bbox ([west, south, east, north]), centered on its center. */
export function regionFromStatus(status: DataStatusResponse) {
  const [west, south, east, north] = status.bbox;
  const hasBbox = status.bbox.length === 4;
  return {
    latitude: status.center.lat,
    longitude: status.center.lng,
    latitudeDelta: hasBbox ? Math.abs(north - south) : 0.02,
    longitudeDelta: hasBbox ? Math.abs(east - west) : 0.02,
  };
}
