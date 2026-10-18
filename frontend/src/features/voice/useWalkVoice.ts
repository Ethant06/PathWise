import * as Speech from "expo-speech";
import { useEffect, useRef } from "react";

import { distanceMeters, type LatLng } from "../../geo";
import type { RoutePayload } from "../../types";
import { zoneAt, zoneName } from "../avoidZones/service";
import type { AvoidZone } from "../avoidZones/types";
import { categoryLabel, reportAge } from "../reports/service";
import type { Report } from "../reports/types";
import type { RouteChoice } from "../walks/types";

/** Walking speed the backend uses for durations (WALK_SPEED_MPS in backend/app/config.py). */
const WALK_SPEED_MPS = 1.35;
const ETA_EVERY_MS = 5 * 60_000;
const REPORT_NEAR_METERS = 60;

function say(text: string) {
  Speech.speak(text, { language: "en-US" });
}

function minutesText(minutes: number): string {
  const rounded = Math.max(1, Math.round(minutes));
  return rounded === 1 ? "1 minute" : `${rounded} minutes`;
}

/**
 * Spoken updates during a walk: route type and minutes at the start, the route's explanation,
 * ETA every five minutes, arrival, entering an avoid zone, and nearing a recent report.
 *
 * TODO(backend): steps. The API returns no turn-by-turn steps, so there are no "turn left"
 * announcements. Add them here once POST /api/routes returns steps.
 */
export function useWalkVoice({
  enabled,
  choice,
  route,
  destinationName,
  here,
  remainingMeters,
  arrived,
  zones,
  reports,
}: {
  enabled: boolean;
  choice: RouteChoice;
  route: RoutePayload;
  destinationName: string;
  here: LatLng | null;
  remainingMeters: number | null;
  arrived: boolean;
  zones: AvoidZone[];
  reports: Report[];
}) {
  const started = useRef(false);
  const lastEta = useRef(0);
  const announcedArrival = useRef(false);
  const insideZone = useRef<string | null>(null);
  const announcedReports = useRef(new Set<string>());

  useEffect(() => () => void Speech.stop(), []);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    lastEta.current = Date.now();
    const name = choice === "fastest" ? "fastest" : "safer";
    say(
      `Starting the ${name} route to ${destinationName}. About ${minutesText(route.metrics.duration_min)}. ${route.explanation}`,
    );
  }, [enabled, choice, destinationName, route]);

  useEffect(() => {
    if (!enabled || !arrived || announcedArrival.current) return;
    announcedArrival.current = true;
    say(`You arrived at ${destinationName}.`);
  }, [enabled, arrived, destinationName]);

  useEffect(() => {
    if (!enabled || !here || arrived) return;

    if (remainingMeters !== null && Date.now() - lastEta.current >= ETA_EVERY_MS) {
      lastEta.current = Date.now();
      say(`About ${minutesText(remainingMeters / WALK_SPEED_MPS / 60)} left.`);
    }

    const zone = zoneAt(here, zones);
    if (zone && insideZone.current !== zone.id) {
      say(`You're entering your avoid zone, ${zoneName(zone)}.`);
    }
    insideZone.current = zone?.id ?? null;

    for (const report of reports) {
      if (announcedReports.current.has(report.id)) continue;
      if (distanceMeters(here, { latitude: report.lat, longitude: report.lng }) > REPORT_NEAR_METERS) continue;
      announcedReports.current.add(report.id);
      say(`Heads up: ${categoryLabel(report.category)} reported nearby, ${reportAge(report.created_at)}.`);
    }
  }, [enabled, here, arrived, remainingMeters, zones, reports]);
}
