import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { buildVenueCollectionReport } from "@/lib/services/venue-collection.service";
import type { VenueCollectionReport } from "@/lib/types/venue-collection";

function demoReport(userId: string): VenueCollectionReport {
  const visits = [
    {
      venueId: "v1",
      venueSlug: "new-york-city-arena",
      venueName: "New York City Arena",
      region: "New York City",
      stateCode: "NY",
      countryCode: "US",
      visitCount: 5,
      lastVisitedAt: new Date().toISOString(),
      isFavorite: true,
      isHidden: false,
      isSeasonal: false,
      isHallOfFame: true,
    },
  ];
  return {
    userId,
    mostAttended: visits[0],
    progress: {
      visitedCount: 2,
      totalCollectible: 13,
      completionPercent: 15,
      favoriteCount: 1,
      statesVisited: 2,
      statesTotal: 10,
      countriesVisited: 1,
      countriesTotal: 1,
      badgeCount: 1,
      hiddenDiscovered: 0,
      hiddenTotal: 2,
      seasonalVisited: 1,
      seasonalTotal: 2,
      hallOfFameVisited: 1,
      hallOfFameTotal: 3,
    },
    visits,
    favorites: visits.filter((v) => v.isFavorite),
    badges: [],
    computedAt: new Date().toISOString(),
  };
}

export async function getVenueCollectionReport(userId: string): Promise<VenueCollectionReport> {
  if (!isSupabaseConfigured()) return demoReport(userId);
  const supabase = await createClient();
  return buildVenueCollectionReport(supabase, userId);
}
