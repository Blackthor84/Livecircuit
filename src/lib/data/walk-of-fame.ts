import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { WALK_OF_FAME_CRITERIA } from "@/lib/constants/walk-of-fame";
import {
  buildArtistWalkOfFameReport,
  buildWalkOfFameHubReport,
} from "@/lib/services/walk-of-fame.service";
import type { ArtistWalkOfFameReport, WalkOfFameHubReport } from "@/lib/types/walk-of-fame";
import { getSessionUser } from "@/lib/auth/session";

function demoHub(): WalkOfFameHubReport {
  const stars = WALK_OF_FAME_CRITERIA.slice(0, 5).map((c, i) => ({
    criterion: c.value,
    criterionLabel: c.label,
    blurb: c.blurb,
    earnedAt: new Date(Date.now() - i * 86400000).toISOString(),
    metricValue: 1000 - i * 100,
    summary: `Demo ${c.label.toLowerCase()} achievement`,
  }));
  return {
    artists: [
      {
        artistId: "demo-1",
        slug: "neon-nights",
        stageName: "Neon Nights",
        bannerUrl: null,
        verified: true,
        starCount: stars.length,
        stars,
        fanVoteCount: 128,
      },
      {
        artistId: "demo-2",
        slug: "comedy-circuit",
        stageName: "Comedy Circuit",
        bannerUrl: null,
        verified: false,
        starCount: 3,
        stars: stars.slice(0, 3),
        fanVoteCount: 42,
      },
    ],
    totalStars: stars.length + 3,
    computedAt: new Date().toISOString(),
  };
}

function demoArtist(slug: string): ArtistWalkOfFameReport {
  const hub = demoHub();
  const match = hub.artists.find((a) => a.slug === slug) ?? hub.artists[0];
  return {
    ...match,
    slug,
    viewerHasVoted: false,
    computedAt: new Date().toISOString(),
  };
}

export async function getWalkOfFameHubReport(): Promise<WalkOfFameHubReport> {
  if (!isSupabaseConfigured()) {
    return { artists: [], totalStars: 0, computedAt: new Date().toISOString() };
  }
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  return buildWalkOfFameHubReport(supabase, admin);
}

export async function getArtistWalkOfFameReport(artistSlug: string): Promise<ArtistWalkOfFameReport | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const user = await getSessionUser();
  return buildArtistWalkOfFameReport(supabase, admin, artistSlug, user?.id);
}
