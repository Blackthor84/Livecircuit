import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";

export type PriceHistoryEntry = {
  id: string;
  contractId: string | null;
  slotTypeSlug: string;
  slotName: string;
  venueId: string | null;
  venueName: string | null;
  organizationId: string | null;
  sponsorName: string;
  contractLengthMonths: number | null;
  contractValueCents: number;
  renewed: boolean;
  expirationDate: string | null;
  lifetimeRevenueCents: number;
  recordedAt: string;
};

function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function listPriceHistory(limit = 100) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_price_history")
    .select("*, sponsorship_slot_types(name), venues(default_name)")
    .order("recorded_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
    const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);
    return {
      id: row.id as string,
      contractId: (row.contract_id as string) ?? null,
      slotTypeSlug: row.slot_type_slug as string,
      slotName: slot?.name ?? "",
      venueId: (row.venue_id as string) ?? null,
      venueName: venue?.default_name ?? null,
      organizationId: (row.organization_id as string) ?? null,
      sponsorName: row.sponsor_name as string,
      contractLengthMonths: (row.contract_length_months as number) ?? null,
      contractValueCents: row.contract_value_cents as number,
      renewed: Boolean(row.renewed),
      expirationDate: (row.expiration_date as string) ?? null,
      lifetimeRevenueCents: row.lifetime_revenue_cents as number,
      recordedAt: row.recorded_at as string,
    } satisfies PriceHistoryEntry;
  });
}

export async function listPriceHistoryForVenue(venueId: string) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_price_history")
    .select("*, sponsorship_slot_types(name), venues(default_name)")
    .eq("venue_id", venueId)
    .order("recorded_at", { ascending: false });

  return (data ?? []).map((row) => {
    const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
    const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);
    return {
      id: row.id as string,
      contractId: (row.contract_id as string) ?? null,
      slotTypeSlug: row.slot_type_slug as string,
      slotName: slot?.name ?? "",
      venueId: (row.venue_id as string) ?? null,
      venueName: venue?.default_name ?? null,
      organizationId: (row.organization_id as string) ?? null,
      sponsorName: row.sponsor_name as string,
      contractLengthMonths: (row.contract_length_months as number) ?? null,
      contractValueCents: row.contract_value_cents as number,
      renewed: Boolean(row.renewed),
      expirationDate: (row.expiration_date as string) ?? null,
      lifetimeRevenueCents: row.lifetime_revenue_cents as number,
      recordedAt: row.recorded_at as string,
    } satisfies PriceHistoryEntry;
  });
}

export async function listPriceHistoryForOrg(organizationId: string) {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsorship_price_history")
    .select("*, sponsorship_slot_types(name), venues(default_name)")
    .eq("organization_id", organizationId)
    .order("recorded_at", { ascending: false });

  return (data ?? []).map((row) => {
    const slot = unwrapJoin(row.sponsorship_slot_types as { name: string } | { name: string }[] | null);
    const venue = unwrapJoin(row.venues as { default_name: string } | { default_name: string }[] | null);
    return {
      id: row.id as string,
      contractId: (row.contract_id as string) ?? null,
      slotTypeSlug: row.slot_type_slug as string,
      slotName: slot?.name ?? "",
      venueId: (row.venue_id as string) ?? null,
      venueName: venue?.default_name ?? null,
      organizationId: (row.organization_id as string) ?? null,
      sponsorName: row.sponsor_name as string,
      contractLengthMonths: (row.contract_length_months as number) ?? null,
      contractValueCents: row.contract_value_cents as number,
      renewed: Boolean(row.renewed),
      expirationDate: (row.expiration_date as string) ?? null,
      lifetimeRevenueCents: row.lifetime_revenue_cents as number,
      recordedAt: row.recorded_at as string,
    } satisfies PriceHistoryEntry;
  });
}

export async function getLargestSaleEver() {
  const history = await listPriceHistory(500);
  if (!history.length) return null;
  return history.reduce((max, h) => (h.contractValueCents > max.contractValueCents ? h : max));
}
