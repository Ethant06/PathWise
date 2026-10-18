import { readJson, writeJson } from "../../storage/local";
import { localId, mockCall } from "../shared/mock";
import type { SavedPlacesService } from "./service";
import type { SavedPlace } from "./types";

/**
 * Saved places live only on this phone in mock mode. There is no seed data: a home address
 * is the walker's own, and sample homes would be confusing.
 */
const KEY = "savedPlaces.v1";

function read() {
  return readJson<SavedPlace[]>(KEY, []);
}

export const mockSavedPlacesService: SavedPlacesService = {
  list: () => mockCall(read),
  create: (input) =>
    mockCall(async () => {
      const place: SavedPlace = {
        id: localId("place"),
        label: input.label,
        name: input.name.trim(),
        lat: input.lat,
        lng: input.lng,
        created_at: new Date().toISOString(),
      };
      await writeJson(KEY, [...(await read()), place]);
      return place;
    }),
  update: (id, patch) =>
    mockCall(async () => {
      const all = await read();
      const current = all.find((place) => place.id === id);
      if (!current) throw new Error("That saved place no longer exists.");
      const next: SavedPlace = { ...current, ...patch, name: (patch.name ?? current.name).trim() };
      await writeJson(
        KEY,
        all.map((place) => (place.id === id ? next : place)),
      );
      return next;
    }),
  remove: (id) =>
    mockCall(async () => {
      await writeJson(
        KEY,
        (await read()).filter((place) => place.id !== id),
      );
    }),
};
