/** Matches backend `app/schemas/routes.py` for POST /api/routes. */

export type RouteRequest = {
  origin_lat: number;
  origin_lng: number;
  dest_lat: number;
  dest_lng: number;
  departure_time: string;
};

export type LineStringGeometry = {
  type: "LineString";
  /** GeoJSON positions as [longitude, latitude]. */
  coordinates: [number, number][];
};

export type RouteMetrics = {
  distance_m: number;
  duration_s: number;
  duration_min: number;
  extra_minutes_vs_fastest: number;
};

export type RouteFactors = {
  edge_count: number;
  edges_near_streetlights: number;
  edges_near_sidewalks: number;
  edges_near_marked_crosswalks: number;
  open_place_proximity_sum: number;
  streetlight_coverage_share: number | null;
  sidewalk_coverage_share: number | null;
  safety_mix: number | null;
};

export type RoutePayload = {
  geometry: LineStringGeometry;
  metrics: RouteMetrics;
  explanation: string;
  factors: RouteFactors;
};

export type DataCoverage = {
  walking_network: boolean;
  streetlights: boolean;
  sidewalks: boolean;
  crosswalks: boolean;
  places: boolean;
  unavailable: string[];
  notes: string[];
};

export type Provenance = {
  layer: string;
  source: string;
  fetched_at: string;
  ok: boolean;
  feature_count: number | null;
  error: string | null;
};

export type RouteResponse = {
  fastest: RoutePayload;
  safety_focused: RoutePayload;
  routes_identical: boolean;
  data_coverage: DataCoverage;
  provenance: Provenance[];
  departure_time_local: string;
  mock: boolean;
};
