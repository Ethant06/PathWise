import { sendWalkFeedback } from "../../api";
import { usesApi } from "../../config/features";
import { requireToken } from "../shared/auth";
import { mockFeedbackService } from "./mock";
import type { WalkFeedback } from "./types";

export interface FeedbackService {
  /** Saves the walker's answers on the walk and returns what was stored. */
  send(walkId: string, feedback: WalkFeedback): Promise<WalkFeedback>;
}

const apiFeedbackService: FeedbackService = {
  send: async (walkId, feedback) => sendWalkFeedback(await requireToken("save how the walk felt"), walkId, feedback),
};

export function feedbackService(): FeedbackService {
  return usesApi("walkFeedback") ? apiFeedbackService : mockFeedbackService;
}

/** Removes empty optional fields before saving. */
export function cleanFeedback(feedback: WalkFeedback): WalkFeedback {
  const comment = feedback.comment?.trim();
  return {
    felt_safe: feedback.felt_safe,
    tags: feedback.tags,
    ...(feedback.rating ? { rating: feedback.rating } : {}),
    ...(comment ? { comment } : {}),
  };
}
