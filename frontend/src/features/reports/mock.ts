import { readJson, writeJson } from "../../storage/local";
import { inBbox } from "../shared/area";
import { hoursAgo, localId, mockCall } from "../shared/mock";
import type { ReportsService } from "./service";
import type { Report } from "./types";

/** Reports made on this phone. In mock mode they are not sent anywhere. */
const KEY = "reports.mine.v1";

/**
 * Sample reports around campus. The ages are relative to now so the map always shows a few;
 * the 9-day-old one checks that old reports are hidden.
 */
function sampleReports(): Report[] {
  return [
    {
      id: "sample_light_41st",
      category: "broken_streetlight",
      lat: 47.65832,
      lng: -122.31328,
      note: "Light out near the corner (sample)",
      created_at: hoursAgo(2),
      status: "received",
    },
    {
      id: "sample_construction_stevens",
      category: "construction",
      lat: 47.65283,
      lng: -122.30645,
      note: "Fenced-off path (sample)",
      created_at: hoursAgo(26),
      status: "under_review",
    },
    {
      id: "sample_sidewalk_ave",
      category: "blocked_sidewalk",
      lat: 47.66064,
      lng: -122.31373,
      note: "Scooters across the sidewalk (sample)",
      created_at: hoursAgo(72),
      status: "received",
    },
    {
      id: "sample_old_other",
      category: "other",
      lat: 47.6575,
      lng: -122.3051,
      note: "Old sample report that should be hidden",
      created_at: hoursAgo(9 * 24),
      status: "resolved",
    },
  ];
}

export const mockReportsService: ReportsService = {
  list: (bbox, since) =>
    mockCall(async () => {
      const cutoff = new Date(since).getTime();
      const mine = await readJson<Report[]>(KEY, []);
      return [...mine, ...sampleReports()]
        .filter((report) => new Date(report.created_at).getTime() >= cutoff)
        .filter((report) => inBbox(report.lat, report.lng, bbox));
    }),
  create: (report, photo) =>
    mockCall(async () => {
      const saved: Report = {
        id: localId("report"),
        category: report.category,
        lat: report.lat,
        lng: report.lng,
        note: report.note?.trim() || null,
        created_at: new Date().toISOString(),
        status: "received",
        photo_uri: photo?.uri ?? null,
      };
      await writeJson(KEY, [saved, ...(await readJson<Report[]>(KEY, []))]);
      return { id: saved.id, created_at: saved.created_at, status: saved.status };
    }),
};
