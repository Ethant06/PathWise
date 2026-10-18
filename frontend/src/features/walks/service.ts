import { createWalk, deleteAllWalks, deleteWalk, listWalks } from "../../api";
import { usesApi } from "../../config/features";
import { requireToken } from "../shared/auth";
import { createCollection } from "../shared/collection";
import { mockWalksService } from "./mock";
import type { NewWalk, Walk } from "./types";

export interface WalksService {
  /** Newest first. */
  list(): Promise<Walk[]>;
  create(walk: NewWalk): Promise<Walk>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
}

const MAX_PAGES = 10;

const apiWalksService: WalksService = {
  list: async () => {
    const token = await requireToken("see your walk history");
    const walks: Walk[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await listWalks(token, cursor);
      walks.push(...result.walks);
      if (!result.next_cursor) break;
      cursor = result.next_cursor;
    }
    return walks;
  },
  create: async (walk) => createWalk(await requireToken("save this walk"), walk),
  remove: async (id) => deleteWalk(await requireToken("delete this walk"), id),
  removeAll: async () => deleteAllWalks(await requireToken("delete your walk history")),
};

export function walksService(): WalksService {
  return usesApi("routeHistory") ? apiWalksService : mockWalksService;
}

export function walksAreLocal(): boolean {
  return !usesApi("routeHistory");
}

export const walks = createCollection(() => walksService().list(), "Could not load your walks.");

/** Replace one walk in the cached list, for example after feedback is saved. */
export function updateCachedWalk(next: Walk) {
  const state = walks.get();
  if (state.status !== "ready") return;
  walks.set(state.items.map((walk) => (walk.id === next.id ? next : walk)));
}
