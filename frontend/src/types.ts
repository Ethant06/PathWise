/** Field names match mock-api/app/schemas. Do not add fields the API does not return. */

export type UserPublic = {
  id: number;
  name: string;
  email: string;
  auth_provider: "password" | "google";
};

export type TokenResponse = {
  access_token: string;
  token_type: "bearer";
  user: UserPublic;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type GoogleLoginRequest = {
  id_token: string;
};

export type HealthResponse = {
  ok: boolean;
  ready: boolean;
  mock: boolean;
};

export type MapCenter = {
  lat: number;
  lng: number;
};

export type DataStatusResponse = {
  ready: boolean;
  message: string;
  center: MapCenter;
  /** [west, south, east, north] */
  bbox: number[];
  layers: Record<string, unknown>;
  mock: boolean;
};

export type PlaceHit = {
  name: string;
  lat: number;
  lng: number;
  category: string;
  osm_id: string;
  opening_hours: string | null;
};

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
