"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  CONTRACT_SELECT,
  mapBusinessContract,
  toContractPayload,
  type CreateContractInput,
} from "@/lib/sponsorship/contracts";
import { computeContractEndDate } from "@/lib/sponsorship/constants";
import { recommendSponsorshipPrice } from "@/lib/sponsorship/pricing-recommendations";
import { notifyWaitingListOnExpiration } from "@/lib/sponsorship/renewal-notifications";
import { getNextQueuePosition } from "@/lib/sponsorship/waiting-list";

export type SponsorshipAdminResult = { ok: true; id?: string } | { ok: false; error: string };

const paymentFrequencySchema = z.enum([
  "monthly",
  "quarterly",
  "bi_annual",
  "annual",
  "one_time",
  "custom",
]);

const contractStatusSchema = z.enum(["pending", "active", "expired", "cancelled", "reserved"]);

const fullContractSchema = z.object({
  id: z.string().uuid().optional(),
  slotTypeSlug: z.string().min(1),
  organizationId: z.string().uuid().nullable().optional(),
  venueId: z.string().uuid().nullable().optional(),
  eventId: z.string().uuid().nullable().optional(),
  tourId: z.string().uuid().nullable().optional(),
  featuredStageId: z.string().uuid().nullable().optional(),
  displayLabel: z.string().min(2).max(200),
  logoUrl: z.string().url().nullable().optional(),
  sponsorWebsite: z.string().url().nullable().optional(),
  contractValueCents: z.coerce.number().int().min(0),
  contractLengthMonths: z.coerce.number().int().min(1).nullable().optional(),
  customContractLength: z.boolean().optional(),
  paymentFrequency: paymentFrequencySchema.optional(),
  customPaymentPlan: z.string().max(500).nullable().optional(),
  contractStartsAt: z.string().nullable().optional(),
  contractEndsAt: z.string().nullable().optional(),
  autoRenew: z.boolean().optional(),
  contactName: z.string().max(120).nullable().optional(),
  contactEmail: z.string().email().nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  aiRecommendedPriceCents: z.coerce.number().int().nullable().optional(),
  aiPriceAccepted: z.boolean().nullable().optional(),
  status: contractStatusSchema.optional(),
  renewedFromId: z.string().uuid().nullable().optional(),
  firstRightOfRenewalDays: z.coerce.number().int().nullable().optional(),
});

const slotTypeSchema = z.object({
  slug: z.string().min(2).max(80).regex(/^[a-z0-9_]+$/),
  name: z.string().min(2).max(120),
  description: z.string().max(500).nullable().optional(),
  scope: z.enum(["venue", "event", "tour", "platform", "featured_stage"]),
  listPriceCents: z.coerce.number().int().min(0).nullable().optional(),
  tier: z.coerce.number().int().min(0).max(100).optional(),
  visibility: z.string().optional(),
  displayLocation: z.string().nullable().optional(),
  requiresApproval: z.boolean().optional(),
  auctionEnabled: z.boolean().optional(),
});

const auctionSchema = z.object({
  slotTypeSlug: z.string().min(1),
  venueId: z.string().uuid().nullable().optional(),
  displayLabel: z.string().min(2).max(200),
  description: z.string().max(500).nullable().optional(),
  startingBidCents: z.coerce.number().int().min(0),
  reservePriceCents: z.coerce.number().int().min(0).nullable().optional(),
  opensAt: z.string().nullable().optional(),
  closesAt: z.string().nullable().optional(),
});

async function requireAdminCtx() {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile) return { ok: false as const, error: "Admin access required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };
  return { ok: true as const, adminId: profile.id as string };
}

function revalidateSponsorshipPaths(venueId?: string | null) {
  revalidatePath("/admin/sponsorships");
  revalidatePath("/admin/revenue");
  revalidatePath("/sponsor/marketplace");
  if (venueId) revalidatePath(`/admin/venues/${venueId}`);
}

export async function savePremiumContractAction(input: unknown): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const parsed = fullContractSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const admin = getSupabaseAdmin();
  let endsAt = parsed.data.contractEndsAt ?? null;
  if (!endsAt && parsed.data.contractStartsAt && parsed.data.contractLengthMonths) {
    endsAt = computeContractEndDate(parsed.data.contractStartsAt, parsed.data.contractLengthMonths);
  }

  const payload = toContractPayload(
    {
      ...parsed.data,
      contractEndsAt: endsAt,
      status: parsed.data.status ?? "pending",
    } as CreateContractInput,
    parsed.data.id
  );

  if (parsed.data.id) {
    const { error } = await admin
      .from("premium_sponsorship_contracts")
      .update(payload)
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
    revalidateSponsorshipPaths(parsed.data.venueId);
    return { ok: true, id: parsed.data.id };
  }

  const { data, error } = await admin
    .from("premium_sponsorship_contracts")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This sponsorship slot is already sold — only one exclusive sponsor allowed." };
    }
    return { ok: false, error: error.message };
  }

  revalidateSponsorshipPaths(parsed.data.venueId);
  return { ok: true, id: data?.id as string };
}

