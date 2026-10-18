import { distanceMeters } from "../../geo";
import type { PlaceHit } from "../../types";
import type { WalkEndpoint } from "../walks/types";
import type { SavedPlace, SavedPlaceLabel } from "./types";

export const LABELS: { value: SavedPlaceLabel; text: string }[] = [
  { value: "home", text: "Home" },
  { value: "work", text: "Work" },
  { value: "school", text: "School" },
  { value: "custom", text: "Custom" },
];

export function labelText(label: SavedPlaceLabel): string {
  return LABELS.find((item) => item.value === label)?.text ?? "Place";
}

/** "Home", or the custom name. */
export function placeTitle(place: SavedPlace): string {
  return place.label === "custom" ? place.name : labelText(place.label);
}

/** Saved places as destinations on the map screen. */
export function placeAsHit(place: SavedPlace): PlaceHit {
  return {
    name: placeTitle(place),
    lat: place.lat,
    lng: place.lng,
    category: place.label === "custom" ? "" : labelText(place.label).toLowerCase(),
    osm_id: `saved:${place.id}`,
    opening_hours: null,
  };
}

/** Within this distance a walk's start or end counts as a saved place. */
const MATCH_METERS = 75;

export function matchSavedPlace(lat: number, lng: number, places: SavedPlace[]): SavedPlace | null {
  let best: SavedPlace | null = null;
  let bestDistance = MATCH_METERS;
  for (const place of places) {
    const distance = distanceMeters({ latitude: lat, longitude: lng }, { latitude: place.lat, longitude: place.lng });
    if (distance <= bestDistance) {
      best = place;
      bestDistance = distance;
    }
  }
  return best;
}

/** A walk endpoint, labeled with the matching saved place when there is one. */
export function walkEndpoint(lat: number, lng: number, places: SavedPlace[], fallbackLabel?: string): WalkEndpoint {
  const match = matchSavedPlace(lat, lng, places);
  if (match) return { label: placeTitle(match), place_id: match.id, lat, lng };
  return { ...(fallbackLabel ? { label: fallbackLabel } : {}), lat, lng };
}
