import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isFoundingPartner } from "@/lib/sponsorship/founding-partners";

export type SponsorAchievement = {
  slug: string;
  name: string;
  description: string | null;
  iconKey: string | null;
  tier: number;
  earnedAt: string | null;
};

export async function listSponsorAchievementDefs() {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("sponsor_achievement_defs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getOrganizationAchievements(organizationId: string): Promise<SponsorAchievement[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = getSupabaseAdmin();
  const [defs, earned] = await Promise.all([
    admin.from("sponsor_achievement_defs").select("*").eq("is_active", true).order("sort_order"),
    admin
      .from("sponsor_organization_achievements")
      .select("achievement_slug, earned_at")
      .eq("organization_id", organizationId),
  ]);

  const earnedMap = new Map(
    (earned.data ?? []).map((e) => [e.achievement_slug as string, e.earned_at as string])
  );

  return (defs.data ?? []).map((d) => ({
    slug: d.slug as string,
    name: d.name as string,
    description: (d.description as string) ?? null,
    iconKey: (d.icon_key as string) ?? null,
    tier: d.tier as number,
    earnedAt: earnedMap.get(d.slug as string) ?? null,
  }));
}

export async function syncSponsorAchievements(organizationId: string) {
  if (!isSupabaseConfigured()) return;

  const admin = getSupabaseAdmin();

  const { data: contracts } = await admin
    .from("premium_sponsorship_contracts")
    .select("contract_value_cents, status, venue_id")
    .eq("organization_id", organizationId);

  const totalSpent = (contracts ?? []).reduce((s, c) => s + ((c.contract_value_cents as number) ?? 0), 0);
  const activeCount = (contracts ?? []).filter((c) => c.status === "active").length;

  const toAward: string[] = [];
  if (activeCount >= 1 || (contracts ?? []).length >= 1) toAward.push("first_sponsor");
  if (await isFoundingPartner(organizationId)) toAward.push("founding_partner");
  if (totalSpent >= 100_000_000) toAward.push("million_dollar_sponsor");

  const platformContract = (contracts ?? []).find((c) => !c.venue_id && c.status === "active");
  if (platformContract) toAward.push("national_sponsor");

  for (const slug of toAward) {
    await admin.from("sponsor_organization_achievements").upsert(
      { organization_id: organizationId, achievement_slug: slug },
      { onConflict: "organization_id,achievement_slug", ignoreDuplicates: true }
    );
  }
}
