import { lightingLayer } from "../../api";
import { usesApi } from "../../config/features";
import type { Bbox } from "../shared/area";
import { mockLightingService } from "./mock";
import type { LightingLayer } from "./types";

export interface LightingService {
  layer(bbox: Bbox, time: string): Promise<LightingLayer>;
}

const apiLightingService: LightingService = {
  layer: (bbox, time) => lightingLayer(bbox, time),
};

export function lightingService(): LightingService {
  return usesApi("lightingLayer") ? apiLightingService : mockLightingService;
}

export function lightingIsSample(): boolean {
  return !usesApi("lightingLayer");
}

export type LightingTime = { key: "now" | "tonight"; label: string; at: Date };

/** "Now", and 9 PM tonight (or an hour from now once it is past 9 PM). */
export function lightingTimes(now = new Date()): LightingTime[] {
  const tonight = new Date(now);
  tonight.setHours(21, 0, 0, 0);
  const later = tonight > now ? tonight : new Date(now.getTime() + 3_600_000);
  const label = tonight > now ? "Tonight, 9 PM" : "In 1 hour";
  return [
    { key: "now", label: "Now", at: now },
    { key: "tonight", label, at: later },
  ];
}
