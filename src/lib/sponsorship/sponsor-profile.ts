import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { CONTRACT_SELECT, mapBusinessContract } from "@/lib/sponsorship/contracts";
import { listOrgWaitingList } from "@/lib/sponsorship/waiting-list";
import { listPriceHistoryForOrg } from "@/lib/sponsorship/price-history";
import { listOpenAuctions } from "@/lib/sponsorship/auctions";
import { browseSponsorshipMarketplace } from "@/lib/sponsorship/marketplace";
import { getSponsorScore } from "@/lib/sponsorship/sponsor-score";
import { getOrganizationAchievements, syncSponsorAchievements } from "@/lib/sponsorship/sponsor-achievements";
import { isFoundingPartner } from "@/lib/sponsorship/founding-partners";

export type SponsorBusinessProfile = {
  organization: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    billingEmail: string | null;
  };
  currentContracts: ReturnType<typeof mapBusinessContract>[];
  previousContracts: ReturnType<typeof mapBusinessContract>[];
  totalRevenueCents: number;
  lifetimeRevenueCents: number;
  priceHistory: Awaited<ReturnType<typeof listPriceHistoryForOrg>>;
  waitingListEntries: Awaited<ReturnType<typeof listOrgWaitingList>>;
  openAuctions: Awaited<ReturnType<typeof listOpenAuctions>>;
  availableOpportunities: Awaited<ReturnType<typeof browseSponsorshipMarketplace>>;
  sponsorScore: Awaited<ReturnType<typeof getSponsorScore>>;
  achievements: Awaited<ReturnType<typeof getOrganizationAchievements>>;
  isFoundingPartner: boolean;
  upcomingRenewals: {
    id: string;
    displayLabel: string;
    contractEndsAt: string | null;
    renewalWindowStartsAt: string | null;
    firstRightOfRenewalDays: number | null;
  }[];
};

export async function getSponsorBusinessProfile(organizationId: string): Promise<SponsorBusinessProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const admin = getSupabaseAdmin();

  const { data: org } = await supabase
    .from("sponsor_organizations")
    .select("id, slug, name, logo_url, website_url, billing_email")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) return null;

  const { data: contracts } = await admin
    .from("premium_sponsorship_contracts")
    .select(CONTRACT_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  const mapped = (contracts ?? []).map((r) => mapBusinessContract(r as Record<string, unknown>));
  const currentContracts = mapped.filter((c) => ["active", "pending", "reserved"].includes(c.status));
  const previousContracts = mapped.filter((c) => ["expired", "cancelled"].includes(c.status));

  const totalRevenueCents = currentContracts.reduce((s, c) => s + c.contractValueCents, 0);
  const priceHistory = await listPriceHistoryForOrg(organizationId);
  const lifetimeRevenueCents = priceHistory.reduce((s, h) => s + h.lifetimeRevenueCents, 0) + totalRevenueCents;

  await syncSponsorAchievements(organizationId);

  const upcomingRenewals = currentContracts
    .filter((c) => c.contractEndsAt)
    .map((c) => ({
      id: c.id,
      displayLabel: c.displayLabel,
      contractEndsAt: c.contractEndsAt,
      renewalWindowStartsAt: c.renewalWindowStartsAt,
      firstRightOfRenewalDays: c.firstRightOfRenewalDays,
    }));

  const [waitingListEntries, openAuctions, availableOpportunities, sponsorScore, achievements, founding] =
    await Promise.all([
      listOrgWaitingList(organizationId),
      listOpenAuctions(),
      browseSponsorshipMarketplace({ status: "available" }),
      getSponsorScore(organizationId),
      getOrganizationAchievements(organizationId),
      isFoundingPartner(organizationId),
    ]);

  return {
    organization: {
      id: org.id as string,
      slug: org.slug as string,
      name: org.name as string,
      logoUrl: org.logo_url as string | null,
      websiteUrl: org.website_url as string | null,
      billingEmail: org.billing_email as string | null,
    },
    currentContracts,
    previousContracts,
    totalRevenueCents,
    lifetimeRevenueCents,
    priceHistory,
    waitingListEntries,
    openAuctions,
    availableOpportunities: availableOpportunities.slice(0, 12),
    sponsorScore,
    achievements,
    isFoundingPartner: founding,
    upcomingRenewals,
  };
}
