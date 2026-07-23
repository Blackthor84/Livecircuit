"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createNotification } from "@/lib/services/notifications.service";
import {
  addSponsorMemberSchema,
  createAdvertisementSchema,
  createSponsorCampaignSchema,
  createSponsorCouponSchema,
  foundingSponsorInquirySchema,
  redeemSponsorCouponSchema,
  scheduleAdvertisementSchema,
  updateCampaignStatusSchema,
} from "@/lib/validations/sponsors";

export type SponsorActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

async function requireSponsorOrgAccess(organizationId: string, allowViewer = true) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const supabase = await createClient();
  const admin = await requireRole(["admin"]);
  if (admin) return { ok: true as const, supabase, userId: user.id, isAdmin: true, role: "owner" };

  const { data: member } = await supabase
    .from("sponsor_organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return { ok: false as const, error: "Not a member of this sponsor organization" };
  if (!allowViewer && member.role === "viewer") {
    return { ok: false as const, error: "Insufficient permissions" };
  }

  return { ok: true as const, supabase, userId: user.id, isAdmin: false, role: member.role as string };
}

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}

export async function createSponsorCampaignAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = createSponsorCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId, false);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data, error } = await ctx.supabase
    .from("sponsor_campaigns")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name.trim(),
      venue_id: parsed.data.venueId ?? null,
      budget_cents: parsed.data.budgetCents ?? null,
      starts_at: parsed.data.startsAt ?? null,
      ends_at: parsed.data.endsAt ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateSponsorPaths(parsed.data.organizationId);
  return { ok: true, id: data.id as string };
}

export async function updateSponsorCampaignStatusAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = updateCampaignStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId, false);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error } = await ctx.supabase
    .from("sponsor_campaigns")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.campaignId)
    .eq("organization_id", parsed.data.organizationId);

  if (error) return { ok: false, error: error.message };

  revalidateSponsorPaths(parsed.data.organizationId);
  revalidatePath("/");
  return { ok: true };
}

export async function createSponsorAdvertisementAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = createAdvertisementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId, false);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: campaign } = await ctx.supabase
    .from("sponsor_campaigns")
    .select("id")
    .eq("id", parsed.data.campaignId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!campaign) return { ok: false, error: "Campaign not found" };

  const { data, error } = await ctx.supabase
    .from("advertisements")
    .insert({
      campaign_id: parsed.data.campaignId,
      name: parsed.data.name.trim(),
      creative_type: parsed.data.creativeType ?? "image",
      asset_url: emptyToNull(parsed.data.assetUrl ?? null),
      click_url: emptyToNull(parsed.data.clickUrl ?? null),
      is_interactive: parsed.data.isInteractive ?? false,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateSponsorPaths(parsed.data.organizationId);
  return { ok: true, id: data.id as string };
}

export async function scheduleSponsorAdvertisementAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = scheduleAdvertisementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId, false);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: ad } = await ctx.supabase
    .from("advertisements")
    .select("id, campaign_id, sponsor_campaigns(organization_id)")
    .eq("id", parsed.data.advertisementId)
    .maybeSingle();

  const campRaw = ad?.sponsor_campaigns as unknown as
    | { organization_id: string }
    | { organization_id: string }[]
    | null;
  const camp = Array.isArray(campRaw) ? campRaw[0] : campRaw;
  if (!ad || camp?.organization_id !== parsed.data.organizationId) {
    return { ok: false, error: "Advertisement not found" };
  }

  const { error } = await ctx.supabase.from("advertisement_schedules").insert({
    advertisement_id: parsed.data.advertisementId,
    billboard_id: parsed.data.billboardId,
    priority: parsed.data.priority ?? 0,
    starts_at: parsed.data.startsAt ?? new Date().toISOString(),
    ends_at: parsed.data.endsAt ?? null,
    is_active: true,
  });

  if (error) return { ok: false, error: error.message };

  revalidateSponsorPaths(parsed.data.organizationId);
  revalidatePath("/");
  revalidatePath("/discover");
  revalidatePath("/livecircuit/venues");
  return { ok: true };
}

