import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidateTag } from "next/cache";
import { MONETIZATION_CACHE_TAG } from "@/lib/monetization/pricing-resolver.server";
import { DEFAULT_BOOKING_FEES } from "@/lib/pricing/livecircuit-pricing";
import { AGENCY_PARTNERSHIP_PLANS } from "@/lib/agency/partnership-program";

let bootstrapPromise: Promise<boolean> | null = null;

export async function ensureMonetizationBootstrap(): Promise<boolean> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = runBootstrap();
  return bootstrapPromise;
}

async function runBootstrap(): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("monetization_venue_tiers")
    .select("tier_id", { count: "exact", head: true });

  if (count && count > 0) return false;

  const venueTiers = Object.entries(DEFAULT_BOOKING_FEES).map(([tierId, fee], i) => ({
    tier_id: tierId,
    name: tierId.charAt(0).toUpperCase() + tierId.slice(1),
    booking_fee_cents: Math.round(fee * 100),
    sort_order: i + 1,
    is_active: true,
    visibility: "enabled",
  }));

  await admin.from("monetization_venue_tiers").upsert(venueTiers, { onConflict: "tier_id" });

  await admin.from("monetization_ticket_config").upsert(
    {
      id: "default",
      platform_fee_percent: 10,
      flat_ticket_fee_cents: 0,
      visibility: "enabled",
    },
    { onConflict: "id" }
  );

  const agencyPlans = AGENCY_PARTNERSHIP_PLANS.map((plan, i) => ({
    plan_id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    price_cents: plan.priceCents,
    promotional_credits_cents: plan.promotionalCreditsCents,
    included_venue_tiers: plan.includedVenueTiers ?? [],
    artist_limit: plan.artistLimit,
    staff_limit: plan.staffLimit,
    is_popular: plan.popular ?? false,
    features: plan.features,
    highlights: plan.highlights ?? [],
    sort_order: i + 1,
    visibility: "enabled",
  }));

  await admin.from("monetization_agency_plans").upsert(agencyPlans, { onConflict: "plan_id" });

  revalidateTag(MONETIZATION_CACHE_TAG, "max");
  return true;
}
