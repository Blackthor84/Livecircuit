import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getVenueBySlug } from "@/lib/data/venues";
import {
  pointsToNextLevel,
  type VenueLoyaltyLevel,
} from "@/lib/services/venue-loyalty.service";

export type VenueBadgePublic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  earned: boolean;
  earned_at: string | null;
};

export type VenueLoyaltyLedgerEntry = {
  id: string;
  delta_points: number;
  reason: string;
  created_at: string;
};

export type VenueLoyaltyPageData = {
  venue: { id: string; slug: string; name: string };
  profile: {
    points: number;
    level: VenueLoyaltyLevel;
    progress: ReturnType<typeof pointsToNextLevel>;
  } | null;
  badges: VenueBadgePublic[];
  ledger: VenueLoyaltyLedgerEntry[];
};

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getVenueLoyaltyPage(
  slug: string,
  userId?: string | null
): Promise<VenueLoyaltyPageData | null> {
  const base = await getVenueBySlug(slug);
  if (!base) return null;

  const supabase = await getClient();
  if (!supabase) return null;

  const { data: badgeRows } = await supabase
    .from("venue_badges")
    .select("id, slug, name, description, image_url")
    .eq("venue_id", base.id)
    .order("slug");

  let profile: VenueLoyaltyPageData["profile"] = null;
  let earnedMap = new Map<string, string>();
  let ledger: VenueLoyaltyLedgerEntry[] = [];

  if (userId) {
    const { data: loyaltyProfile } = await supabase
      .from("venue_loyalty_profiles")
      .select("id, points, level")
      .eq("venue_id", base.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (loyaltyProfile) {
      const points = loyaltyProfile.points as number;
      profile = {
        points,
        level: loyaltyProfile.level as VenueLoyaltyLevel,
        progress: pointsToNextLevel(points),
      };

      const { data: ledgerRows } = await supabase
        .from("venue_loyalty_ledger")
        .select("id, delta_points, reason, created_at")
        .eq("loyalty_profile_id", loyaltyProfile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      ledger = (ledgerRows ?? []) as VenueLoyaltyLedgerEntry[];
    }

    const badgeIds = (badgeRows ?? []).map((b) => b.id as string);
    if (badgeIds.length) {
      const { data: earned } = await supabase
        .from("user_venue_badges")
        .select("badge_id, earned_at")
        .eq("user_id", userId)
        .in("badge_id", badgeIds);

      for (const row of earned ?? []) {
        earnedMap.set(row.badge_id as string, row.earned_at as string);
      }
    }
  }

  const badges: VenueBadgePublic[] = (badgeRows ?? []).map((b) => ({
    id: b.id as string,
    slug: b.slug as string,
    name: b.name as string,
    description: b.description as string | null,
    image_url: b.image_url as string | null,
    earned: earnedMap.has(b.id as string),
    earned_at: earnedMap.get(b.id as string) ?? null,
  }));

  return {
    venue: { id: base.id, slug: base.slug, name: base.name },
    profile,
    badges,
    ledger,
  };
}
