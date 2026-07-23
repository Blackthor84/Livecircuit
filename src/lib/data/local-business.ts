import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { LOCAL_BUSINESS_CATEGORIES } from "@/lib/constants/local-business";
import {
  buildLocalBusinessBySlug,
  buildLocalBusinessHub,
  buildOwnerDashboard,
  buildVenueLocalBusinesses,
} from "@/lib/services/local-business.service";
import type {
  LocalBusinessDashboardReport,
  LocalBusinessDetail,
  LocalBusinessHubReport,
  VenueLocalBusinessReport,
} from "@/lib/types/local-business";

function demoHub(): LocalBusinessHubReport {
  const featured = [
    {
      id: "demo-biz-1",
      slug: "harbor-roast-demo01",
      name: "Harbor Roast Coffee",
      category: "coffee",
      description: "Pre-show cold brew and pastry boxes for virtual tour fans.",
      websiteUrl: null,
      city: "Boston",
      logoUrl: null,
      isFeatured: true,
    },
  ];
  const byCategory: LocalBusinessHubReport["byCategory"] = {};
  for (const cat of LOCAL_BUSINESS_CATEGORIES) {
    byCategory[cat.value] = cat.value === "coffee" ? featured : [];
  }
  return {
    featured,
    byCategory,
    categories: LOCAL_BUSINESS_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      count: c.value === "coffee" ? 1 : 0,
    })),
    computedAt: new Date().toISOString(),
  };
}

export async function getLocalBusinessHub(): Promise<LocalBusinessHubReport> {
  if (!isSupabaseConfigured()) return demoHub();
  const supabase = await createClient();
  return buildLocalBusinessHub(supabase);
}

export async function getLocalBusinessDetail(slug: string, viewerId: string | null): Promise<LocalBusinessDetail | null> {
  if (!isSupabaseConfigured()) {
    const hub = demoHub();
    const match = hub.featured.find((b) => b.slug === slug);
    if (!match) return null;
    return { ...match, addressLine: null, phone: null, venues: [], coupons: [], activeCampaigns: [] };
  }
  const supabase = await createClient();
  return buildLocalBusinessBySlug(supabase, slug, viewerId);
}

export async function getVenueLocalBusinessReport(venueSlug: string): Promise<VenueLocalBusinessReport | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  return buildVenueLocalBusinesses(supabase, venueSlug);
}

export async function getLocalBusinessDashboard(ownerUserId: string): Promise<LocalBusinessDashboardReport> {
  if (!isSupabaseConfigured()) {
    return {
      business: null,
      analytics: { impressions: 0, clicks: 0, couponRedemptions: 0, activeCampaigns: 0 },
      campaigns: [],
      redemptions: [],
    };
  }
  const supabase = await createClient();
  return buildOwnerDashboard(supabase, ownerUserId);
}
