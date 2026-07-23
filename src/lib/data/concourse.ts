import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { VenueEventCard, VenueListItem } from "@/lib/data/venues";
import { listVenueEvents, getVenueBySlug } from "@/lib/data/venues";

export type ConcourseShopPublic = {
  id: string;
  kind: string;
  name: string;
  slug: string;
  description: string | null;
  banner_url: string | null;
  external_url: string | null;
  zone: { x?: number; y?: number; w?: number; h?: number; vrAnchor?: string };
  sponsor_organization_id: string | null;
  sponsor_organizations: { name: string; logo_url: string | null } | null;
  products: {
    id: string;
    sort_order: number;
    external_url: string | null;
    products: {
      id: string;
      slug: string;
      name: string;
      price_cents: number;
      image_urls: string[];
      artists: { slug: string } | null;
    } | null;
  }[];
};

export type ConcourseBillboardPublic = {
  id: string;
  slug: string;
  label: string;
  zone_key: string | null;
  advertisement: {
    id: string;
    name: string;
    asset_url: string | null;
    click_url: string | null;
    is_interactive: boolean;
  } | null;
};

export type VenueConcoursePageData = {
  venue: VenueListItem;
  shops: ConcourseShopPublic[];
  billboards: ConcourseBillboardPublic[];
  upcoming_events: VenueEventCard[];
  live_events: VenueEventCard[];
  announcements: {
    id: string;
    title: string;
    body: string;
    published_at: string;
  }[];
  venue_directory: { id: string; slug: string; name: string; region: string }[];
  concourse_layout: Record<string, unknown>;
  vr_config: Record<string, unknown>;
};

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getVenueConcoursePage(slug: string): Promise<VenueConcoursePageData | null> {
  const base = await getVenueBySlug(slug);
  if (!base) return null;

  const supabase = await getClient();
  if (!supabase) return null;

  const venueId = base.id;

  const [shops, billboards, announcements, directory, liveList, upcomingList] =
    await Promise.all([
      supabase
        .from("concourse_shops")
        .select(
          `
          id, kind, name, slug, description, banner_url, external_url, zone, sponsor_organization_id,
          sponsor_organizations(name, logo_url),
          concourse_shop_products(
            id, sort_order, external_url,
            products(id, slug, name, price_cents, image_urls, artists(slug))
          )
        `
        )
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("venue_billboards")
        .select("id, slug, label, zone_key")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .in("zone_key", ["concourse", "interactive", "vip-lounge"]),
      supabase
        .from("venue_announcements")
        .select("id, title, body, published_at")
        .eq("venue_id", venueId)
        .order("published_at", { ascending: false })
        .limit(5),
      supabase
        .from("venues")
        .select("id, slug, name, region")
        .eq("is_active", true)
        .neq("id", venueId)
        .order("name")
        .limit(12),
      listVenueEvents(slug, { status: "live", page: 1, limit: 12 }),
      listVenueEvents(slug, { status: "scheduled", page: 1, limit: 12 }),
    ]);

  const billboardRows = billboards.data ?? [];
  const billboardsWithAds: ConcourseBillboardPublic[] = [];

  for (const bb of billboardRows) {
    const { data: schedule } = await supabase
      .from("advertisement_schedules")
      .select("advertisements(id, name, asset_url, click_url, is_interactive)")
      .eq("billboard_id", bb.id as string)
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(1)
      .maybeSingle();

    const adRaw = schedule?.advertisements;
    const ad = Array.isArray(adRaw) ? adRaw[0] : adRaw;

    billboardsWithAds.push({
      id: bb.id as string,
      slug: bb.slug as string,
      label: bb.label as string,
      zone_key: bb.zone_key as string | null,
      advertisement: ad
        ? {
            id: ad.id as string,
            name: ad.name as string,
            asset_url: ad.asset_url as string | null,
            click_url: ad.click_url as string | null,
            is_interactive: ad.is_interactive as boolean,
          }
        : null,
    });
  }

  return {
    venue: base,
    shops: (shops.data ?? []) as unknown as ConcourseShopPublic[],
    billboards: billboardsWithAds,
    upcoming_events: upcomingList?.items ?? [],
    live_events: liveList?.items ?? [],
    announcements: (announcements.data ?? []) as VenueConcoursePageData["announcements"],
    venue_directory: (directory.data ?? []) as VenueConcoursePageData["venue_directory"],
    concourse_layout: base.concourse_layout ?? {},
    vr_config: base.vr_config ?? {},
  };
}
