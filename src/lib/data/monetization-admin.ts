import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type {
  MonetizationAnalytics,
  MonetizationCoupon,
  MonetizationPricingHistoryRow,
  MonetizationScheduledPricing,
  MonetizationSnapshot,
} from "@/lib/monetization/types";
import { getMonetizationSnapshot } from "@/lib/monetization/pricing-resolver.server";

export async function getMonetizationAdminSnapshot(): Promise<MonetizationSnapshot> {
  return getMonetizationSnapshot();
}

export async function listMonetizationCoupons(supabase?: SupabaseClient): Promise<MonetizationCoupon[]> {
  const client = supabase ?? (await createClient());
  const { data } = await client.from("monetization_coupons").select("*").order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    code: r.code as string,
    name: (r.name as string) ?? null,
    discountType: r.discount_type as "percent" | "fixed",
    discountValue: Number(r.discount_value),
    appliesTo: r.applies_to as string,
    usageLimit: r.usage_limit != null ? Number(r.usage_limit) : null,
    usageCount: Number(r.usage_count ?? 0),
    expiresAt: (r.expires_at as string) ?? null,
    isActive: Boolean(r.is_active),
    visibility: r.visibility as MonetizationCoupon["visibility"],
    createdAt: r.created_at as string,
  }));
}

export async function listPricingHistory(limit = 50): Promise<MonetizationPricingHistoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monetization_pricing_history")
    .select("*, profiles:changed_by(display_name)")
    .order("changed_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => {
    const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id as string,
      category: r.category as string,
      entityKey: r.entity_key as string,
      fieldName: r.field_name as string,
      oldValue: r.old_value,
      newValue: r.new_value,
      reason: (r.reason as string) ?? null,
      changedBy: (r.changed_by as string) ?? null,
      changedAt: r.changed_at as string,
      rolledBack: Boolean(r.rolled_back),
      adminName: (profile as { display_name?: string } | null)?.display_name ?? null,
    };
  });
}

export async function listScheduledPricing(): Promise<MonetizationScheduledPricing[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("monetization_scheduled_pricing")
    .select("*")
    .eq("status", "scheduled")
    .order("effective_at");
  return (data ?? []).map((r) => ({
    id: r.id as string,
    category: r.category as string,
    entityKey: r.entity_key as string,
    changes: (r.changes as Record<string, unknown>) ?? {},
    effectiveAt: r.effective_at as string,
    status: r.status as string,
    createdAt: r.created_at as string,
  }));
}

export async function getMonetizationAnalytics(): Promise<MonetizationAnalytics> {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [ordersRes, bookingsRes] = await Promise.all([
    supabase.from("orders").select("total_cents, kind, created_at").gte("created_at", thirtyDaysAgo).eq("status", "paid"),
    supabase.from("agency_crm_bookings").select("id, status, venue_tier").gte("created_at", thirtyDaysAgo),
  ]);

  const orders = ordersRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const ticketOrders = orders.filter((o) => o.kind === "ticket" || o.kind === "tickets");
  const ticketTotal = ticketOrders.reduce((s, o) => s + ((o.total_cents as number) ?? 0), 0);
  const avgTicket = ticketOrders.length ? Math.round(ticketTotal / ticketOrders.length) : 0;

  const venueCounts = new Map<string, number>();
  for (const b of bookings) {
    const tier = (b.venue_tier as string) ?? "unknown";
    venueCounts.set(tier, (venueCounts.get(tier) ?? 0) + 1);
  }
  const mostBooked = [...venueCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const monthMap = new Map<string, number>();
  for (const o of orders) {
    const m = new Date(o.created_at as string).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    monthMap.set(m, (monthMap.get(m) ?? 0) + ((o.total_cents as number) ?? 0));
  }

  const cancelled = bookings.filter((b) => b.status === "cancelled").length;
  const totalBookings = bookings.length || 1;

  return {
    avgVenueRevenueCents: bookings.length ? Math.round(ticketTotal / Math.max(bookings.length, 1)) : 0,
    avgTicketRevenueCents: avgTicket,
    mostBookedVenue: mostBooked,
    revenueByVenue: [...venueCounts.entries()].map(([name, count]) => ({ name, cents: count * avgTicket })),
    revenueByMonth: [...monthMap.entries()].map(([month, cents]) => ({ month, cents })),
    avgTicketPriceCents: avgTicket,
    bookingConversionPercent: Math.round(((bookings.length - cancelled) / totalBookings) * 100),
    cancelledBookings: cancelled,
  };
}
