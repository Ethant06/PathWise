/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#reports. */

export type ReportCategory = "broken_streetlight" | "construction" | "blocked_sidewalk" | "other";

export type ReportStatus = "received" | "under_review" | "resolved";

export type NewReport = {
  category: ReportCategory;
  lat: number;
  lng: number;
  note?: string;
};

/** A photo picked on the phone. The API version uploads it as multipart form data. */
export type ReportPhoto = {
  uri: string;
  width: number;
  height: number;
  mime_type: string | null;
};

export type ReportReceipt = {
  id: string;
  created_at: string;
  status: ReportStatus;
};

export type Report = {
  id: string;
  category: ReportCategory;
  lat: number;
  lng: number;
  note: string | null;
  created_at: string;
  status: ReportStatus;
  /** Set only on reports this phone made. */
  photo_uri?: string | null;
};
