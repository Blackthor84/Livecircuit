import {
  WALK_OF_FAME_THRESHOLDS,
  type WalkOfFameCriterion,
} from "@/lib/constants/walk-of-fame";

export function qualifiesForWalkOfFameStar(criterion: WalkOfFameCriterion, metricValue: number): boolean {
  return metricValue >= WALK_OF_FAME_THRESHOLDS[criterion];
}

export function yearsActiveSince(createdAtIso: string, now = new Date()): number {
  const created = new Date(createdAtIso);
  const ms = now.getTime() - created.getTime();
  return ms > 0 ? ms / (365.25 * 24 * 60 * 60 * 1000) : 0;
}

export function communityImpactScore(input: {
  chatMessages: number;
  reviews: number;
  tips: number;
  followers: number;
}): number {
  return (
    input.chatMessages +
    input.reviews * 5 +
    input.tips * 2 +
    Math.floor(input.followers / 25)
  );
}
