"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getAppUrl } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import {
  createPendingCampaign,
  recordLocalBusinessClick,
  upsertLocalBusiness,
} from "@/lib/services/local-business.service";
import {
  createLocalCouponSchema,
  linkVenueSchema,
  purchaseCampaignSchema,
  recordClickSchema,
  redeemLocalCouponSchema,
  upsertLocalBusinessSchema,
} from "@/lib/validations/local-business";

export type LocalBusinessActionResult = { ok: true; slug?: string; url?: string } | { ok: false; error: string };

async function ownerBusinessId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase.from("local_businesses").select("id, slug").eq("owner_user_id", userId).maybeSingle();
  return data as { id: string; slug: string } | null;
}

export async function upsertLocalBusinessAction(input: unknown): Promise<LocalBusinessActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = upsertLocalBusinessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid business profile" };

  const supabase = await createClient();
  const result = await upsertLocalBusiness(supabase, user.id, {
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description,
    websiteUrl: parsed.data.websiteUrl,
    addressLine: parsed.data.addressLine,
    city: parsed.data.city,
    phone: parsed.data.phone,
    isPublished: parsed.data.isPublished,
  });

  revalidatePath("/local-business/dashboard");
  revalidatePath("/local-business");
  revalidatePath(`/local-business/${result.slug}`);
  return { ok: true, slug: result.slug };
}

export async function linkVenueLocalBusinessAction(input: unknown): Promise<LocalBusinessActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = linkVenueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid venue" };

  const supabase = await createClient();
  const biz = await ownerBusinessId(supabase, user.id);
  if (!biz) return { ok: false, error: "Create your business profile first" };

  const { data: venue } = await supabase.from("venues").select("id, slug").eq("slug", parsed.data.venueSlug).maybeSingle();
  if (!venue) return { ok: false, error: "Venue not found" };

  const { error } = await supabase.from("venue_local_businesses").upsert(
    {
      venue_id: venue.id,
      business_id: biz.id,
      is_featured: parsed.data.isFeatured,
    },
    { onConflict: "venue_id,business_id" }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/livecircuit/venues/${venue.slug}/local`);
  revalidatePath(`/local-business/${biz.slug}`);
  return { ok: true, slug: biz.slug };
}

export async function createLocalCouponAction(input: unknown): Promise<LocalBusinessActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = createLocalCouponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid coupon" };

  const supabase = await createClient();
  const biz = await ownerBusinessId(supabase, user.id);
  if (!biz) return { ok: false, error: "Create your business profile first" };

  const { error } = await supabase.from("local_business_coupons").insert({
    business_id: biz.id,
    code: parsed.data.code.toUpperCase(),
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    discount_label: parsed.data.discountLabel,
    max_redemptions: parsed.data.maxRedemptions ?? null,
    expires_at: parsed.data.expiresAt ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/local-business/dashboard");
  revalidatePath(`/local-business/${biz.slug}`);
  return { ok: true, slug: biz.slug };
}

export async function redeemLocalCouponAction(input: unknown): Promise<LocalBusinessActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = redeemLocalCouponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid coupon" };

  const supabase = await createClient();
  const { data: coupon } = await supabase
    .from("local_business_coupons")
    .select("id, max_redemptions, redemption_count, expires_at, is_active, business_id")
    .eq("id", parsed.data.couponId)
    .maybeSingle();

  if (!coupon?.is_active) return { ok: false, error: "Coupon not available" };
  if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
    return { ok: false, error: "Coupon expired" };
  }
  const max = coupon.max_redemptions as number | null;
  const used = coupon.redemption_count as number;
  if (max != null && used >= max) return { ok: false, error: "Coupon fully redeemed" };

  let venueId: string | null = null;
  if (parsed.data.venueSlug) {
    const { data: venue } = await supabase.from("venues").select("id").eq("slug", parsed.data.venueSlug).maybeSingle();
    venueId = (venue?.id as string) ?? null;
  }

  const { error } = await supabase.from("local_business_coupon_redemptions").insert({
    coupon_id: parsed.data.couponId,
    user_id: user.id,
    venue_id: venueId,
  });

  if (error?.code === "23505") return { ok: false, error: "You already redeemed this coupon" };
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("local_business_coupons")
    .update({ redemption_count: used + 1 })
    .eq("id", parsed.data.couponId);

  revalidatePath("/local-business");
  return { ok: true };
}

export async function recordLocalBusinessClickAction(input: unknown): Promise<LocalBusinessActionResult> {
  if (!isSupabaseConfigured()) return { ok: true };
  const parsed = recordClickSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid" };

  const admin = getSupabaseAdmin();
  await recordLocalBusinessClick(admin, parsed.data.businessId);
  return { ok: true };
}

export async function startLocalCampaignCheckoutAction(input: unknown): Promise<LocalBusinessActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = purchaseCampaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid campaign" };

  if (parsed.data.campaignType === "venue_ad" && !parsed.data.venueSlug) {
    return { ok: false, error: "Select a venue for venue ads" };
  }
  if (parsed.data.campaignType === "festival_sponsor" && !parsed.data.festivalSlug) {
    return { ok: false, error: "Select a festival for sponsorship" };
  }

  const supabase = await createClient();
  const biz = await ownerBusinessId(supabase, user.id);
  if (!biz) return { ok: false, error: "Create your business profile first" };

  let venueId: string | null = null;
  if (parsed.data.venueSlug) {
    const { data: venue } = await supabase.from("venues").select("id").eq("slug", parsed.data.venueSlug).maybeSingle();
    venueId = (venue?.id as string) ?? null;
  }

  let festivalId: string | null = null;
  if (parsed.data.festivalSlug) {
    const { data: fest } = await supabase
      .from("virtual_festivals")
      .select("id")
      .eq("slug", parsed.data.festivalSlug)
      .maybeSingle();
    festivalId = (fest?.id as string) ?? null;
  }

  const admin = getSupabaseAdmin();
  const campaign = await createPendingCampaign(
    admin,
    biz.id,
    parsed.data.campaignType,
    venueId,
    festivalId
  );

  const stripe = getStripe();
  const origin = getAppUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: campaign.price_cents as number,
          product_data: {
            name: `Local business campaign: ${parsed.data.campaignType}`,
            description: biz.slug,
          },
        },
      },
    ],
    metadata: {
      type: "local_business_campaign",
      campaign_id: campaign.id as string,
      business_id: biz.id,
      user_id: user.id,
    },
    success_url: `${origin}/local-business/dashboard?checkout=success`,
    cancel_url: `${origin}/local-business/dashboard?canceled=1`,
  });

  await admin
    .from("local_business_campaigns")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", campaign.id);

  if (!session.url) return { ok: false, error: "Checkout unavailable" };
  return { ok: true, url: session.url };
}
