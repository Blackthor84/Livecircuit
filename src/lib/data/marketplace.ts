import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { CREATOR_SERVICE_CATEGORIES } from "@/lib/constants/creator-marketplace";
import {
  buildBookingDetail,
  buildCreatorProfileBySlug,
  buildMarketplaceHub,
  listBookingsForUser,
} from "@/lib/services/marketplace.service";
import type { BookingDetail, CreatorProfileDetail, MarketplaceHubReport } from "@/lib/types/marketplace";

function demoHub(): MarketplaceHubReport {
  const featured = [
    {
      userId: "demo-creator-1",
      slug: "maya-pixels-demo01",
      displayName: "Maya Chen",
      avatarUrl: null,
      headline: "Tour poster & social kit designer",
      bio: "Neon-forward visuals for indie and EDM artists.",
      primaryCategory: "graphic_designer",
      secondaryCategories: ["marketing_specialist"],
      rateCents: 15000,
      currency: "USD",
      averageRating: 4.9,
      reviewCount: 12,
    },
  ];
  const byCategory: MarketplaceHubReport["byCategory"] = {};
  for (const cat of CREATOR_SERVICE_CATEGORIES) {
    byCategory[cat.value] = cat.value === "graphic_designer" ? featured : [];
  }
  return {
    featured,
    byCategory,
    categories: CREATOR_SERVICE_CATEGORIES.map((c) => ({
      value: c.value,
      label: c.label,
      count: c.value === "graphic_designer" ? 1 : 0,
    })),
    computedAt: new Date().toISOString(),
  };
}

export async function getMarketplaceHub(): Promise<MarketplaceHubReport> {
  if (!isSupabaseConfigured()) return demoHub();
  const supabase = await createClient();
  return buildMarketplaceHub(supabase);
}

export async function getCreatorProfile(slug: string): Promise<CreatorProfileDetail | null> {
  if (!isSupabaseConfigured()) {
    const hub = demoHub();
    const match = hub.featured.find((c) => c.slug === slug);
    if (!match) return null;
    return { ...match, portfolio: [], reviews: [] };
  }
  const supabase = await createClient();
  return buildCreatorProfileBySlug(supabase, slug);
}

export async function getUserMarketplaceBookings(userId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  return listBookingsForUser(supabase, userId);
}

export async function getMarketplaceBooking(bookingId: string, userId: string): Promise<BookingDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  return buildBookingDetail(supabase, bookingId, userId);
}

export async function getCreatorStudioProfile(userId: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("creator_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  return buildCreatorProfileBySlug(supabase, data.slug as string);
}
