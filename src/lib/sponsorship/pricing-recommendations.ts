import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { listPriceHistoryForVenue } from "@/lib/sponsorship/price-history";
import { countWaitingListForSlot } from "@/lib/sponsorship/waiting-list";

export type AiPriceRecommendation = {
  recommendedPriceCents: number;
  confidence: "low" | "medium" | "high";
  factors: { label: string; impact: string; weight: number }[];
  explanation: string;
};

type VenueSignals = {
  id: string;
  default_name: string;
  capacity: number;
  popularity_score: number;
  follower_count: number;
  region: string;
  state_code: string | null;
};

/** Heuristic pricing engine — admin can accept or override. */
export async function recommendSponsorshipPrice(input: {
  slotTypeSlug: string;
  venueId?: string | null;
  listPriceCents?: number | null;
}): Promise<AiPriceRecommendation> {
  const factors: AiPriceRecommendation["factors"] = [];
  let baseCents = input.listPriceCents ?? 500_000;

  if (!isSupabaseConfigured()) {
    return {
      recommendedPriceCents: baseCents,
      confidence: "low",
      factors: [{ label: "List price", impact: "baseline", weight: 1 }],
      explanation: "Using catalog list price (database unavailable).",
    };
  }

  const admin = getSupabaseAdmin();

  const { data: slot } = await admin
    .from("sponsorship_slot_types")
    .select("list_price_cents, tier, name")
    .eq("slug", input.slotTypeSlug)
    .maybeSingle();

  if (slot?.list_price_cents) {
    baseCents = slot.list_price_cents as number;
    factors.push({ label: "Catalog list price", impact: `$${(baseCents / 100).toLocaleString()}`, weight: 0.25 });
  }

  const tier = (slot?.tier as number) ?? 50;
  const tierMultiplier = 1 + tier / 200;
  baseCents = Math.round(baseCents * tierMultiplier);
  factors.push({ label: "Slot tier premium", impact: `×${tierMultiplier.toFixed(2)}`, weight: 0.15 });

  if (input.venueId) {
    const { data: venue } = await admin
      .from("venues")
      .select("id, default_name, capacity, popularity_score, follower_count, region, state_code")
      .eq("id", input.venueId)
      .maybeSingle();

    if (venue) {
      const v = venue as VenueSignals;
      const popMultiplier = 1 + Math.min(v.popularity_score ?? 0, 100) / 100;
      baseCents = Math.round(baseCents * popMultiplier);
      factors.push({
        label: "Arena popularity",
        impact: `score ${v.popularity_score ?? 0}`,
        weight: 0.2,
      });

      const capMultiplier = 1 + Math.log10(Math.max(v.capacity, 100)) / 10;
      baseCents = Math.round(baseCents * capMultiplier);
      factors.push({ label: "Capacity", impact: `${v.capacity.toLocaleString()} seats`, weight: 0.1 });

      const history = await listPriceHistoryForVenue(v.id);
      if (history.length) {
        const avgHistorical = Math.round(
          history.reduce((s, h) => s + h.contractValueCents, 0) / history.length
        );
        baseCents = Math.round((baseCents + avgHistorical) / 2);
        factors.push({
          label: "Previous sales",
          impact: `avg $${(avgHistorical / 100).toLocaleString()}`,
          weight: 0.2,
        });
      }

      const waitlist = await countWaitingListForSlot(input.slotTypeSlug, v.id);
      if (waitlist > 0) {
        const demandMultiplier = 1 + Math.min(waitlist, 5) * 0.05;
        baseCents = Math.round(baseCents * demandMultiplier);
        factors.push({
          label: "Demand (waiting list)",
          impact: `${waitlist} companies waiting`,
          weight: 0.15,
        });
      }

      if (v.state_code) {
        const statePopFactor = v.state_code === "CA" || v.state_code === "NY" || v.state_code === "TX" ? 1.15 : 1;
        if (statePopFactor > 1) {
          baseCents = Math.round(baseCents * statePopFactor);
          factors.push({ label: "State population tier", impact: v.state_code, weight: 0.1 });
        }
      }
    }
  }

  const confidence: AiPriceRecommendation["confidence"] =
    factors.length >= 4 ? "high" : factors.length >= 2 ? "medium" : "low";

  return {
    recommendedPriceCents: Math.max(baseCents, 50_000),
    confidence,
    factors,
    explanation: `Recommended price for ${slot?.name ?? input.slotTypeSlug} based on ${factors.length} market signals. Admin may accept or override.`,
  };
}
