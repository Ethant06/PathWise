/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#saved-places. */

export type SavedPlaceLabel = "home" | "work" | "school" | "custom";

export type SavedPlace = {
  id: string;
  label: SavedPlaceLabel;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
};

export type SavedPlaceInput = {
  label: SavedPlaceLabel;
  name: string;
  lat: number;
  lng: number;
};

export type SavedPlacePatch = Partial<SavedPlaceInput>;
