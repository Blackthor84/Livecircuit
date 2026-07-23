import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { buildSeasonDetail, listSeasonsHub } from "@/lib/services/seasons.service";
import type { SeasonDetail, SeasonsHubReport } from "@/lib/types/seasons";

function demoHub(): SeasonsHubReport {
  const now = new Date().toISOString();
  const active = [
    {
      id: "demo-summer",
      slug: "summer-tour-season",
      name: "Summer Tour Season",
      tagline: "Sun-soaked circuits across the map",
      status: "active" as const,
      startsAt: "2026-06-01T00:00:00Z",
      endsAt: "2026-08-31T23:59:59Z",
      themeSlug: "summer-festival",
      themeName: "Summer Festival",
      decorationIcon: "☀️",
    },
  ];
  return {
    active,
    upcoming: [
      {
        id: "demo-halloween",
        slug: "halloween-horror-season",
        name: "Halloween Horror Season",
        tagline: "Midnight shows and haunted venues",
        status: "scheduled" as const,
        startsAt: "2026-10-01T00:00:00Z",
        endsAt: "2026-10-31T23:59:59Z",
        themeSlug: "halloween",
        themeName: "Halloween",
        decorationIcon: "🎃",
      },
    ],
    archive: [
      {
        id: "demo-spring",
        slug: "spring-indie-showcase",
        name: "Spring Indie Showcase",
        tagline: "Boutique rooms and emerging voices",
        status: "archived" as const,
        startsAt: "2026-03-01T00:00:00Z",
        endsAt: "2026-05-31T23:59:59Z",
        themeSlug: "spring-indie",
        themeName: "Spring Indie Showcase",
        decorationIcon: "🌷",
      },
    ],
    computedAt: now,
  };
}

function demoDetail(slug: string): SeasonDetail | null {
  const hub = demoHub();
  const summary = [...hub.active, ...hub.upcoming, ...hub.archive].find((s) => s.slug === slug);
  if (!summary) return null;

  return {
    ...summary,
    description: "Demo season content with leaderboard, badges, and limited merch.",
    profileFrame: {
      slug: "solar-flare",
      label: "Solar Flare Frame",
      ringClass: "ring-2 ring-amber-400/70",
    },
    rewards: [
      { tier: "Bronze", points: 100, reward: "Season badge" },
      { tier: "Gold", points: 500, reward: "Profile frame" },
    ],
    badges: [
      {
        id: "b1",
        slug: "road-warrior",
        name: "Road Warrior",
        description: "Earn 250 season points.",
        icon: "🔥",
        pointsRequired: 250,
        earned: false,
        earnedAt: null,
      },
    ],
    merch: [
      {
        id: "m1",
        slug: "sunset-tee",
        name: "Sunset Circuit Tee",
        description: "Limited summer tour graphic tee.",
        priceCents: 3200,
        imageUrl: null,
        limitedQuantity: 500,
        soldOut: false,
      },
    ],
    leaderboard: [
      { rank: 1, userId: "u1", displayName: "NovaFan", points: 820 },
      { rank: 2, userId: "u2", displayName: "CircuitQueen", points: 640 },
    ],
    decoratedVenues: [
      {
        venueSlug: "new-york-city-arena",
        venueName: "New York City Arena",
        themeName: "Summer Festival",
        themeIcon: "☀️",
      },
    ],
    archiveStats: summary.status === "archived" ? { totalFans: 12400, topScore: 2100 } : {},
    userStats: { points: 120, ticketsCount: 2, stampsCount: 1, tipsCount: 0, merchOrdersCount: 0, rank: null },
  };
}

export async function getSeasonsHubReport(): Promise<SeasonsHubReport> {
  if (!isSupabaseConfigured()) return demoHub();
  const supabase = await createClient();
  return listSeasonsHub(supabase);
}

export async function getSeasonDetailReport(
  slug: string,
  userId: string | null
): Promise<SeasonDetail | null> {
  if (!isSupabaseConfigured()) return demoDetail(slug);
  const supabase = await createClient();
  return buildSeasonDetail(supabase, slug, userId);
}
