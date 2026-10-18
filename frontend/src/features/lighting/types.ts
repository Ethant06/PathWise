/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#lighting-layer. */

import type { LineStringGeometry } from "../../types";

/**
 * `lit: true` means a streetlight is recorded near the segment, `false` means none is recorded,
 * and `null` means there is no data. "Unlit" never means "dangerous".
 */
export type LightingProperties = {
  lit: boolean | null;
  source: string;
};

export type LightingFeature = {
  type: "Feature";
  geometry: LineStringGeometry;
  properties: LightingProperties;
};

export type LightingLayer = {
  type: "FeatureCollection";
  features: LightingFeature[];
};
