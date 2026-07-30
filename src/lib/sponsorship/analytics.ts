import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSponsorshipRevenueSummary } from "@/lib/sponsorship/revenue";
import { getLargestSaleEver } from "@/lib/sponsorship/price-history";
import { listAllWaitingList } from "@/lib/sponsorship/waiting-list";
import { listSponsorshipSlotTypes } from "@/lib/sponsorship/inventory";

export type SponsorshipAnalyticsDashboard = {
  todayRevenueCents: number;
  monthlyRevenueCents: number;
  annualRevenueCents: number;
  lifetimeRevenueCents: number;
  averageContractValueCents: number;
  largestSaleCents: number | null;
  largestSaleSponsor: string | null;
  renewalRatePercent: number;
  occupancyRatePercent: number;
  projectedAnnualRevenueCents: number;
  unsoldPlatformSlots: number;
  unsoldVenueSlotEstimate: number;
  waitingListCount: number;
  revenueByState: { stateCode: string; totalCents: number }[];
  revenueByVenue: { venueId: string; venueName: string; totalCents: number }[];
  revenueBySponsor: { name: string; totalCents: number }[];
  upcomingRenewals: {
    id: string;
    displayLabel: string;
    endsAt: string;
    autoRenew: boolean;
  }[];
  expiringContracts: {
    id: string;
    displayLabel: string;
    endsAt: string;
    venueName: string | null;
  }[];
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function getSponsorshipAnalyticsDashboard(): Promise<SponsorshipAnalyticsDashboard> {
  const empty: SponsorshipAnalyticsDashboard = {
    todayRevenueCents: 0,
    monthlyRevenueCents: 0,
    annualRevenueCents: 0,
    lifetimeRevenueCents: 0,
    averageContractValueCents: 0,
    largestSaleCents: null,
    largestSaleSponsor: null,
    renewalRatePercent: 0,
    occupancyRatePercent: 0,
    projectedAnnualRevenueCents: 0,
    unsoldPlatformSlots: 0,
    unsoldVenueSlotEstimate: 0,
    waitingListCount: 0,
    revenueByState: [],
    revenueByVenue: [],
    revenueBySponsor: [],
    upcomingRenewals: [],
    expiringContracts: [],
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = getSupabaseAdmin();
  const now = new Date();
  const today = startOfDay(now).toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);

  const [summary, largest, waitingList, slots, allContracts] = await Promise.all([
    getSponsorshipRevenueSummary(),
    getLargestSaleEver(),
    listAllWaitingList(500),
    listSponsorshipSlotTypes(),
    admin
      .from("premium_sponsorship_contracts")
      .select(
        "id, display_label, contract_value_cents, contract_starts_at, contract_ends_at, auto_renew, status, renewed_from_id, contract_length_months"
      )
      .order("created_at", { ascending: false }),
  ]);

  const contracts = allContracts.data ?? [];

  let todayRevenue = 0;
  let monthlyRevenue = 0;
  let annualRevenue = 0;
  let lifetimeRevenue = 0;
  let renewedCount = 0;
  let expiredCount = 0;

  for (const c of contracts) {
    const cents = (c.contract_value_cents as number) ?? 0;
    const starts = c.contract_starts_at as string | null;
    lifetimeRevenue += cents;
    if (starts && starts >= today) todayRevenue += cents;
    if (starts && starts >= monthStart) monthlyRevenue += cents;
    if (starts && starts >= yearStart) annualRevenue += cents;
    if (c.renewed_from_id) renewedCount += 1;
    if (c.status === "expired") expiredCount += 1;
  }

  const activeCount = contracts.filter((c) =>
    ["active", "pending", "reserved"].includes(c.status as string)
  ).length;

  const venueSlotTypes = slots.filter((s) => s.scope === "venue").length;
  const platformSlotTypes = slots.filter((s) => s.scope === "platform").length;
  const { count: venueCount } = await admin
    .from("venues")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const totalInventory = (venueCount ?? 0) * venueSlotTypes + platformSlotTypes;
  const occupancyRate =
    totalInventory > 0 ? Math.round((activeCount / totalInventory) * 100) : 0;

  const renewalDenominator = renewedCount + expiredCount;
  const renewalRate =
    renewalDenominator > 0 ? Math.round((renewedCount / renewalDenominator) * 100) : 0;

  const avgValue =
    activeCount > 0 ? Math.round(summary.totalActiveValueCents / activeCount) : 0;

  const projectedAnnual = Math.round(
    summary.totalActiveValueCents *
      (12 / Math.max(1, contracts.filter((c) => c.contract_length_months).length ? 12 : 12))
  );

  const upcomingRenewals = contracts
    .filter(
      (c) =>
        c.status === "active" &&
        c.contract_ends_at &&
        c.auto_renew &&
        new Date(c.contract_ends_at as string) > now
    )
    .slice(0, 10)
    .map((c) => ({
      id: c.id as string,
      displayLabel: c.display_label as string,
      endsAt: c.contract_ends_at as string,
      autoRenew: Boolean(c.auto_renew),
    }));

  return {
    todayRevenueCents: todayRevenue,
    monthlyRevenueCents: monthlyRevenue,
    annualRevenueCents: annualRevenue,
    lifetimeRevenueCents: lifetimeRevenue,
    averageContractValueCents: avgValue,
    largestSaleCents: largest?.contractValueCents ?? null,
    largestSaleSponsor: largest?.sponsorName ?? null,
    renewalRatePercent: renewalRate,
    occupancyRatePercent: occupancyRate,
    projectedAnnualRevenueCents: projectedAnnual,
    unsoldPlatformSlots: summary.unsoldPlatformSlots,
    unsoldVenueSlotEstimate: summary.unsoldVenueSlotEstimate,
    waitingListCount: waitingList.length,
    revenueByState: summary.revenueByState,
    revenueByVenue: summary.revenueByVenue.map((v) => ({
      venueId: v.venueId,
      venueName: v.venueName,
      totalCents: v.totalCents,
    })),
    revenueBySponsor: summary.topSponsors,
    upcomingRenewals,
    expiringContracts: summary.expiringSoon.map((e) => ({
      id: e.id,
      displayLabel: e.displayLabel,
      endsAt: e.endsAt,
      venueName: e.venueName,
    })),
  };
}
