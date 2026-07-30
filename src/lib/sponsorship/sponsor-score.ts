import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isFoundingPartner } from "@/lib/sponsorship/founding-partners";

export type SponsorScore = {
  organizationId: string;
  score: number;
  yearsOnPlatform: number;
  renewalRatePercent: number;
  totalSpentCents: number;
  sponsorshipCount: number;
  paymentScore: number;
  communityRating: number | null;
  responseTimeHours: number | null;
  longTermBonus: number;
  breakdown: Record<string, number>;
};

export async function computeSponsorScore(organizationId: string): Promise<SponsorScore> {
  const empty: SponsorScore = {
    organizationId,
    score: 0,
    yearsOnPlatform: 0,
    renewalRatePercent: 0,
    totalSpentCents: 0,
    sponsorshipCount: 0,
    paymentScore: 100,
    communityRating: null,
    responseTimeHours: null,
    longTermBonus: 0,
    breakdown: {},
  };

  if (!isSupabaseConfigured()) return empty;

  const admin = getSupabaseAdmin();

  const { data: org } = await admin
    .from("sponsor_organizations")
    .select("created_at")
    .eq("id", organizationId)
    .maybeSingle();

  const { data: contracts } = await admin
    .from("premium_sponsorship_contracts")
    .select("contract_value_cents, status, renewed_from_id, created_at, auto_renew")
    .eq("organization_id", organizationId);

  const rows = contracts ?? [];
  const totalSpent = rows.reduce((s, c) => s + ((c.contract_value_cents as number) ?? 0), 0);
  const activeCount = rows.filter((c) => c.status === "active").length;
  const renewed = rows.filter((c) => c.renewed_from_id).length;
  const expired = rows.filter((c) => c.status === "expired").length;
  const renewalRate = renewed + expired > 0 ? Math.round((renewed / (renewed + expired)) * 100) : 100;

  const createdAt = org?.created_at ? new Date(org.created_at as string) : new Date();
  const yearsOn = (Date.now() - createdAt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  const founding = await isFoundingPartner(organizationId);
  const longTermBonus = Math.min(25, Math.floor(yearsOn * 5)) + (founding ? 15 : 0);

  const breakdown: Record<string, number> = {
    tenure: Math.min(20, Math.floor(yearsOn * 4)),
    renewal: Math.round(renewalRate * 0.2),
    spend: Math.min(25, Math.floor(totalSpent / 500_000)),
    volume: Math.min(15, activeCount * 3),
    payment: 10,
    longTerm: longTermBonus,
  };

  if (founding) breakdown.founding = 10;

  const score = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));

  const result: SponsorScore = {
    organizationId,
    score,
    yearsOnPlatform: Math.round(yearsOn * 10) / 10,
    renewalRatePercent: renewalRate,
    totalSpentCents: totalSpent,
    sponsorshipCount: rows.length,
    paymentScore: 100,
    communityRating: null,
    responseTimeHours: null,
    longTermBonus,
    breakdown,
  };

  await admin.from("sponsor_scores").upsert({
    organization_id: organizationId,
    score: result.score,
    years_on_platform: result.yearsOnPlatform,
    renewal_rate_percent: result.renewalRatePercent,
    total_spent_cents: result.totalSpentCents,
    sponsorship_count: result.sponsorshipCount,
    payment_score: result.paymentScore,
    long_term_bonus: result.longTermBonus,
    breakdown: result.breakdown,
    computed_at: new Date().toISOString(),
  });

  return result;
}

export async function getSponsorScore(organizationId: string) {
  if (!isSupabaseConfigured()) return computeSponsorScore(organizationId);

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsor_scores")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) return computeSponsorScore(organizationId);

  return {
    organizationId,
    score: data.score as number,
    yearsOnPlatform: Number(data.years_on_platform),
    renewalRatePercent: data.renewal_rate_percent as number,
    totalSpentCents: data.total_spent_cents as number,
    sponsorshipCount: data.sponsorship_count as number,
    paymentScore: data.payment_score as number,
    communityRating: data.community_rating != null ? Number(data.community_rating) : null,
    responseTimeHours: data.response_time_hours != null ? Number(data.response_time_hours) : null,
    longTermBonus: data.long_term_bonus as number,
    breakdown: (data.breakdown as Record<string, number>) ?? {},
  } satisfies SponsorScore;
}
