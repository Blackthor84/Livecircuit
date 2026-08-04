/**
 * Stage performer selection — always from Artist Bible (never random).
 */
import type { ArtistImagePose } from "@/data/demo/artists/types";
import { getStagePerformerSelection, getAvailablePoses, resolvePoseImage } from "@/data/demo/artists/queries";
import { PRIMARY_ARTIST_DEMO_ID } from "@/data/demo/artists/constants";

export type StagePerformerSelection = NonNullable<ReturnType<typeof getStagePerformerSelection>>;

export function pickPerformerById(id: string, pose?: ArtistImagePose): StagePerformerSelection | null {
  return getStagePerformerSelection(id, pose ?? "performance");
}

/** @deprecated Use pickPerformerById with explicit artistId — no random performers */
export function pickRandomPerformer(_seed?: number): StagePerformerSelection {
  return getStagePerformerSelection(PRIMARY_ARTIST_DEMO_ID)!;
}

export { getAvailablePoses, resolvePoseImage };
