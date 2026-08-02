import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateAgencyForm } from "@/components/agency/create-agency-form";
import {
  AgencyExclusiveFeaturesSection,
  AgencyPartnershipComparisonTable,
  AgencyPartnershipPricingSection,
  AgencyPremiumPerksSection,
  AgencyWholesaleBenefitsSection,
} from "@/components/agency/agency-partnership-pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AGENCY_PARTNERSHIP_PHILOSOPHY, MARKETING_CREDIT_USES } from "@/lib/agency/partnership-program";
import { getAgencyComparisonRowsDynamic, getAgencyPartnershipPlansDynamic } from "@/lib/monetization/agency-plans.server";
import { agencyPlanLabel } from "@/lib/agency/permissions";
import { agencyDashboardPath } from "@/lib/agency/sections";
import { getProfile, getSessionUser } from "@/lib/auth/session";
import { getUserAgencyOrganizations } from "@/lib/data/agencies";
import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireFeatureAccess } from "@/lib/features/guard";

export const metadata: Metadata = {
  title: "Agency Partnership Program",
  description:
    "Join LiveCircuit as a wholesale partner — included venue access, Booking CRM, promotional credits, and exclusive agency advantages.",
};

export default async function AgencyHomePage() {
  await requireFeatureAccess("agency_portal");
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/agency/dashboard");

  const [profile, orgs, plans, comparisonRows] = await Promise.all([
    getProfile(),
    getUserAgencyOrganizations(user.id),
    getAgencyPartnershipPlansDynamic(),
    getAgencyComparisonRowsDynamic(),
  ]);

  if (profile?.role === "agency" && profile.primary_agency_id) {
    redirect(agencyDashboardPath());
  }

  if (profile?.role === "agency" && orgs.length === 1) {
    const admin = getSupabaseAdmin();
    await syncAgencyAccountProfile(admin, {
      userId: user.id,
      organizationId: orgs[0]!.id,
      memberRole: orgs[0]!.role,
    });
    redirect(agencyDashboardPath());
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Agency Partnership Program</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Your roster deserves a wholesale partner
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {AGENCY_PARTNERSHIP_PHILOSOPHY.subheadline}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Badge variant="outline">Included venue access</Badge>
          <Badge variant="outline">Booking CRM</Badge>
          <Badge variant="outline">Monthly promotional credits</Badge>
          <Badge variant="outline">Priority scheduling</Badge>
        </div>
      </div>

      {orgs.length > 0 ? (
        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={agencyDashboardPath()}
                className="glass-panel block rounded-2xl border border-white/10 p-6 transition hover:border-primary/40"
              >
                <p className="text-lg font-semibold">{org.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {agencyPlanLabel(org.plan)} Partnership · {org.role}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="mt-16">
        <AgencyPartnershipPricingSection compact plans={plans} />
      </section>

      <section className="mt-20">
        <AgencyWholesaleBenefitsSection />
      </section>

      <section className="mt-20 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Marketing credits</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every partnership includes monthly promotional credits — spend them on platform visibility for your roster.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`glass-panel ${plan.popular ? "border-primary/30 bg-primary/5" : "border-white/10"}`}
            >
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{plan.promotionalCreditsLabel}/mo</p>
                <p className="text-sm text-muted-foreground">{plan.name} Partnership</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <ul className="flex flex-wrap gap-2">
          {MARKETING_CREDIT_USES.map((use) => (
            <Badge key={use} variant="secondary">{use}</Badge>
          ))}
        </ul>
      </section>

      <section className="mt-20">
        <h2 className="mb-6 text-2xl font-bold">Plan comparison</h2>
        <AgencyPartnershipComparisonTable rows={comparisonRows} />
      </section>

      <section className="mt-20">
        <AgencyExclusiveFeaturesSection />
      </section>

      <section className="mt-20">
        <AgencyPremiumPerksSection />
      </section>

      <section className="mt-20 rounded-2xl border border-white/10 bg-white/[0.02] p-8 sm:p-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-2xl font-bold">Start your partnership</h2>
            <p className="mt-3 text-muted-foreground">
              Create your agency workspace on {plans[0]?.name ?? "Boutique"} Partnership ({plans[0]?.priceLabel ?? ""}). Upgrade anytime as your roster grows.
              Most agencies save more on included venues and credits than the partnership costs.
            </p>
            <Button className="mt-6" href="/agency/pricing" variant="outline">
              View full pricing details
            </Button>
          </div>
          <CreateAgencyForm starterPlanLabel={`${plans[0]?.name ?? "Boutique"} Partnership (${plans[0]?.priceLabel ?? ""})`} />
        </div>
      </section>
    </div>
  );
}
