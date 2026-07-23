export const GAMIFICATION_TITLES = [
  { slug: "rookie", label: "Rookie Fan", minLevel: 1, minPrestige: 0 },
  { slug: "regular", label: "Circuit Regular", minLevel: 5, minPrestige: 0 },
  { slug: "superfan", label: "Superfan", minLevel: 10, minPrestige: 0 },
  { slug: "headliner", label: "Headliner", minLevel: 15, minPrestige: 0 },
  { slug: "legend", label: "LiveCircuit Legend", minLevel: 25, minPrestige: 0 },
  { slug: "prestige_1", label: "Prestige I", minLevel: 1, minPrestige: 1 },
  { slug: "prestige_2", label: "Prestige II", minLevel: 1, minPrestige: 2 },
  { slug: "prestige_3", label: "Prestige III", minLevel: 1, minPrestige: 3 },
] as const;

export type GamificationTitleSlug = (typeof GAMIFICATION_TITLES)[number]["slug"];

export function titleForLevelPrestige(level: number, prestige: number): (typeof GAMIFICATION_TITLES)[number] {
  const eligible = GAMIFICATION_TITLES.filter(
    (t) => level >= t.minLevel && prestige >= t.minPrestige
  );
  return eligible[eligible.length - 1] ?? GAMIFICATION_TITLES[0];
}

export function unlockedTitles(level: number, prestige: number) {
  return GAMIFICATION_TITLES.filter((t) => level >= t.minLevel && prestige >= t.minPrestige);
}
