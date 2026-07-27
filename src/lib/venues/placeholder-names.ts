export const VENUE_NAME_TIERS = [
  "Community",
  "Club",
  "Theater",
  "Grand",
  "Stadium",
] as const;

export type VenueNameTier = (typeof VENUE_NAME_TIERS)[number];

/** Build a placeholder venue name: "{Region} {Tier} Arena" */
export function buildPlaceholderVenueName(region: string, tier: VenueNameTier = "Community"): string {
  return `${region.trim()} ${tier} Arena`;
}

/** Permanent slug from region + tier — never changes after creation. */
export function buildPlaceholderVenueSlug(region: string, tier: VenueNameTier = "Community"): string {
  const base = region
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const tierSlug = tier.toLowerCase();
  return `${base}-${tierSlug}-arena`;
}

/** Pick a tier based on capacity for auto-assignment. */
export function tierForCapacity(capacity: number): VenueNameTier {
  if (capacity >= 40000) return "Stadium";
  if (capacity >= 20000) return "Grand";
  if (capacity >= 10000) return "Community";
  if (capacity >= 7000) return "Club";
  return "Theater";
}

export function defaultNamingRightsPrice(tier: VenueNameTier): number {
  const prices: Record<VenueNameTier, number> = {
    Community: 2_800_000,
    Club: 2_400_000,
    Theater: 2_600_000,
    Grand: 7_500_000,
    Stadium: 12_000_000,
  };
  return prices[tier];
}