export async function createSponsorCouponAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = createSponsorCouponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId, false);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: campaign } = await ctx.supabase
    .from("sponsor_campaigns")
    .select("id")
    .eq("id", parsed.data.campaignId)
    .eq("organization_id", parsed.data.organizationId)
    .maybeSingle();

  if (!campaign) return { ok: false, error: "Campaign not found" };

  const { data, error } = await ctx.supabase
    .from("sponsor_coupons")
    .insert({
      campaign_id: parsed.data.campaignId,
      code: parsed.data.code.toUpperCase(),
      title: parsed.data.title.trim(),
      description: emptyToNull(parsed.data.description ?? null),
      discount_bps: parsed.data.discountBps ?? null,
      max_redemptions: parsed.data.maxRedemptions ?? null,
      expires_at: parsed.data.expiresAt ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateSponsorPaths(parsed.data.organizationId);
  return { ok: true, id: data.id as string };
}

export async function redeemSponsorCouponAction(input: unknown): Promise<SponsorActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in to redeem coupons" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const parsed = redeemSponsorCouponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  let query = supabase
    .from("sponsor_coupons")
    .select("id, max_redemptions, redemption_count, expires_at, campaign_id")
    .eq("code", parsed.data.code.toUpperCase());

  if (parsed.data.campaignId) query = query.eq("campaign_id", parsed.data.campaignId);

  const { data: coupon } = await query.maybeSingle();
  if (!coupon) return { ok: false, error: "Coupon not found" };

  if (coupon.expires_at && new Date(coupon.expires_at as string) < new Date()) {
    return { ok: false, error: "Coupon expired" };
  }

  if (
    coupon.max_redemptions != null &&
    (coupon.redemption_count as number) >= (coupon.max_redemptions as number)
  ) {
    return { ok: false, error: "Coupon fully redeemed" };
  }

  const { error } = await supabase.from("coupon_redemptions").insert({
    coupon_id: coupon.id,
    user_id: user.id,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, error: "You already redeemed this coupon" };
    return { ok: false, error: error.message };
  }

  await supabase
    .from("sponsor_coupons")
    .update({ redemption_count: (coupon.redemption_count as number) + 1 })
    .eq("id", coupon.id);

  return { ok: true, id: coupon.id as string };
}

export async function addSponsorMemberAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = addSponsorMemberSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = await requireRole(["admin"]);
  if (!admin) {
    const ctx = await requireSponsorOrgAccess(parsed.data.organizationId, false);
    if (!ctx.ok) return { ok: false, error: ctx.error };
    if (!ctx.isAdmin && ctx.role !== "owner") {
      return { ok: false, error: "Only owners can invite members" };
    }
  }

  const supabase = await createClient();

  const { error } = await supabase.from("sponsor_organization_members").upsert(
    {
      organization_id: parsed.data.organizationId,
      user_id: parsed.data.userId,
      role: parsed.data.role ?? "viewer",
    },
    { onConflict: "organization_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };

  await createNotification({
    userId: parsed.data.userId,
    type: "system",
    title: "Sponsor portal access",
    body: "You were added to a LiveCircuit sponsor organization.",
    link: `/sponsor/dashboard/${parsed.data.organizationId}`,
  });

  revalidateSponsorPaths(parsed.data.organizationId);
  return { ok: true };
}

export async function submitFoundingSponsorInquiryAction(input: unknown): Promise<SponsorActionResult> {
  const parsed = foundingSponsorInquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const supabase = await createClient();
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, slug")
    .eq("slug", parsed.data.venueSlug)
    .maybeSingle();

  if (!venue) return { ok: false, error: "Venue not found" };

  const { data: taken } = await supabase
    .from("venue_sponsorships")
    .select("id")
    .eq("venue_id", venue.id)
    .eq("is_founding_sponsor", true)
    .eq("is_active", true)
    .maybeSingle();

  if (taken) return { ok: false, error: "Founding Sponsor already claimed for this venue" };

  const { data: admins } = await supabase.from("admins").select("user_id");
  const body = `${parsed.data.organizationName} (${parsed.data.contactEmail}) — ${venue.name}: ${parsed.data.message ?? ""}`;

  for (const row of admins ?? []) {
    await createNotification({
      userId: row.user_id as string,
      type: "system",
      title: "Founding Sponsor inquiry",
      body,
      link: `/admin/venues`,
    });
  }

  return { ok: true };
}

function revalidateSponsorPaths(organizationId: string) {
  revalidatePath("/sponsor");
  revalidatePath("/sponsor/dashboard");
  revalidatePath(`/sponsor/dashboard/${organizationId}`);
  revalidatePath("/admin/sponsors");
}
