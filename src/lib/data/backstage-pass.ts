import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  buildBackstageArtistHub,
  buildBackstagePassPage,
} from "@/lib/services/backstage-pass.service";
import type { BackstageArtistHub, BackstagePassPage } from "@/lib/types/backstage-pass";
import { DEFAULT_BACKSTAGE_PERKS } from "@/lib/types/backstage-pass";

function demoPage(slug: string): BackstagePassPage {
  return {
    artistId: "demo",
    artistSlug: slug,
    artistName: "Demo Artist",
    plan: {
      id: "demo-plan",
      slug: "backstage",
      name: "Backstage Pass",
      description: "Monthly membership with exclusive access.",
      priceCentsMonthly: 999,
      perks: [...DEFAULT_BACKSTAGE_PERKS],
      discordUrl: "https://discord.com/invite/example",
      earlyTicketHours: 48,
      isActive: true,
    },
    announcements: [],
    member: null,
    isOwner: false,
  };
}

export async function getBackstagePassPage(
  artistSlug: string,
  userId: string | null
): Promise<BackstagePassPage | null> {
  if (!isSupabaseConfigured()) return demoPage(artistSlug);
  const supabase = await createClient();
  return buildBackstagePassPage(supabase, artistSlug, userId);
}

export async function getBackstageArtistHub(userId: string): Promise<BackstageArtistHub | null> {
  if (!isSupabaseConfigured()) {
    return {
      artistId: "demo",
      artistSlug: "demo-artist",
      plans: [
        {
          id: "p1",
          slug: "backstage",
          name: "Backstage Pass",
          description: null,
          priceCentsMonthly: 999,
          perks: [...DEFAULT_BACKSTAGE_PERKS],
          discordUrl: null,
          earlyTicketHours: 24,
          isActive: true,
        },
      ],
      analytics: { activeSubscribers: 42, mrrCents: 41958, newThisMonth: 8, totalAllTime: 120 },
      recentSubscribers: [],
    };
  }
  const supabase = await createClient();
  return buildBackstageArtistHub(supabase, userId);
}
