export const WALK_OF_FAME_CRITERIA = [
  {
    value: "attendance",
    label: "Attendance Star",
    blurb: "Filled arenas with unforgettable live moments.",
  },
  {
    value: "revenue",
    label: "Revenue Star",
    blurb: "Sustained ticket and merch success on the circuit.",
  },
  {
    value: "years_active",
    label: "Legacy Star",
    blurb: "Years of dedication building a LiveCircuit career.",
  },
  {
    value: "community_impact",
    label: "Community Star",
    blurb: "Chat, reviews, tips, and fans who show up every night.",
  },
  {
    value: "fan_votes",
    label: "Fan Choice Star",
    blurb: "Earned by fan votes on the Digital Walk of Fame.",
  },
  {
    value: "awards",
    label: "Awards Star",
    blurb: "Hall of Fame honors, verification, and spotlight features.",
  },
  {
    value: "venue_contributions",
    label: "Venue Star",
    blurb: "Performed across multiple iconic LiveCircuit venues.",
  },
] as const;

export type WalkOfFameCriterion = (typeof WALK_OF_FAME_CRITERIA)[number]["value"];

export const WALK_OF_FAME_THRESHOLDS: Record<WalkOfFameCriterion, number> = {
  attendance: 500,
  revenue: 500_000,
  years_active: 2,
  community_impact: 250,
  fan_votes: 25,
  awards: 2,
  venue_contributions: 3,
};

export function walkOfFameCriterionLabel(criterion: string): string {
  return WALK_OF_FAME_CRITERIA.find((c) => c.value === criterion)?.label ?? criterion;
}

export function walkOfFameCriterionBlurb(criterion: string): string {
  return WALK_OF_FAME_CRITERIA.find((c) => c.value === criterion)?.blurb ?? "";
}