/** @deprecated Use savePremiumContractAction */
export async function upsertPremiumSponsorshipAction(input: unknown): Promise<SponsorshipAdminResult> {
  return savePremiumContractAction(input);
}

export async function getAiPriceRecommendationAction(input: {
  slotTypeSlug: string;
  venueId?: string | null;
}) {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;
  return { ok: true as const, recommendation: await recommendSponsorshipPrice(input) };
}

export async function expirePremiumSponsorshipAction(contractId: string): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data: contract } = await admin
    .from("premium_sponsorship_contracts")
    .select("venue_id, slot_type_slug, display_label")
    .eq("id", contractId)
    .maybeSingle();

  const { error } = await admin
    .from("premium_sponsorship_contracts")
    .update({ status: "expired", renewal_status: "expired" })
    .eq("id", contractId);

  if (error) return { ok: false, error: error.message };

  if (contract) {
    await notifyWaitingListOnExpiration({
      slotTypeSlug: contract.slot_type_slug as string,
      venueId: contract.venue_id as string | null,
      displayLabel: contract.display_label as string,
    });
  }

  revalidateSponsorshipPaths(contract?.venue_id as string | null);
  return { ok: true };
}

export async function cancelPremiumSponsorshipAction(contractId: string): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data: contract } = await admin
    .from("premium_sponsorship_contracts")
    .select("venue_id")
    .eq("id", contractId)
    .maybeSingle();

  const { error } = await admin
    .from("premium_sponsorship_contracts")
    .update({ status: "cancelled" })
    .eq("id", contractId);

  if (error) return { ok: false, error: error.message };

  revalidateSponsorshipPaths(contract?.venue_id as string | null);
  return { ok: true };
}

export async function reservePremiumSponsorshipAction(contractId: string): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data: contract } = await admin
    .from("premium_sponsorship_contracts")
    .select("venue_id")
    .eq("id", contractId)
    .maybeSingle();

  const { error } = await admin
    .from("premium_sponsorship_contracts")
    .update({ status: "reserved" })
    .eq("id", contractId);

  if (error) return { ok: false, error: error.message };
  revalidateSponsorshipPaths(contract?.venue_id as string | null);
  return { ok: true };
}

export async function activatePremiumSponsorshipAction(contractId: string): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data: contract } = await admin
    .from("premium_sponsorship_contracts")
    .select("venue_id")
    .eq("id", contractId)
    .maybeSingle();

  const { error } = await admin
    .from("premium_sponsorship_contracts")
    .update({ status: "active", renewal_status: "not_due" })
    .eq("id", contractId);

  if (error) return { ok: false, error: error.message };
  revalidateSponsorshipPaths(contract?.venue_id as string | null);
  return { ok: true };
}

export async function createSponsorshipSlotTypeAction(input: unknown): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const parsed = slotTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("sponsorship_slot_types").insert({
    slug: parsed.data.slug,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    scope: parsed.data.scope,
    list_price_cents: parsed.data.listPriceCents ?? null,
    tier: parsed.data.tier ?? 50,
    visibility: parsed.data.visibility ?? "public",
    display_location: parsed.data.displayLocation ?? null,
    requires_approval: parsed.data.requiresApproval ?? true,
    auction_enabled: parsed.data.auctionEnabled ?? false,
    sort_order: 99,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true, id: parsed.data.slug };
}

export async function createSponsorshipAuctionAction(input: unknown): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const parsed = auctionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sponsorship_auctions")
    .insert({
      slot_type_slug: parsed.data.slotTypeSlug,
      venue_id: parsed.data.venueId ?? null,
      display_label: parsed.data.displayLabel,
      description: parsed.data.description ?? null,
      starting_bid_cents: parsed.data.startingBidCents,
      reserve_price_cents: parsed.data.reservePriceCents ?? null,
      current_high_bid_cents: parsed.data.startingBidCents,
      opens_at: parsed.data.opensAt ?? new Date().toISOString(),
      closes_at: parsed.data.closesAt ?? null,
      status: "open",
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true, id: data?.id as string };
}

export async function closeSponsorshipAuctionAction(auctionId: string): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("sponsorship_auctions")
    .update({ status: "closed" })
    .eq("id", auctionId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true };
}

