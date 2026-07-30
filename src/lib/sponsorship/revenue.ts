import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { RENEWAL_REMINDER_DAYS } from "@/lib/sponsorship/constants";

export type SponsorshipRevenueSummary = {
  totalActiveValueCents: number;
  totalActiveContracts: number;
  revenueByVenue: { venueId: string; venueName: string; region: string; totalCents: number }[];
  revenueBySponsor: { organizationId: string; name: string; totalCents: number; contractCount: number }[];
  revenueByState: { stateCode: string; totalCents: number }[];
  topSponsors: { name: string; totalCents: number }[];
  expiringSoon: {
    id: string;
    displayLabel: string;
    slotName: string;
    endsAt: string;
    venueName: string | null;
  }[];
  unsoldPlatformSlots: number;
  unsoldVenueSlotEstimate: number;
};

export async function getSponsorshipRevenueSummary(): Promise<SponsorshipRevenueSummary> {
  const empty: SponsorshipRevenueSummary = {
    totalActiveValueCents: 0,
    totalActiveContracts: 0,
    revenueByVenue: [],
    revenueBySponsor: [],
    revenueByState: [],
    topSponsors: [],
    expiringSoon: [],
    unsoldPlatformSlots: 0,
    unsoldVenueSlotEstimate: 0,
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = getSupabaseAdmin();
  const { data: rows } = await admin
    .from("premium_sponsorship_contracts")
    .select(
      "id, display_label, contract_value_cents, contract_ends_at, status, organization_id, venue_id, slot_type_slug, sponsor_organizations(name), sponsorship_slot_types(name), venues(default_name, region, state_code)"
    )
    .in("status", ["active", "pending"]);

  const active = rows ?? [];
  const reminderDate = new Date();
  reminderDate.setDate(reminderDate.getDate() + RENEWAL_REMINDER_DAYS);

  const byVenue = new Map<string, { venueName: string; region: string; total: number }>();
  const byOrg = new Map<string, { name: string; total: number; count: number }>();
  const byState = new Map<string, number>();
  const expiring: SponsorshipRevenueSummary["expiringSoon"] = [];

  let totalCents = 0;

  for (const row of active) {
    const cents = (row.contract_value_cents as number) ?? 0;
    totalCents += cents;

    const venueRaw = row.venues as
      | { default_name: string; region: string; state_code: string | null }
      | { default_name: string; region: string; state_code: string | null }[]
      | null;
    const venue = Array.isArray(venueRaw) ? venueRaw[0] : venueRaw;
    const orgRaw = row.sponsor_organizations as { name: string } | { name: string }[] | null;
    const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
    const slotRaw = row.sponsorship_slot_types as { name: string } | { name: string }[] | null;
    const slot = Array.isArray(slotRaw) ? slotRaw[0] : slotRaw;

    if (row.venue_id && venue) {
      const key = row.venue_id as string;
      const cur = byVenue.get(key) ?? { venueName: venue.default_name, region: venue.region, total: 0 };
      cur.total += cents;
      byVenue.set(key, cur);
      if (venue.state_code) {
        byState.set(venue.state_code, (byState.get(venue.state_code) ?? 0) + cents);
      }
    }

    if (row.organization_id && org) {
      const key = row.organization_id as string;
      const cur = byOrg.get(key) ?? { name: org.name, total: 0, count: 0 };
      cur.total += cents;
      cur.count += 1;
      byOrg.set(key, cur);
    }

    const ends = row.contract_ends_at as string | null;
    if (ends && new Date(ends) <= reminderDate) {
      expiring.push({
        id: row.id as string,
        displayLabel: row.display_label as string,
        slotName: slot?.name ?? (row.slot_type_slug as string),
        endsAt: ends,
        venueName: venue?.default_name ?? null,
      });
    }
  }

  const { count: platformSlots } = await admin
    .from("sponsorship_slot_types")
    .select("slug", { count: "exact", head: true })
    .eq("scope", "platform")
    .eq("is_active", true);

  const { count: platformSold } = await admin
    .from("premium_sponsorship_contracts")
    .select("id", { count: "exact", head: true })
    .is("venue_id", null)
    .is("event_id", null)
    .is("tour_id", null)
    .in("status", ["active", "pending"]);

  const { count: venueCount } = await admin
    .from("venues")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: venueSlotTypes } = await admin
    .from("sponsorship_slot_types")
    .select("slug", { count: "exact", head: true })
    .eq("scope", "venue")
    .eq("is_active", true);

  const { count: venueSold } = await admin
    .from("premium_sponsorship_contracts")
    .select("id", { count: "exact", head: true })
    .not("venue_id", "is", null)
    .in("status", ["active", "pending"]);

  return {
    totalActiveValueCents: totalCents,
    totalActiveContracts: active.length,
    revenueByVenue: [...byVenue.entries()]
      .map(([venueId, v]) => ({ venueId, venueName: v.venueName, region: v.region, totalCents: v.total }))
      .sort((a, b) => b.totalCents - a.totalCents)
      .slice(0, 15),
    revenueBySponsor: [...byOrg.entries()]
      .map(([organizationId, v]) => ({
        organizationId,
        name: v.name,
        totalCents: v.total,
        contractCount: v.count,
      }))
      .sort((a, b) => b.totalCents - a.totalCents),
    revenueByState: [...byState.entries()]
      .map(([stateCode, totalCents]) => ({ stateCode, totalCents }))
      .sort((a, b) => b.totalCents - a.totalCents),
    topSponsors: [...byOrg.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((v) => ({ name: v.name, totalCents: v.total })),
    expiringSoon: expiring.sort((a, b) => a.endsAt.localeCompare(b.endsAt)),
    unsoldPlatformSlots: Math.max(0, (platformSlots ?? 0) - (platformSold ?? 0)),
    unsoldVenueSlotEstimate: Math.max(
      0,
      (venueCount ?? 0) * (venueSlotTypes ?? 0) - (venueSold ?? 0)
    ),
  };
}
