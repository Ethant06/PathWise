import { createAvoidZone, deleteAvoidZone, listAvoidZones } from "../../api";
import { usesApi } from "../../config/features";
import { distanceMeters, distanceToPath, type LatLng } from "../../geo";
import { requireToken } from "../shared/auth";
import { createCollection } from "../shared/collection";
import { mockAvoidZonesService } from "./mock";
import type { AvoidZone, NewAvoidZone } from "./types";

export interface AvoidZonesService {
  list(): Promise<AvoidZone[]>;
  create(zone: NewAvoidZone): Promise<AvoidZone>;
  remove(id: string): Promise<void>;
}

const apiAvoidZonesService: AvoidZonesService = {
  list: async () => listAvoidZones(await requireToken("sync avoid zones")),
  create: async (zone) => createAvoidZone(await requireToken("save an avoid zone"), zone),
  remove: async (id) => deleteAvoidZone(await requireToken("delete an avoid zone"), id),
};

export function avoidZonesService(): AvoidZonesService {
  return usesApi("avoidZones") ? apiAvoidZonesService : mockAvoidZonesService;
}

export const avoidZones = createCollection(() => avoidZonesService().list(), "Could not load your avoid zones.");

export function zoneName(zone: AvoidZone): string {
  return zone.name?.trim() || "Avoid zone";
}

function center(zone: AvoidZone): LatLng {
  return { latitude: zone.lat, longitude: zone.lng };
}

/** Zones a route line passes through. Checked on the phone; routing does not avoid them yet. */
export function zonesOnPath(path: LatLng[], zones: AvoidZone[]): AvoidZone[] {
  return zones.filter((zone) => distanceToPath(center(zone), path) <= zone.radius_m);
}

export function zoneAt(point: LatLng, zones: AvoidZone[]): AvoidZone | null {
  return zones.find((zone) => distanceMeters(point, center(zone)) <= zone.radius_m) ?? null;
}
