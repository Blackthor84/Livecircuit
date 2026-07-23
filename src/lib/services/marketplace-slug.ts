export function slugifyCreatorHandle(input: string, userId: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = userId.replace(/-/g, "").slice(0, 6);
  return base ? `${base}-${suffix}` : `creator-${suffix}`;
}

export function averageRatingFromRows(ratings: number[]) {
  if (!ratings.length) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 100) / 100;
}
