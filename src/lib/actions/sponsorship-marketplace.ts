"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getNextQueuePosition } from "@/lib/sponsorship/waiting-list";

export type MarketplaceActionResult = { ok: true; id?: string } | { ok: false; error: string };

const waitlistSchema = z.object({
  organizationId: z.string().uuid(),
  slotTypeSlug: z.string().min(1),
  venueId: z.string().uuid().nullable().optional(),
  contactName: z.string().max(120).nullable().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const bidSchema = z.object({
  organizationId: z.string().uuid(),
  auctionId: z.string().uuid(),
  bidAmountCents: z.coerce.number().int().min(1),
  notes: z.string().max(500).nullable().optional(),
});

async function requireSponsorOrgAccess(organizationId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const admin = await requireRole([...ADMIN_ROLES]);
  if (admin) return { ok: true as const, userId: user.id };

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("sponsor_organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) return { ok: false as const, error: "Not a member of this sponsor organization" };
  return { ok: true as const, userId: user.id };
}

export async function joinSponsorshipWaitingListAction(input: unknown): Promise<MarketplaceActionResult> {
  const parsed = waitlistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId);
  if (!ctx.ok) return ctx;

  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const position = await getNextQueuePosition(parsed.data.slotTypeSlug, parsed.data.venueId);
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("sponsorship_waiting_list")
    .insert({
      organization_id: parsed.data.organizationId,
      slot_type_slug: parsed.data.slotTypeSlug,
      venue_id: parsed.data.venueId ?? null,
      contact_name: parsed.data.contactName ?? null,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone ?? null,
      notes: parsed.data.notes ?? null,
      queue_position: position,
      status: "active",
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/sponsor/marketplace");
  revalidatePath(`/sponsor/dashboard/${parsed.data.organizationId}`);
  return { ok: true, id: data?.id as string };
}

export async function submitAuctionBidAction(input: unknown): Promise<MarketplaceActionResult> {
  const parsed = bidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const ctx = await requireSponsorOrgAccess(parsed.data.organizationId);
  if (!ctx.ok) return ctx;

  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const admin = getSupabaseAdmin();

  const { data: auction } = await admin
    .from("sponsorship_auctions")
    .select("status, current_high_bid_cents")
    .eq("id", parsed.data.auctionId)
    .maybeSingle();

  if (!auction || auction.status !== "open") {
    return { ok: false, error: "Auction is not open for bids" };
  }

  if (parsed.data.bidAmountCents <= (auction.current_high_bid_cents as number)) {
    return { ok: false, error: "Bid must exceed current high bid" };
  }

  const { data, error } = await admin
    .from("sponsorship_auction_bids")
    .insert({
      auction_id: parsed.data.auctionId,
      organization_id: parsed.data.organizationId,
      bid_amount_cents: parsed.data.bidAmountCents,
      notes: parsed.data.notes ?? null,
      submitted_by: ctx.userId,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  await admin
    .from("sponsorship_auctions")
    .update({ current_high_bid_cents: parsed.data.bidAmountCents })
    .eq("id", parsed.data.auctionId);

  revalidatePath("/admin/sponsorships");
  revalidatePath("/sponsor/marketplace");
  return { ok: true, id: data?.id as string };
}

export async function withdrawWaitingListAction(entryId: string, organizationId: string): Promise<MarketplaceActionResult> {
  const ctx = await requireSponsorOrgAccess(organizationId);
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("sponsorship_waiting_list")
    .update({ status: "withdrawn" })
    .eq("id", entryId)
    .eq("organization_id", organizationId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/sponsor/marketplace");
  revalidatePath(`/sponsor/dashboard/${organizationId}`);
  return { ok: true };
}
