/**
 * One switch per feature. `source` picks the device mock or the API implementation in each
 * feature's service.ts. Switch a feature to "api" only after the backend ships its endpoint
 * (see the checklist at the top of frontend/BACKEND_CONTRACTS.md).
 */
export type FeatureSource = "mock" | "api";
export type FeatureFlag = { enabled: boolean; source: FeatureSource };

export type FeatureName =
  | "walkSession"
  | "savedPlaces"
  | "routeHistory"
  | "walkFeedback"
  | "reports"
  | "avoidZones"
  | "lightingLayer"
  | "weather"
  | "voice"
  | "deepLinks"
  | "accessibleRouting"
  | "walkingBuddy"
  | "travelModes"
  | "siriShortcut"
  | "liveActivity"
  | "homeWidget"
  | "voiceCommands";

export const features: Record<FeatureName, FeatureFlag> = {
  // Phase 1. Runs on the device; it has no endpoint of its own.
  walkSession: { enabled: true, source: "mock" },

  // Phase 2. Mock data on the device until the backend endpoints exist.
  savedPlaces: { enabled: true, source: "mock" },
  routeHistory: { enabled: true, source: "mock" },
  walkFeedback: { enabled: true, source: "mock" },
  // Phase 2, not finished: their services, mocks, and some screens exist (src/features/*),
  // but Home and Routes do not show them yet. Turn each on once it is wired in.
  reports: { enabled: false, source: "mock" },
  avoidZones: { enabled: false, source: "mock" },
  lightingLayer: { enabled: false, source: "mock" },
  weather: { enabled: false, source: "mock" },
  // Speech and deep links run on the device. They never call the API.
  voice: { enabled: false, source: "mock" },
  deepLinks: { enabled: false, source: "mock" },

  // Phase 3. Off until the team and the backend agree on the contract.
  accessibleRouting: { enabled: false, source: "mock" },
  walkingBuddy: { enabled: false, source: "mock" },
  travelModes: { enabled: false, source: "mock" },

  // Phase 4. Needs a development build, so it cannot run in Expo Go.
  siriShortcut: { enabled: false, source: "mock" },
  liveActivity: { enabled: false, source: "mock" },
  homeWidget: { enabled: false, source: "mock" },
  voiceCommands: { enabled: false, source: "mock" },
};

export function isEnabled(name: FeatureName): boolean {
  return features[name].enabled;
}

export function usesApi(name: FeatureName): boolean {
  return features[name].source === "api";
}
