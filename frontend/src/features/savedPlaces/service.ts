import { createSavedPlace, deleteSavedPlace, listSavedPlaces, updateSavedPlace } from "../../api";
import { usesApi } from "../../config/features";
import { requireToken } from "../shared/auth";
import { createCollection } from "../shared/collection";
import { mockSavedPlacesService } from "./mock";
import type { SavedPlace, SavedPlaceInput, SavedPlacePatch } from "./types";

export interface SavedPlacesService {
  list(): Promise<SavedPlace[]>;
  create(input: SavedPlaceInput): Promise<SavedPlace>;
  update(id: string, patch: SavedPlacePatch): Promise<SavedPlace>;
  remove(id: string): Promise<void>;
}

const apiSavedPlacesService: SavedPlacesService = {
  list: async () => listSavedPlaces(await requireToken("sync saved places")),
  create: async (input) => createSavedPlace(await requireToken("save places"), input),
  update: async (id, patch) => updateSavedPlace(await requireToken("change saved places"), id, patch),
  remove: async (id) => deleteSavedPlace(await requireToken("delete saved places"), id),
};

export function savedPlacesService(): SavedPlacesService {
  return usesApi("savedPlaces") ? apiSavedPlacesService : mockSavedPlacesService;
}

/** Device-only while the source is "mock"; synced to the walker's account when it is "api". */
export function savedPlacesAreLocal(): boolean {
  return !usesApi("savedPlaces");
}

export const savedPlaces = createCollection(() => savedPlacesService().list(), "Could not load saved places.");
