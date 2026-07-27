import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isAdminRole } from "@/lib/auth/roles";
import { getVenueDisplayName } from "@/lib/venues/display-name";

export type SponsorOrgSummary = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  role: string;
};

export type SponsorCampaignRow = {
  id: string;
  name: string;
  status: string;
  budget_cents: number | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_id: string | null;
  venues: { name: string; slug: string } | null;
};

export type SponsorDashboardData = {
  organization: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
  };
  memberships: { user_id: string; role: string }[];
  campaigns: SponsorCampaignRow[];
  sponsorships: {
    id: string;
    product: string;
    is_founding_sponsor: boolean;
    is_active: boolean;
    display_name: string | null;
    venues: { name: string; slug: string } | null;
  }[];
  advertisements: {
    id: string;
    name: string;
    campaign_id: string;
    asset_url: string | null;
    is_active: boolean;
  }[];
  billboards: { id: string; slug: string; label: string; venue_id: string | null }[];
  coupons: {
    id: string;
    code: string;
    title: string;
    redemption_count: number;
    max_redemptions: number | null;
  }[];
};

export type FoundingOpportunity = {
  venue_id: string;
  slug: string;
  name: string;
  region: string;
  capacity: number;
};

export type PlatformSponsorBanner = {
  advertisement_id: string;
  billboard_id: string;
  name: string;
  asset_url: string | null;
  click_url: string | null;
  organization_name: string | null;
};

async function getClient() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

export async function getUserSponsorOrganizations(userId: string): Promise<SponsorOrgSummary[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("sponsor_organization_members")
    .select("role, sponsor_organizations(id, slug, name, logo_url)")
    .eq("user_id", userId);

  return (data ?? []).map((row) => {
    const org = row.sponsor_organizations as
      | { id: string; slug: string; name: string; logo_url: string | null }
      | { id: string; slug: string; name: string; logo_url: string | null }[];
    const o = Array.isArray(org) ? org[0] : org;
    return {
      id: o.id,
      slug: o.slug,
      name: o.name,
      logo_url: o.logo_url,
      role: row.role as string,
    };
  });
}

export async function userHasSponsorAccess(userId: string): Promise<boolean> {
  const orgs = await getUserSponsorOrganizations(userId);
  return orgs.length > 0;
}

export async function getSponsorDashboard(
  organizationId: string,
  userId: string
): Promise<SponsorDashboardData | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: membership } = await supabase
    .from("sponsor_organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!membership && !isAdminRole(profile?.role)) return null;

  const { data: org } = await supabase
    .from("sponsor_organizations")
    .select("id, slug, name, logo_url, website_url")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) return null;

  const [campaigns, sponsorships, ads, billboards, members] = await Promise.all([
    supabase
      .from("sponsor_campaigns")
      .select("id, name, status, budget_cents, starts_at, ends_at, venue_id, venues(name, slug)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("venue_sponsorships")
      .select("id, product, is_founding_sponsor, is_active, display_name, venues(name, slug)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase.from("advertisements").select("id, name, campaign_id, asset_url, is_active").limit(100),
    supabase
      .from("venue_billboards")
      .select("id, slug, label, venue_id")
      .eq("is_active", true)
      .order("slug")
      .limit(200),
    supabase
      .from("sponsor_organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId),
  ]);

  const campaignIds = (campaigns.data ?? []).map((c) => c.id as string);
  const filteredAds = (ads.data ?? []).filter((a) => campaignIds.includes(a.campaign_id as string));

  const { data: couponRows } = await supabase
    .from("sponsor_coupons")
    .select("id, code, title, redemption_count, max_redemptions, campaign_id")
    .in("campaign_id", campaignIds.length ? campaignIds : ["00000000-0000-0000-0000-000000000000"]);

  return {
    organization: org as SponsorDashboardData["organization"],
    memberships: (members.data ?? []) as SponsorDashboardData["memberships"],
    campaigns: (campaigns.data ?? []) as unknown as SponsorCampaignRow[],
    sponsorships: (sponsorships.data ?? []) as unknown as SponsorDashboardData["sponsorships"],
    advertisements: filteredAds as SponsorDashboardData["advertisements"],
    billboards: (billboards.data ?? []) as SponsorDashboardData["billboards"],
    coupons: (couponRows ?? []) as SponsorDashboardData["coupons"],
  };
}

export async function listFoundingSponsorOpportunities(): Promise<FoundingOpportunity[]> {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data: venues } = await supabase
    .from("venues")
    .select("id, slug, name, default_name, display_name, sponsored_name, sponsorship_status, region, capacity")
    .eq("is_active", true)
    .in("sponsorship_status", ["available", "expired"])
    .order("popularity_score", { ascending: false });

  if (!venues?.length) return [];

  const { data: taken } = await supabase
    .from("venue_sponsorships")
    .select("venue_id")
    .eq("is_founding_sponsor", true)
    .eq("is_active", true);

  const takenSet = new Set((taken ?? []).map((t) => t.venue_id as string));

  return venues
    .filter((v) => !takenSet.has(v.id as string))
    .map((v) => ({
      venue_id: v.id as string,
      slug: v.slug as string,
      name: getVenueDisplayName({
        default_name: (v.default_name as string) ?? (v.name as string),
        display_name: (v.display_name as string) ?? (v.name as string),
        sponsored_name: v.sponsored_name as string | null,
        sponsorship_status: v.sponsorship_status as "available" | "pending" | "active" | "expired",
        name: v.name as string,
      }),
      region: v.region as string,
      capacity: v.capacity as number,
    }));
}

export async function getPlatformHomepageSponsorBanner(): Promise<PlatformSponsorBanner | null> {
  const supabase = await getClient();
  if (!supabase) return null;

  const { data: billboard } = await supabase
    .from("venue_billboards")
    .select("id")
    .is("venue_id", null)
    .eq("slug", "platform-homepage")
    .maybeSingle();

  if (!billboard) return null;

  const { data: schedule } = await supabase
    .from("advertisement_schedules")
    .select("advertisements(id, name, asset_url, click_url)")
    .eq("billboard_id", billboard.id as string)
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  const adRaw = schedule?.advertisements;
  const ad = Array.isArray(adRaw) ? adRaw[0] : adRaw;
  if (!ad) return null;

  return {
    advertisement_id: ad.id as string,
    billboard_id: billboard.id as string,
    name: ad.name as string,
    asset_url: ad.asset_url as string | null,
    click_url: ad.click_url as string | null,
    organization_name: null,
  };
}

export async function listSponsorOrganizationsAdmin() {
  const supabase = await getClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("sponsor_organizations")
    .select("id, slug, name, logo_url, billing_email")
    .order("name");

  return data ?? [];
}
