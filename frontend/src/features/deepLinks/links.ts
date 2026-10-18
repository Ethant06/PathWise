import * as Linking from "expo-linking";

import type { SavedPlace } from "../savedPlaces/types";

/**
 * Deep links (4.13): pathwise://route?to=home opens the map with the current location as the
 * start and the saved place as the destination. `to` is home, work, school, or a custom name.
 * In Expo Go the same link is exp://<dev server>/--/route?to=home (see devRouteLink).
 */
export function routeLinkTarget(place: SavedPlace): string {
  return place.label === "custom" ? place.name.trim() : place.label;
}

export function appRouteLink(target: string): string {
  return `pathwise://route?to=${encodeURIComponent(target)}`;
}

/** The link Expo generates for the running dev server, for testing in Expo Go. */
export function devRouteLink(target: string): string {
  return Linking.createURL("route", { queryParams: { to: target } });
}

/** The `to` value of a route link, or null for any other URL. */
export function parseRouteLink(url: string): string | null {
  const parsed = Linking.parse(url);
  // pathwise://route?to=home puts "route" in the hostname; Expo Go links put it in the path.
  const where = (parsed.path || parsed.hostname || "").replace(/^--\//, "").replace(/^\/+|\/+$/g, "");
  if (where !== "route") return null;
  const to = parsed.queryParams?.to;
  const value = Array.isArray(to) ? to[0] : to;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function findLinkedPlace(target: string, places: SavedPlace[]): SavedPlace | null {
  const wanted = target.toLowerCase();
  return (
    places.find((place) => place.label !== "custom" && place.label === wanted) ??
    places.find((place) => place.name.trim().toLowerCase() === wanted) ??
    null
  );
}
