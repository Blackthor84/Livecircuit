import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { buildFestivalDetail, listFestivalsHub } from "@/lib/services/virtual-festivals.service";
import type { FestivalDetail, FestivalsHubReport } from "@/lib/types/virtual-festivals";

function demoHub(): FestivalsHubReport {
  return {
    live: [
      {
        id: "demo",
        slug: "livecircuit-summer-fest",
        name: "LiveCircuit Summer Fest",
        tagline: "The flagship multi-venue spectacular",
        status: "live",
        startsAt: "2026-07-18T16:00:00Z",
        endsAt: "2026-07-21T04:00:00Z",
        bannerIcon: "☀️",
        venueCount: 3,
      },
    ],
    upcoming: [
      {
        id: "demo2",
        slug: "comedy-weekend",
        name: "Comedy Weekend",
        tagline: "Stand-up stacks and late-night rooms",
        status: "scheduled",
        startsAt: "2026-08-08T18:00:00Z",
        endsAt: "2026-08-10T23:59:59Z",
        bannerIcon: "🎤",
        venueCount: 2,
      },
    ],
    past: [],
    computedAt: new Date().toISOString(),
  };
}

function demoDetail(slug: string): FestivalDetail | null {
  if (slug !== "livecircuit-summer-fest") return null;
  const base = demoHub().live[0];
  return {
    ...base,
    description: "Three days of simultaneous performances across flagship venues.",
    mapPins: [
      { venueSlug: "new-york-city-arena", venueName: "New York City Arena", label: "Main Stage", mapX: 28, mapY: 35 },
      { venueSlug: "los-angeles-arena", venueName: "Los Angeles Arena", label: "West Stage", mapX: 72, mapY: 40 },
    ],
    schedule: [
      {
        id: "s1",
        title: "Main Stage Headliner",
        slotType: "performance",
        startsAt: "2026-07-19T20:00:00Z",
        endsAt: "2026-07-19T21:30:00Z",
        isVipOnly: false,
        venueSlug: "new-york-city-arena",
        venueName: "New York City Arena",
        artistSlug: null,
        artistName: null,
        eventSlug: null,
        dayLabel: "Day 2 — Peak",
      },
    ],
    passTiers: [
      {
        id: "t1",
        slug: "festival-pass",
        name: "Festival Pass",
        description: "Access all public stages.",
        priceCents: 4900,
        isVipUpgrade: false,
        perks: ["All stages", "Schedule planner"],
        owned: false,
      },
    ],
    collectibles: [],
    achievements: [],
    leaderboard: [],
    userPoints: null,
  };
}

export async function getFestivalsHubReport(): Promise<FestivalsHubReport> {
  if (!isSupabaseConfigured()) return demoHub();
  const supabase = await createClient();
  return listFestivalsHub(supabase);
}

export async function getFestivalDetailReport(
  slug: string,
  userId: string | null
): Promise<FestivalDetail | null> {
  if (!isSupabaseConfigured()) return demoDetail(slug);
  const supabase = await createClient();
  return buildFestivalDetail(supabase, slug, userId);
}
