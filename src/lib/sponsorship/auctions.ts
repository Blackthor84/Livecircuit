import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { SponsorshipAuctionStatus, SponsorshipBidStatus } from "@/lib/sponsorship/constants";

export type SponsorshipAuction = {
  id: string;
  slotTypeSlug: string;
  slotName: string;
  venueId: string | null;
  venueName: string | null;
  displayLabel: string;
  description: string | null;
  status: SponsorshipAuctionStatus;
  startingBidCents: number;
  reservePriceCents: number | null;
  currentHighBidCents: number;
  opensAt: string | null;
  closesAt: string | null;
  bidCount: number;
};

export type SponsorshipBid = {
  id: string;
  auctionId: string;
  organizationId: string;
  organizationName: string;
  bidAmountCents: number;
  counterAmountCents: number | null;
  status: SponsorshipBidStatus;
  notes: string | null;
  createdAt: string;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listOpenAuctions(limit = 50) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_auctions")
    .select("*, sponsorship_slot_types(name), venues(default_name)")
    .in("status", ["open", "closed"])
    .order("closes_at", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => {
    const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
    const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);
    return {
      id: row.id as string,
      slotTypeSlug: row.slot_type_slug as string,
      slotName: slot?.name ?? "",
      venueId: (row.venue_id as string) ?? null,
      venueName: venue?.default_name ?? null,
      displayLabel: row.display_label as string,
      description: (row.description as string) ?? null,
      status: row.status as SponsorshipAuctionStatus,
      startingBidCents: row.starting_bid_cents as number,
      reservePriceCents: (row.reserve_price_cents as number) ?? null,
      currentHighBidCents: row.current_high_bid_cents as number,
      opensAt: (row.opens_at as string) ?? null,
      closesAt: (row.closes_at as string) ?? null,
      bidCount: 0,
    } satisfies SponsorshipAuction;
  });
}

export async function listAllAuctions(limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_auctions")
    .select("*, sponsorship_slot_types(name), venues(default_name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  const auctions = (data ?? []).map((row) => {
    const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
    const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);
    return {
      id: row.id as string,
      slotTypeSlug: row.slot_type_slug as string,
      slotName: slot?.name ?? "",
      venueId: (row.venue_id as string) ?? null,
      venueName: venue?.default_name ?? null,
      displayLabel: row.display_label as string,
      description: (row.description as string) ?? null,
      status: row.status as SponsorshipAuctionStatus,
      startingBidCents: row.starting_bid_cents as number,
      reservePriceCents: (row.reserve_price_cents as number) ?? null,
      currentHighBidCents: row.current_high_bid_cents as number,
      opensAt: (row.opens_at as string) ?? null,
      closesAt: (row.closes_at as string) ?? null,
      bidCount: 0,
    } satisfies SponsorshipAuction;
  });

  if (auctions.length) {
    const admin2 = getSupabaseAdmin();
    const { data: bidCounts } = await admin2
      .from("sponsorship_auction_bids")
      .select("auction_id")
      .in(
        "auction_id",
        auctions.map((a) => a.id)
      );
    const counts = new Map<string, number>();
    for (const b of bidCounts ?? []) {
      const id = b.auction_id as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return auctions.map((a) => ({ ...a, bidCount: counts.get(a.id) ?? 0 }));
  }

  return auctions;
}

export async function listAuctionBids(auctionId: string) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_auction_bids")
    .select("*, sponsor_organizations(name)")
    .eq("auction_id", auctionId)
    .order("bid_amount_cents", { ascending: false });

  return (data ?? []).map((row) => {
    const org = unwrapJoin(row.sponsor_organizations as { name: string } | { name: string }[] | null);
    return {
      id: row.id as string,
      auctionId: row.auction_id as string,
      organizationId: row.organization_id as string,
      organizationName: org?.name ?? "",
      bidAmountCents: row.bid_amount_cents as number,
      counterAmountCents: (row.counter_amount_cents as number) ?? null,
      status: row.status as SponsorshipBidStatus,
      notes: (row.notes as string) ?? null,
      createdAt: row.created_at as string,
    } satisfies SponsorshipBid;
  });
}
