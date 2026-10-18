/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#avoid-zones. */

export type AvoidZone = {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  radius_m: number;
  created_at: string;
};

export type NewAvoidZone = {
  name?: string;
  lat: number;
  lng: number;
  radius_m: number;
};

export const MIN_ZONE_RADIUS_M = 50;
export const MAX_ZONE_RADIUS_M = 500;
