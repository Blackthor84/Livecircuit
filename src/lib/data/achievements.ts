import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { ACHIEVEMENT_CATEGORIES, achievementCategoryBlurb, achievementCategoryLabel } from "@/lib/constants/achievements";
import { buildAchievementsReport } from "@/lib/services/achievements.service";
import type { AchievementsReport } from "@/lib/types/achievements";

function demoReport(userId: string): AchievementsReport {
  const sampleEntries = (category: (typeof ACHIEVEMENT_CATEGORIES)[number]["value"], names: string[]) =>
    names.map((name, i) => ({
      slug: `demo-${category}-${i}`,
      category,
      categoryLabel: achievementCategoryLabel(category),
      categoryBlurb: achievementCategoryBlurb(category),
      name,
      description: `Demo ${achievementCategoryLabel(category).toLowerCase()} milestone.`,
      icon: "🏅",
      metric: "ticket_count",
      targetValue: (i + 1) * 5,
      tier: 1,
      sortOrder: i,
      hidden: false,
      currentValue: i === 0 ? 5 : i * 2,
      earned: i === 0,
      earnedAt: i === 0 ? new Date().toISOString() : null,
      progressPercent: i === 0 ? 100 : 40,
    }));

  const categories = ACHIEVEMENT_CATEGORIES.slice(0, 6).map((c) => {
    const entries = sampleEntries(c.value, [`${c.label} I`, `${c.label} II`]);
    return {
      category: c.value,
      categoryLabel: c.label,
      categoryBlurb: c.blurb,
      earnedCount: entries.filter((e) => e.earned).length,
      totalCount: entries.length,
      entries,
    };
  });

  return {
    userId,
    displayName: "Demo Fan",
    totalEarned: 1,
    totalAvailable: 12,
    categories,
    metrics: {
      ticket_count: 5,
      vip_ticket_count: 0,
      friend_count: 2,
      review_count: 0,
      tip_count: 0,
      tip_total_cents: 0,
      merch_order_count: 0,
      festival_pass_count: 0,
      distinct_venues: 2,
      distinct_countries: 1,
      distinct_genres: 2,
      season_points_max: 0,
      marketplace_bookings: 0,
      venue_check_ins: 1,
      passport_achievements: 1,
      coin_earned_total: 50,
    },
    computedAt: new Date().toISOString(),
  };
}

export async function getAchievementsReport(userId: string): Promise<AchievementsReport | null> {
  if (!isSupabaseConfigured()) return demoReport(userId);
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  return buildAchievementsReport(supabase, admin, userId);
}
