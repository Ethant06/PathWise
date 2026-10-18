import { mockCall } from "../shared/mock";
import { readStoredWalks, writeStoredWalks } from "../walks/mock";
import type { FeedbackService } from "./service";

/** In mock mode the answers are stored on the walk record on this phone. They are private. */
export const mockFeedbackService: FeedbackService = {
  send: (walkId, feedback) =>
    mockCall(async () => {
      const walks = await readStoredWalks();
      if (!walks.some((walk) => walk.id === walkId)) {
        throw new Error("That walk is no longer in your history.");
      }
      await writeStoredWalks(walks.map((walk) => (walk.id === walkId ? { ...walk, feedback } : walk)));
      return feedback;
    }),
};
