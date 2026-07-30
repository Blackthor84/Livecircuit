import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { listSponsorshipSlotTypes, getVenueSponsorshipInventory } from "@/lib/sponsorship/inventory";
import { countWaitingListForSlot } from "@/lib/sponsorship/waiting-list";
import { listOpenAuctions } from "@/lib/sponsorship/auctions";
import { recommendSponsorshipPrice } from "@/lib/sponsorship/pricing-recommendations";
import type { SponsorshipInventoryStatus } from "@/lib/sponsorship/constants";

export type MarketplaceListing = {
  slotTypeSlug: string;
  slotName: string;
  description: string | null;
  scope: string;
  venueId: string | null;
  venueName: string | null;
  venueSlug: string | null;
  city: string | null;
  stateCode: string | null;
  capacity: number | null;
  listPriceCents: number | null;
  recommendedPriceCents: number | null;
  inventoryStatus: SponsorshipInventoryStatus;
  waitingListCount: number;
  tier: number;
  auctionEnabled: boolean;
};

export type MarketplaceFilters = {
  stateCode?: string;
  city?: string;
  venueId?: string;
  slotTypeSlug?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  scope?: string;
  status?: SponsorshipInventoryStatus;
};

async function getInventoryStatus(
  slotSlug: string,
  venueId: string | null,
  hasActiveContract: boolean,
  hasReserved: boolean,
  waitlistCount: number
): Promise<SponsorshipInventoryStatus> {
  if (hasActiveContract) return "sold";
  if (hasReserved) return "reserved";
  if (waitlistCount > 0) return "waiting_list";
  return "available";
}

export async function browseSponsorshipMarketplace(
  filters: MarketplaceFilters = {}
): Promise<MarketplaceListing[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const admin = getSupabaseAdmin();
  const slots = await listSponsorshipSlotTypes();
  const auctions = await listOpenAuctions();
  const auctionVenueIds = new Set(auctions.map((a) => `${a.slotTypeSlug}:${a.venueId ?? ""}`));

  let venueQuery = supabase
    .from("venues")
    .select("id, slug, default_name, region, state_code, capacity, popularity_score, is_active")
    .eq("is_active", true)
    .order("popularity_score", { ascending: false });

  if (filters.stateCode) venueQuery = venueQuery.eq("state_code", filters.stateCode);
  if (filters.city) venueQuery = venueQuery.ilike("region", `%${filters.city}%`);
  if (filters.venueId) venueQuery = venueQuery.eq("id", filters.venueId);

  const { data: venues } = await venueQuery.limit(100);

  const { data: platformContracts } = await admin
    .from("premium_sponsorship_contracts")
    .select("slot_type_slug, status")
    .is("venue_id", null)
    .in("status", ["active", "pending", "reserved"]);

  const platformTaken = new Set(
    (platformContracts ?? []).map((c) => c.slot_type_slug as string)
  );

  const listings: MarketplaceListing[] = [];

  for (const slot of slots) {
    if (filters.slotTypeSlug && slot.slug !== filters.slotTypeSlug) continue;
    if (filters.scope && slot.scope !== filters.scope) continue;

    if (slot.scope === "platform") {
      const waitlist = await countWaitingListForSlot(slot.slug, null);
      const status = platformTaken.has(slot.slug)
        ? "sold"
        : waitlist > 0
          ? "waiting_list"
          : "available";
      if (filters.status && filters.status !== status) continue;

      const rec = await recommendSponsorshipPrice({
        slotTypeSlug: slot.slug,
        listPriceCents: slot.listPriceCents,
      });

      const price = rec.recommendedPriceCents;
      if (filters.minPriceCents && price < filters.minPriceCents) continue;
      if (filters.maxPriceCents && price > filters.maxPriceCents) continue;

      listings.push({
        slotTypeSlug: slot.slug,
        slotName: slot.name,
        description: slot.description,
        scope: slot.scope,
        venueId: null,
        venueName: null,
        venueSlug: null,
        city: null,
        stateCode: null,
        capacity: null,
        listPriceCents: slot.listPriceCents,
        recommendedPriceCents: rec.recommendedPriceCents,
        inventoryStatus: status,
        waitingListCount: waitlist,
        tier: slot.tier,
        auctionEnabled: slot.slug.includes("naming") || slot.scope === "platform",
      });
      continue;
    }

    if (slot.scope !== "venue") continue;

    for (const venue of venues ?? []) {
      const inventory = await getVenueSponsorshipInventory(venue.id as string);
      const row = inventory.find((i) => i.slot.slug === slot.slug);
      if (!row) continue;

      const waitlist = await countWaitingListForSlot(slot.slug, venue.id as string);
      const hasActive = row.contract?.status === "active" || row.contract?.status === "pending";
      const hasReserved = row.contract?.status === "reserved";
      const status = await getInventoryStatus(slot.slug, venue.id as string, hasActive, hasReserved, waitlist);

      if (filters.status && filters.status !== status) continue;

      const rec = await recommendSponsorshipPrice({
        slotTypeSlug: slot.slug,
        venueId: venue.id as string,
        listPriceCents: slot.listPriceCents,
      });

      const price = rec.recommendedPriceCents;
      if (filters.minPriceCents && price < filters.minPriceCents) continue;
      if (filters.maxPriceCents && price > filters.maxPriceCents) continue;

      listings.push({
        slotTypeSlug: slot.slug,
        slotName: slot.name,
        description: slot.description,
        scope: slot.scope,
        venueId: venue.id as string,
        venueName: venue.default_name as string,
        venueSlug: venue.slug as string,
        city: venue.region as string,
        stateCode: (venue.state_code as string) ?? null,
        capacity: venue.capacity as number,
        listPriceCents: slot.listPriceCents,
        recommendedPriceCents: rec.recommendedPriceCents,
        inventoryStatus: status,
        waitingListCount: waitlist,
        tier: slot.tier,
        auctionEnabled:
          auctionVenueIds.has(`${slot.slug}:${venue.id}`) || slot.slug === "arena_naming_rights",
      });
    }
  }

  return listings.sort((a, b) => b.tier - a.tier || b.recommendedPriceCents! - a.recommendedPriceCents!);
}

export async function listMarketplaceStates() {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("venues")
    .select("state_code")
    .eq("is_active", true)
    .not("state_code", "is", null);
  const states = new Set((data ?? []).map((v) => v.state_code as string));
  return [...states].sort();
}
