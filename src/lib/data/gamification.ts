import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { buildGamificationReport } from "@/lib/services/gamification.service";
import type { GamificationReport } from "@/lib/types/gamification";

function demoReport(userId: string): GamificationReport {
  const quest = (
    slug: string,
    cadence: "daily" | "weekly" | "monthly",
    name: string,
    current: number,
    target: number,
    done: boolean
  ) => ({
    slug,
    cadence,
    name,
    description: "Demo quest",
    icon: "⭐",
    metric: "daily_login",
    targetValue: target,
    xpReward: 50,
    coinReward: 10,
    periodKey: "demo",
    currentValue: current,
    completed: done,
    completedAt: done ? new Date().toISOString() : null,
    progressPercent: Math.min(100, Math.round((current / target) * 100)),
  });

  return {
    userId,
    displayName: "Demo Fan",
    xp: 420,
    level: 4,
    prestige: 0,
    equippedTitleSlug: "regular",
    equippedTitleLabel: "Circuit Regular",
    levelProgress: { current: 70, needed: 150, percent: 47 },
    daily: [
      quest("daily_login", "daily", "Daily Check-in", 1, 1, true),
      quest("daily_review", "daily", "Voice of the Fan", 0, 1, false),
    ],
    weekly: [quest("weekly_tickets", "weekly", "Weekend Warrior", 2, 3, false)],
    monthly: [quest("monthly_shows", "monthly", "Monthly Regular", 4, 10, false)],
    unlockedTitles: [
      { slug: "rookie", label: "Rookie Fan" },
      { slug: "regular", label: "Circuit Regular" },
    ],
    leaderboard: [
      { rank: 1, userId: "u1", displayName: "NovaFan", xp: 1200, level: 6, titleLabel: "Superfan" },
      { rank: 2, userId: userId, displayName: "Demo Fan", xp: 420, level: 4, titleLabel: "Circuit Regular" },
    ],
    computedAt: new Date().toISOString(),
  };
}

export async function getGamificationReport(userId: string): Promise<GamificationReport | null> {
  if (!isSupabaseConfigured()) return demoReport(userId);
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  return buildGamificationReport(supabase, admin, userId);
}
