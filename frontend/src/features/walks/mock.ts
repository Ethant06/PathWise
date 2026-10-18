import { readJson, removeKey, writeJson } from "../../storage/local";
import { localId, mockCall } from "../shared/mock";
import type { WalksService } from "./service";
import type { NewWalk, Walk } from "./types";

/** Walks this phone recorded, newest first. Nothing leaves the device in mock mode. */
export const WALKS_KEY = "walks.v1";

export function readStoredWalks() {
  return readJson<Walk[]>(WALKS_KEY, []);
}

export function writeStoredWalks(walks: Walk[]) {
  return writeJson(WALKS_KEY, walks);
}

export const mockWalksService: WalksService = {
  list: () => mockCall(readStoredWalks),
  create: (walk) =>
    mockCall(async () => {
      const saved: Walk = { ...walk, id: localId("walk"), feedback: null };
      await writeStoredWalks([saved, ...(await readStoredWalks())]);
      return saved;
    }),
  remove: (id) =>
    mockCall(async () => {
      await writeStoredWalks((await readStoredWalks()).filter((walk) => walk.id !== id));
    }),
  removeAll: () => mockCall(() => removeKey(WALKS_KEY)),
};

/** Two points on campus for the developer-only sample walks. */
const SAMPLE_FROM = { label: "Sample: Odegaard", place_id: "sample_odegaard", lat: 47.65647, lng: -122.31042 };
const SAMPLE_TO = { label: "Sample: HUB", place_id: "sample_hub", lat: 47.65553, lng: -122.30508 };

/**
 * Developer-only: three finished sample walks between the same two points, so the commute
 * summary (median and range) can be checked without walking. Each is labeled "Sample".
 */
export function sampleWalks(): NewWalk[] {
  const minutes = [6.5, 5.4, 7.8];
  return minutes.map((actual, index): NewWalk => {
    const end = Date.now() - (index + 1) * 86_400_000;
    return {
      started_at: new Date(end - actual * 60_000).toISOString(),
      ended_at: new Date(end).toISOString(),
      ended_by: "arrived",
      origin: SAMPLE_FROM,
      destination: SAMPLE_TO,
      route_choice: index === 1 ? "fastest" : "safety_focused",
      planned_distance_m: 434,
      planned_duration_min: 5.4,
      actual_duration_min: actual,
      geometry: {
        type: "LineString",
        coordinates: [
          [SAMPLE_FROM.lng, SAMPLE_FROM.lat],
          [-122.30905, 47.65612],
          [-122.30702, 47.65588],
          [SAMPLE_TO.lng, SAMPLE_TO.lat],
        ],
      },
    };
  });
}
