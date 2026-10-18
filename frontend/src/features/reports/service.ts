import { createReport, listReports } from "../../api";
import { usesApi } from "../../config/features";
import { UW_AREA_BBOX, type Bbox } from "../shared/area";
import { requireToken } from "../shared/auth";
import { createCollection } from "../shared/collection";
import { mockReportsService } from "./mock";
import type { NewReport, Report, ReportCategory, ReportPhoto, ReportReceipt } from "./types";

/** Reports older than this are hidden from the map. */
export const REPORT_MAX_AGE_DAYS = 7;

export interface ReportsService {
  list(bbox: Bbox, since: string): Promise<Report[]>;
  /** Requires login. */
  create(report: NewReport, photo?: ReportPhoto | null): Promise<ReportReceipt>;
}

const apiReportsService: ReportsService = {
  list: (bbox, since) => listReports(bbox, since),
  create: async (report, photo) => createReport(await requireToken("send a report"), report, photo),
};

export function reportsService(): ReportsService {
  return usesApi("reports") ? apiReportsService : mockReportsService;
}

export function reportsAreSample(): boolean {
  return !usesApi("reports");
}

export function reportsSince(): string {
  return new Date(Date.now() - REPORT_MAX_AGE_DAYS * 86_400_000).toISOString();
}

export const reports = createCollection(
  () => reportsService().list(UW_AREA_BBOX, reportsSince()),
  "Could not load recent reports.",
);

export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: "broken_streetlight", label: "Broken streetlight" },
  { value: "construction", label: "Construction" },
  { value: "blocked_sidewalk", label: "Blocked sidewalk" },
  { value: "other", label: "Other" },
];

export function categoryLabel(category: ReportCategory): string {
  return REPORT_CATEGORIES.find((item) => item.value === category)?.label ?? "Report";
}

/** "just now", "25 min ago", "2 h ago", "3 days ago". */
export function reportAge(createdAt: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(createdAt).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
