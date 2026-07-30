import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { listSponsorshipSlotTypes } from "@/lib/sponsorship/inventory";

export type StateSponsorStats = {
  stateCode: string;
  stateName: string;
  arenaCount: number;
  soldSponsorships: number;
  availableSponsorships: number;
  revenueCents: number;
  occupancyPercent: number;
  venues: {
    id: string;
    slug: string;
    name: string;
    soldSlots: number;
    totalSlots: number;
    revenueCents: number;
  }[];
};

export async function getLiveSponsorMapData(): Promise<StateSponsorStats[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = getSupabaseAdmin();
  const [venues, contracts, slots] = await Promise.all([
    admin.from("venues").select("id, slug, default_name, state_code, region").eq("is_active", true),
    admin
      .from("premium_sponsorship_contracts")
      .select("venue_id, contract_value_cents, status")
      .in("status", ["active", "pending", "reserved"]),
    listSponsorshipSlotTypes("venue"),
  ]);

  const venueSlotsPerVenue = slots.length;
  const byState = new Map<string, StateSponsorStats>();

  for (const v of venues.data ?? []) {
    const code = (v.state_code as string) ?? "—";
    if (code === "—") continue;

    const cur = byState.get(code) ?? {
      stateCode: code,
      stateName: code,
      arenaCount: 0,
      soldSponsorships: 0,
      availableSponsorships: 0,
      revenueCents: 0,
      occupancyPercent: 0,
      venues: [],
    };

    const venueContracts = (contracts.data ?? []).filter((c) => c.venue_id === v.id);
    const sold = venueContracts.length;
    const revenue = venueContracts.reduce((s, c) => s + ((c.contract_value_cents as number) ?? 0), 0);

    cur.arenaCount += 1;
    cur.soldSponsorships += sold;
    cur.availableSponsorships += Math.max(0, venueSlotsPerVenue - sold);
    cur.revenueCents += revenue;
    cur.venues.push({
      id: v.id as string,
      slug: v.slug as string,
      name: v.default_name as string,
      soldSlots: sold,
      totalSlots: venueSlotsPerVenue,
      revenueCents: revenue,
    });

    byState.set(code, cur);
  }

  return [...byState.values()]
    .map((s) => ({
      ...s,
      occupancyPercent:
        s.soldSponsorships + s.availableSponsorships > 0
          ? Math.round((s.soldSponsorships / (s.soldSponsorships + s.availableSponsorships)) * 100)
          : 0,
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents);
}

export async function getStateSponsorDetail(stateCode: string) {
  const all = await getLiveSponsorMapData();
  return all.find((s) => s.stateCode === stateCode) ?? null;
}
