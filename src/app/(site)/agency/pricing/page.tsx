import type { Metadata } from "next";
import Link from "next/link";
import {
  AgencyExclusiveFeaturesSection,
  AgencyPartnershipComparisonTable,
  AgencyPartnershipPricingSection,
  AgencyPremiumPerksSection,
  AgencyWholesaleBenefitsSection,
} from "@/components/agency/agency-partnership-pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MARKETING_CREDIT_USES } from "@/lib/agency/partnership-program";
import { getAgencyComparisonRowsDynamic, getAgencyPartnershipPlansDynamic } from "@/lib/monetization/agency-plans.server";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { requireFeatureAccess } from "@/lib/features/guard";

export const metadata: Metadata = {
  title: "Agency Partnership Pricing",
  description: "Boutique, Growth, and Enterprise agency partnerships with included venue access and promotional credits.",
};

export default async function AgencyPricingPage() {
  await requireFeatureAccess("agency_portal");
  const [plans, comparisonRows] = await Promise.all([
    getAgencyPartnershipPlansDynamic(),
    getAgencyComparisonRowsDynamic(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" href={agencyDashboardPath()}>
          ← Back to dashboard
        </Button>
        <Button size="sm" href="/agency">
          Create partnership
        </Button>
      </div>

      <AgencyPartnershipPricingSection plans={plans} />

      <section className="mt-20">
        <AgencyWholesaleBenefitsSection />
      </section>

      <section className="mt-20 space-y-6">
        <h2 className="text-2xl font-bold">What credits buy</h2>
        <div className="flex flex-wrap gap-2">
          {MARKETING_CREDIT_USES.map((use) => (
            <Badge key={use} variant="outline">{use}</Badge>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="mb-6 text-2xl font-bold">Full comparison</h2>
        <AgencyPartnershipComparisonTable rows={comparisonRows} />
      </section>

      <section className="mt-20">
        <AgencyExclusiveFeaturesSection />
      </section>

      <section className="mt-20">
        <AgencyPremiumPerksSection />
      </section>

      <p className="mt-12 text-center text-sm text-muted-foreground">
        Questions about upgrading?{" "}
        <Link href="/contact" className="text-primary hover:underline">
          Contact our partnerships team
        </Link>
      </p>
    </div>
  );
}