export async function respondToBidAction(input: {
  bidId: string;
  action: "accept" | "reject" | "counter";
  counterAmountCents?: number;
}): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data: bid } = await admin
    .from("sponsorship_auction_bids")
    .select("*, sponsorship_auctions(*)")
    .eq("id", input.bidId)
    .maybeSingle();

  if (!bid) return { ok: false, error: "Bid not found" };

  const auctionRaw = bid.sponsorship_auctions as Record<string, unknown> | Record<string, unknown>[] | null;
  const auction = Array.isArray(auctionRaw) ? auctionRaw[0] : auctionRaw;

  if (input.action === "accept") {
    await admin
      .from("sponsorship_auction_bids")
      .update({ status: "accepted" })
      .eq("id", input.bidId);

    await admin
      .from("sponsorship_auctions")
      .update({
        status: "awarded",
        current_high_bid_cents: bid.bid_amount_cents,
        awarded_bid_id: input.bidId,
      })
      .eq("id", bid.auction_id as string);

    if (auction) {
      await admin.from("premium_sponsorship_contracts").insert({
        slot_type_slug: auction.slot_type_slug,
        venue_id: auction.venue_id,
        organization_id: bid.organization_id,
        display_label: auction.display_label,
        contract_value_cents: bid.bid_amount_cents,
        status: "pending",
      });
    }
  } else if (input.action === "reject") {
    await admin.from("sponsorship_auction_bids").update({ status: "rejected" }).eq("id", input.bidId);
  } else if (input.action === "counter" && input.counterAmountCents) {
    await admin
      .from("sponsorship_auction_bids")
      .update({ status: "countered", counter_amount_cents: input.counterAmountCents })
      .eq("id", input.bidId);
  }

  revalidatePath("/admin/sponsorships");
  return { ok: true };
}

export async function listBusinessContractsAdmin(limit = 200) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("premium_sponsorship_contracts")
    .select(CONTRACT_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapBusinessContract(r as Record<string, unknown>));
}

export async function grantExclusivityAction(input: {
  contractId: string;
  organizationId: string;
  slotTypeSlug: string;
  scope: "city" | "state" | "genre" | "category" | "platform";
  scopeValue: string;
  startsAt?: string;
  endsAt?: string;
}): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("sponsorship_exclusivity_grants").insert({
    contract_id: input.contractId,
    organization_id: input.organizationId,
    slot_type_slug: input.slotTypeSlug,
    scope: input.scope,
    scope_value: input.scopeValue,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    is_active: true,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Exclusivity already granted for this scope." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/sponsorships");
  return { ok: true };
}

export async function removeFromWaitingListAction(entryId: string): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("sponsorship_waiting_list")
    .update({ status: "withdrawn" })
    .eq("id", entryId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true };
}

export async function convertWaitingListAction(input: {
  entryId: string;
  contractValueCents: number;
  contractLengthMonths: number;
  contractStartsAt: string;
}): Promise<SponsorshipAdminResult> {
  const ctx = await requireAdminCtx();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data: entry } = await admin
    .from("sponsorship_waiting_list")
    .select("*, sponsor_organizations(name, logo_url, website_url)")
    .eq("id", input.entryId)
    .maybeSingle();

  if (!entry) return { ok: false, error: "Waiting list entry not found" };

  const org = entry.sponsor_organizations as { name: string; logo_url: string | null; website_url: string | null } | { name: string; logo_url: string | null; website_url: string | null }[] | null;
  const orgData = Array.isArray(org) ? org[0] : org;

  const endsAt = computeContractEndDate(input.contractStartsAt, input.contractLengthMonths);

  const { data: contract, error } = await admin
    .from("premium_sponsorship_contracts")
    .insert({
      slot_type_slug: entry.slot_type_slug,
      venue_id: entry.venue_id,
      organization_id: entry.organization_id,
      display_label: orgData?.name ?? "Sponsor",
      logo_url: orgData?.logo_url ?? null,
      sponsor_website: orgData?.website_url ?? null,
      contract_value_cents: input.contractValueCents,
      contract_length_months: input.contractLengthMonths,
      contract_starts_at: input.contractStartsAt,
      contract_ends_at: endsAt,
      contact_name: entry.contact_name,
      contact_email: entry.contact_email,
      contact_phone: entry.contact_phone,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  await admin
    .from("sponsorship_waiting_list")
    .update({ status: "converted" })
    .eq("id", input.entryId);

  revalidateSponsorshipPaths(entry.venue_id as string | null);
  return { ok: true, id: contract?.id as string };
}
