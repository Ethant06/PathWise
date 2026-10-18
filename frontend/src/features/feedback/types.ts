/** Proposed: not in the API yet. See frontend/BACKEND_CONTRACTS.md#walk-feedback. */

export type FeltSafe = "yes" | "mostly" | "no";

export type FeedbackTag = "well_lit" | "busy" | "empty" | "construction" | "felt_followed" | "other";

/** The walker's own answers. Never turn these into a score or a percentage. */
export type WalkFeedback = {
  felt_safe: FeltSafe;
  rating?: 1 | 2 | 3 | 4 | 5;
  tags: FeedbackTag[];
  comment?: string;
};
