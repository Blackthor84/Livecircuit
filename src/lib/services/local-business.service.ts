import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  LOCAL_BUSINESS_CATEGORIES,
  localBusinessCategoryLabel,
  localCampaignLabel,
  localCampaignPrice,
} from "@/lib/constants/local-business";
import { slugifyLocalBusiness } from "@/lib/services/local-business-slug";
import type {
  LocalBusinessDashboardReport,
  LocalBusinessDetail,
  LocalBusinessHubReport,
  LocalBusinessSummary,
  VenueLocalBusinessReport,
} from "@/lib/types/local-business";

function mapBusiness(row: Record<string, unknown>, featured?: boolean): LocalBusinessSummary {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    category: row.category as string,
    description: row.description as string,
    websiteUrl: (row.website_url as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    isFeatured: featured,
  };
}

export async function buildLocalBusinessHub(supabase: SupabaseClient): Promise<LocalBusinessHubReport> {
  const { data: rows } = await supabase
    .from("local_businesses")
    .select("*")
    .eq("is_published", true)
    .order("updated_at", { ascending: false })
    .limit(80);

  const listings = (rows ?? []).map((r) => mapBusiness(r));

  const { data: featuredLinks } = await supabase
    .from("venue_local_businesses")
    .select("business_id, is_featured")
    .eq("is_featured", true);

  const featuredIds = new Set((featuredLinks ?? []).map((l) => l.business_id as string));
  let featured = listings.filter((l) => featuredIds.has(l.id)).slice(0, 12);
  if (!featured.length) featured = listings.slice(0, 8);

  const byCategory: Record<string, LocalBusinessSummary[]> = {};
  for (const cat of LOCAL_BUSINESS_CATEGORIES) {
    byCategory[cat.value] = listings.filter((l) => l.category === cat.value);
  }

  return {
    featured: featured.map((f) => ({ ...f, isFeatured: true })),
    byCategory,
    categories: LOCAL_BUSINESS_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      count: byCategory[c.value]?.length ?? 0,
    })),
    computedAt: new Date().toISOString(),
  };
}

export async function buildLocalBusinessBySlug(
  supabase: SupabaseClient,
  slug: string,
  viewerId: string | null
): Promise<LocalBusinessDetail | null> {
  const { data: row } = await supabase.from("local_businesses").select("*").eq("slug", slug).maybeSingle();
  if (!row) return null;
  if (!row.is_published && row.owner_user_id !== viewerId) return null;

  const businessId = row.id as string;

  const [{ data: venueLinks }, { data: coupons }, { data: campaigns }] = await Promise.all([
    supabase
      .from("venue_local_businesses")
      .select("is_featured, venues(slug, name)")
      .eq("business_id", businessId),
    supabase
      .from("local_business_coupons")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true),
    supabase
      .from("local_business_campaigns")
      .select("campaign_type, status")
      .eq("business_id", businessId)
      .eq("status", "active"),
  ]);

  let redeemedSet = new Set<string>();
  if (viewerId && coupons?.length) {
    const { data: redemptions } = await supabase
      .from("local_business_coupon_redemptions")
      .select("coupon_id")
      .eq("user_id", viewerId)
      .in(
        "coupon_id",
        coupons.map((c) => c.id as string)
      );
    redeemedSet = new Set((redemptions ?? []).map((r) => r.coupon_id as string));
  }

  await incrementCampaignMetric(supabase, businessId, "impression");

  const venues = (venueLinks ?? []).map((link) => {
    const v = link.venues as { slug: string; name: string } | { slug: string; name: string }[];
    const venue = Array.isArray(v) ? v[0] : v;
    return {
      slug: venue?.slug ?? "",
      name: venue?.name ?? "",
      isFeatured: link.is_featured as boolean,
    };
  });

  return {
    ...mapBusiness(row),
    addressLine: (row.address_line as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    venues,
    coupons: (coupons ?? []).map((c) => {
      const max = c.max_redemptions as number | null;
      const used = c.redemption_count as number;
      return {
        id: c.id as string,
        code: c.code as string,
        title: c.title as string,
        description: (c.description as string | null) ?? null,
        discountLabel: c.discount_label as string,
        expiresAt: (c.expires_at as string | null) ?? null,
        remaining: max != null ? Math.max(0, max - used) : null,
        redeemedByUser: redeemedSet.has(c.id as string),
      };
    }),
    activeCampaigns: (campaigns ?? []).map((c) => ({
      type: c.campaign_type as string,
      label: localCampaignLabel(c.campaign_type as string),
    })),
  };
}

export async function buildVenueLocalBusinesses(
  supabase: SupabaseClient,
  venueSlug: string
): Promise<VenueLocalBusinessReport | null> {
  const { data: venue } = await supabase.from("venues").select("id, name, slug").eq("slug", venueSlug).maybeSingle();
  if (!venue) return null;

  const { data: links } = await supabase
    .from("venue_local_businesses")
    .select("is_featured, sort_order, local_businesses(*)")
    .eq("venue_id", venue.id)
    .order("is_featured", { ascending: false })
    .order("sort_order");

  const businesses = (links ?? [])
    .map((link) => {
      const b = link.local_businesses as Record<string, unknown> | Record<string, unknown>[] | null;
      const row = Array.isArray(b) ? b[0] : b;
      if (!row || !row.is_published) return null;
      return mapBusiness(row, link.is_featured as boolean);
    })
    .filter(Boolean) as LocalBusinessSummary[];

  return {
    venueSlug: venue.slug as string,
    venueName: venue.name as string,
    businesses,
  };
}

