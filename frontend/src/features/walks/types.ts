/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#walks. */

import type { LineStringGeometry } from "../../types";
import type { WalkFeedback } from "../feedback/types";

export type RouteChoice = "fastest" | "safety_focused";

/** `place_id` is set when the point matches one of the walker's saved places. */
export type WalkEndpoint = {
  label?: string;
  place_id?: string;
  lat: number;
  lng: number;
};

export type Walk = {
  id: string;
  started_at: string;
  ended_at: string;
  ended_by: "user" | "arrived";
  origin: WalkEndpoint;
  destination: WalkEndpoint;
  route_choice: RouteChoice;
  planned_distance_m: number;
  planned_duration_min: number;
  actual_duration_min: number;
  /** The planned line at the start of the walk. The GPS trace is not stored. */
  geometry: LineStringGeometry;
  feedback?: WalkFeedback | null;
};

export type NewWalk = Omit<Walk, "id" | "feedback">;

export type WalkPage = {
  walks: Walk[];
  next_cursor: string | null;
};
