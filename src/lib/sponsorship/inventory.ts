import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { SponsorshipContractStatus, SponsorshipSlotScope } from "@/lib/sponsorship/constants";

export type SponsorshipSlotType = {
  slug: string;
  name: string;
  description: string | null;
  scope: SponsorshipSlotScope;
  maxPerEntity: number;
  tier: number;
  listPriceCents: number | null;
  sortOrder: number;
};

export type PremiumSponsorshipContract = {
  id: string;
  slotTypeSlug: string;
  slotName: string;
  organizationId: string | null;
  organizationName: string | null;
  venueId: string | null;
  eventId: string | null;
  tourId: string | null;
  featuredStageId: string | null;
  displayLabel: string;
  logoUrl: string | null;
  contractValueCents: number;
  contractStartsAt: string | null;
  contractEndsAt: string | null;
  status: SponsorshipContractStatus;
  renewalReminderAt: string | null;
};

export type VenueInventoryRow = {
  slot: SponsorshipSlotType;
  contract: PremiumSponsorshipContract | null;
  available: boolean;
};

function mapSlot(row: Record<string, unknown>): SponsorshipSlotType {
  return {
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    scope: row.scope as SponsorshipSlotScope,
    maxPerEntity: row.max_per_entity as number,
    tier: row.tier as number,
    listPriceCents: (row.list_price_cents as number) ?? null,
    sortOrder: row.sort_order as number,
  };
}

function mapContract(row: Record<string, unknown>): PremiumSponsorshipContract {
  const org = row.sponsor_organizations as { name: string } | { name: string }[] | null;
  const slot = row.sponsorship_slot_types as { name: string } | { name: string }[] | null;
  return {
    id: row.id as string,
    slotTypeSlug: row.slot_type_slug as string,
    slotName: Array.isArray(slot) ? slot[0]?.name ?? "" : slot?.name ?? "",
    organizationId: (row.organization_id as string) ?? null,
    organizationName: Array.isArray(org) ? org[0]?.name ?? null : org?.name ?? null,
    venueId: (row.venue_id as string) ?? null,
    eventId: (row.event_id as string) ?? null,
    tourId: (row.tour_id as string) ?? null,
    featuredStageId: (row.featured_stage_id as string) ?? null,
    displayLabel: row.display_label as string,
    logoUrl: (row.logo_url as string) ?? null,
    contractValueCents: (row.contract_value_cents as number) ?? 0,
    contractStartsAt: (row.contract_starts_at as string) ?? null,
    contractEndsAt: (row.contract_ends_at as string) ?? null,
    status: row.status as SponsorshipContractStatus,
    renewalReminderAt: (row.renewal_reminder_at as string) ?? null,
  };
}

export async function listSponsorshipSlotTypes(scope?: SponsorshipSlotScope) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  let q = admin.from("sponsorship_slot_types").select("*").eq("is_active", true).order("sort_order");
  if (scope) q = q.eq("scope", scope);
  const { data } = await q;
  return (data ?? []).map((r) => mapSlot(r as Record<string, unknown>));
}

export async function getVenueSponsorshipInventory(venueId: string): Promise<VenueInventoryRow[]> {
  const slots = await listSponsorshipSlotTypes("venue");
  if (!isSupabaseConfigured()) {
    return slots.map((slot) => ({ slot, contract: null, available: true }));
  }

  const admin = getSupabaseAdmin();
  const { data: contracts } = await admin
    .from("premium_sponsorship_contracts")
    .select("*, sponsor_organizations(name), sponsorship_slot_types(name)")
    .eq("venue_id", venueId)
    .in("status", ["active", "pending"]);

  const bySlot = new Map(
    (contracts ?? []).map((c) => [(c as { slot_type_slug: string }).slot_type_slug, mapContract(c as Record<string, unknown>)])
  );

  return slots.map((slot) => {
    const contract = bySlot.get(slot.slug) ?? null;
    return { slot, contract, available: !contract };
  });
}

export async function getEventSponsor(slotTypeSlug: string, eventId: string) {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("premium_sponsorship_contracts")
    .select("display_label, logo_url, sponsor_organizations(name, logo_url)")
    .eq("event_id", eventId)
    .eq("slot_type_slug", slotTypeSlug)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const orgRaw = data.sponsor_organizations as
    | { name: string; logo_url: string | null }
    | { name: string; logo_url: string | null }[]
    | null;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  return {
    label: data.display_label as string,
    logoUrl: (data.logo_url as string) ?? org?.logo_url ?? null,
    company: org?.name ?? null,
  };
}

export async function getTourSponsor(tourId: string) {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("premium_sponsorship_contracts")
    .select("display_label, logo_url, sponsor_organizations(name, logo_url)")
    .eq("tour_id", tourId)
    .eq("slot_type_slug", "tour_sponsor")
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  const orgRaw = data.sponsor_organizations as
    | { name: string; logo_url: string | null }
    | { name: string; logo_url: string | null }[]
    | null;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  return {
    label: data.display_label as string,
    logoUrl: (data.logo_url as string) ?? org?.logo_url ?? null,
  };
}

export async function listAllPremiumContracts(limit = 200) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("premium_sponsorship_contracts")
    .select(
      "*, sponsor_organizations(name), sponsorship_slot_types(name), venues(slug, default_name, region, state_code)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapContract(r as Record<string, unknown>));
}

export async function listFeaturedStages() {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("featured_stages")
    .select("*")
    .eq("is_active", true)
    .order("homepage_priority", { ascending: false });
  return data ?? [];
}

export async function listPlatformSponsors() {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("premium_sponsorship_contracts")
    .select("*, sponsor_organizations(name, logo_url, website_url), sponsorship_slot_types(name)")
    .is("venue_id", null)
    .is("event_id", null)
    .is("tour_id", null)
    .is("featured_stage_id", null)
    .eq("status", "active");
  return (data ?? []).map((r) => mapContract(r as Record<string, unknown>));
}

export async function getUnsoldInventorySummary() {
  const slots = await listSponsorshipSlotTypes();
  const contracts = await listAllPremiumContracts(500);
  const active = contracts.filter((c) => c.status === "active" || c.status === "pending");

  const venueIds = new Set(active.filter((c) => c.venueId).map((c) => `${c.venueId}:${c.slotTypeSlug}`));
  const platformTaken = new Set(active.filter((c) => !c.venueId && !c.eventId && !c.tourId).map((c) => c.slotTypeSlug));

  let unsoldVenueSlots = 0;
  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    const { count } = await admin.from("venues").select("id", { count: "exact", head: true }).eq("is_active", true);
    const venueCount = count ?? 0;
    const venueSlots = slots.filter((s) => s.scope === "venue");
    unsoldVenueSlots = venueCount * venueSlots.length - venueIds.size;
  }

  const unsoldPlatform = slots.filter((s) => s.scope === "platform" && !platformTaken.has(s.slug)).length;

  return { unsoldVenueSlots: Math.max(0, unsoldVenueSlots), unsoldPlatform, totalActiveContracts: active.length };
}