export async function buildOwnerDashboard(
  supabase: SupabaseClient,
  ownerUserId: string
): Promise<LocalBusinessDashboardReport> {
  const { data: row } = await supabase
    .from("local_businesses")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (!row) {
    return {
      business: null,
      analytics: { impressions: 0, clicks: 0, couponRedemptions: 0, activeCampaigns: 0 },
      campaigns: [],
      redemptions: [],
    };
  }

  const detail = await buildLocalBusinessBySlug(supabase, row.slug as string, ownerUserId);

  const { data: campaigns } = await supabase
    .from("local_business_campaigns")
    .select("*")
    .eq("business_id", row.id)
    .order("created_at", { ascending: false });

  const campaignRows = campaigns ?? [];
  const impressions = campaignRows.reduce((s, c) => s + (c.impression_count as number), 0);
  const clicks = campaignRows.reduce((s, c) => s + (c.click_count as number), 0);
  const activeCampaigns = campaignRows.filter((c) => c.status === "active").length;

  const { data: couponRows } = await supabase
    .from("local_business_coupons")
    .select("id, title")
    .eq("business_id", row.id);

  const couponIds = (couponRows ?? []).map((c) => c.id as string);
  let redemptions: LocalBusinessDashboardReport["redemptions"] = [];
  let couponRedemptions = 0;

  if (couponIds.length) {
    const { data: redemptionRows } = await supabase
      .from("local_business_coupon_redemptions")
      .select("created_at, user_id, coupon_id")
      .in("coupon_id", couponIds)
      .order("created_at", { ascending: false })
      .limit(25);

    couponRedemptions = redemptionRows?.length ?? 0;
    const userIds = [...new Set((redemptionRows ?? []).map((r) => r.user_id as string))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id as string, p.display_name as string | null]));
    const couponMap = new Map((couponRows ?? []).map((c) => [c.id as string, c.title as string]));

    redemptions = (redemptionRows ?? []).map((r) => ({
      couponTitle: couponMap.get(r.coupon_id as string) ?? "Coupon",
      userDisplay: profileMap.get(r.user_id as string)?.trim() || "Fan",
      redeemedAt: r.created_at as string,
    }));
  }

  return {
    business: detail,
    analytics: { impressions, clicks, couponRedemptions, activeCampaigns },
    campaigns: campaignRows.map((c) => ({
      id: c.id as string,
      type: c.campaign_type as string,
      status: c.status as string,
      priceCents: c.price_cents as number,
      impressionCount: c.impression_count as number,
      clickCount: c.click_count as number,
      startsAt: (c.starts_at as string | null) ?? null,
      endsAt: (c.ends_at as string | null) ?? null,
    })),
    redemptions,
  };
}

export async function upsertLocalBusiness(
  supabase: SupabaseClient,
  ownerUserId: string,
  input: {
    name: string;
    category: string;
    description: string;
    websiteUrl?: string;
    addressLine?: string;
    city?: string;
    phone?: string;
    isPublished: boolean;
  }
) {
  const { data: existing } = await supabase
    .from("local_businesses")
    .select("id, slug")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  const slug = (existing?.slug as string) ?? slugifyLocalBusiness(input.name, ownerUserId);

  const payload = {
    owner_user_id: ownerUserId,
    slug,
    name: input.name,
    category: input.category,
    description: input.description,
    website_url: input.websiteUrl?.trim() || null,
    address_line: input.addressLine?.trim() || null,
    city: input.city?.trim() || null,
    phone: input.phone?.trim() || null,
    is_published: input.isPublished,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await supabase.from("local_businesses").update(payload).eq("id", existing.id);
    return { id: existing.id as string, slug };
  }

  const { data, error } = await supabase.from("local_businesses").insert(payload).select("id, slug").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create business");
  return { id: data.id as string, slug: data.slug as string };
}

async function incrementCampaignMetric(
  supabase: SupabaseClient,
  businessId: string,
  metric: "impression" | "click"
) {
  const column = metric === "impression" ? "impression_count" : "click_count";
  const { data: active } = await supabase
    .from("local_business_campaigns")
    .select("id, impression_count, click_count")
    .eq("business_id", businessId)
    .eq("status", "active");

  for (const row of active ?? []) {
    const current = row[column] as number;
    await supabase
      .from("local_business_campaigns")
      .update({ [column]: current + 1, updated_at: new Date().toISOString() })
      .eq("id", row.id);
  }
}

export async function recordLocalBusinessClick(supabase: SupabaseClient, businessId: string) {
  await incrementCampaignMetric(supabase, businessId, "click");
}

export async function handleLocalBusinessCampaignCheckout(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (session.metadata?.type !== "local_business_campaign") return false;
  const campaignId = session.metadata.campaign_id;
  if (!campaignId) return true;

  const now = new Date();
  const ends = new Date(now);
  ends.setDate(ends.getDate() + 30);

  await supabase
    .from("local_business_campaigns")
    .update({
      status: "active",
      paid_at: now.toISOString(),
      starts_at: now.toISOString(),
      ends_at: ends.toISOString(),
      stripe_checkout_session_id: session.id,
      updated_at: now.toISOString(),
    })
    .eq("id", campaignId);

  return true;
}

export async function createPendingCampaign(
  supabase: SupabaseClient,
  businessId: string,
  campaignType: string,
  venueId: string | null,
  festivalId: string | null
) {
  const price_cents = localCampaignPrice(campaignType);
  const { data, error } = await supabase
    .from("local_business_campaigns")
    .insert({
      business_id: businessId,
      campaign_type: campaignType,
      status: "pending_payment",
      venue_id: venueId,
      festival_id: festivalId,
      price_cents,
    })
    .select("id, price_cents, currency")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create campaign");
  return data;
}

export { localBusinessCategoryLabel, localCampaignLabel, localCampaignPrice };
