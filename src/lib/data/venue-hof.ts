import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { VENUE_HOF_CATEGORIES } from "@/lib/constants/venue-hof";
import { buildVenueHallOfFameReport } from "@/lib/services/venue-hof.service";
import type { VenueHallOfFameReport } from "@/lib/types/venue-hof";

function demoReport(slug: string): VenueHallOfFameReport {
  const entries = VENUE_HOF_CATEGORIES.slice(0, 4).map((c, i) => ({
    category: c.value,
    categoryLabel: c.label,
    blurb: c.blurb,
    rank: 1,
    holderType: i % 2 === 0 ? ("artist" as const) : ("event" as const),
    displayName: i % 2 === 0 ? "Neon Nights" : "Summer Spectacular",
    subtitle: "Demo legend",
    metricValue: 1000 - i * 100,
    metricLabel: "score",
    linkHref: "/discover",
  }));
  return {
    venueId: "demo",
    venueSlug: slug,
    venueName: "Demo Arena",
    isHallOfFameVenue: true,
    entries,
    computedAt: new Date().toISOString(),
  };
}

export async function getVenueHallOfFameReport(venueSlug: string): Promise<VenueHallOfFameReport | null> {
  if (!isSupabaseConfigured()) return demoReport(venueSlug);
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  return buildVenueHallOfFameReport(supabase, admin, venueSlug);
}
