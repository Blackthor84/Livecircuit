import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { VENUE_TV_PROGRAM_TYPES } from "@/lib/constants/venue-tv";
import { buildVenueTvReport } from "@/lib/services/venue-tv.service";
import type { VenueTvReport } from "@/lib/types/venue-tv";

function demoReport(slug: string): VenueTvReport {
  const lineup = [
    {
      id: "demo-1",
      programType: "upcoming_show",
      title: "Neon Nights — Live",
      summary: "Next show on this stage.",
      mediaUrl: null,
      thumbnailUrl: null,
      linkHref: "/discover",
      durationSeconds: 180,
    },
    {
      id: "demo-2",
      programType: "trailer",
      title: "Venue welcome",
      summary: "Welcome to Venue TV.",
      mediaUrl: null,
      thumbnailUrl: null,
      linkHref: null,
      durationSeconds: 90,
    },
  ];
  const byType: VenueTvReport["byType"] = {};
  for (const t of VENUE_TV_PROGRAM_TYPES) {
    byType[t.value] = lineup.filter((p) => p.programType === t.value);
  }
  return {
    venueId: "demo",
    venueSlug: slug,
    venueName: "Demo Arena",
    channelTitle: "Demo Arena TV",
    tagline: "LiveCircuit Venue Television",
    isOnAir: true,
    nowPlaying: lineup[0],
    upNext: [lineup[1]],
    lineup,
    byType,
    computedAt: new Date().toISOString(),
  };
}

export async function getVenueTvReport(venueSlug: string): Promise<VenueTvReport | null> {
  if (!isSupabaseConfigured()) return demoReport(venueSlug);
  const supabase = await createClient();
  return buildVenueTvReport(supabase, venueSlug);
}
