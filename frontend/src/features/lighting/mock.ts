import { inBbox } from "../shared/area";
import { mockCall } from "../shared/mock";
import sample from "./sample-lighting.json";
import type { LightingService } from "./service";
import type { LightingFeature, LightingLayer } from "./types";

/**
 * 311 street and path segments within about 300 m of Red Square, taken from the backend's walk
 * graph (OpenStreetMap plus Seattle City Light poles, downloaded 2026-10-18).
 *
 * lit: true means a City Light pole is within 28 m. Streets with none are false. Campus paths
 * with none are null, because City Light does not record UW's own campus lights, so "no pole
 * recorded" there does not mean dark. The real endpoint should make the same distinction.
 */
// JSON imports type coordinates as number[][]; the file holds [lng, lat] pairs.
const features = (sample as unknown as LightingLayer).features as LightingFeature[];

export const mockLightingService: LightingService = {
  layer: (bbox) =>
    mockCall((): LightingLayer => ({
      type: "FeatureCollection",
      features: features.filter((feature) => {
        const [lng, lat] = feature.geometry.coordinates[0] ?? [0, 0];
        return inBbox(lat, lng, bbox);
      }),
    })),
};
