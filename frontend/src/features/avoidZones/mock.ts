import { readJson, writeJson } from "../../storage/local";
import { localId, mockCall } from "../shared/mock";
import type { AvoidZonesService } from "./service";
import { MAX_ZONE_RADIUS_M, MIN_ZONE_RADIUS_M, type AvoidZone } from "./types";

/** The walker's own zones, kept on this phone in mock mode. No seed data. */
const KEY = "avoidZones.v1";

function read() {
  return readJson<AvoidZone[]>(KEY, []);
}

export const mockAvoidZonesService: AvoidZonesService = {
  list: () => mockCall(read),
  create: (zone) =>
    mockCall(async () => {
      if (zone.radius_m < MIN_ZONE_RADIUS_M || zone.radius_m > MAX_ZONE_RADIUS_M) {
        throw new Error(`Pick a radius between ${MIN_ZONE_RADIUS_M} and ${MAX_ZONE_RADIUS_M} m.`);
      }
      const saved: AvoidZone = {
        id: localId("zone"),
        name: zone.name?.trim() || null,
        lat: zone.lat,
        lng: zone.lng,
        radius_m: zone.radius_m,
        created_at: new Date().toISOString(),
      };
      await writeJson(KEY, [...(await read()), saved]);
      return saved;
    }),
  remove: (id) =>
    mockCall(async () => {
      await writeJson(
        KEY,
        (await read()).filter((zone) => zone.id !== id),
      );
    }),
};
