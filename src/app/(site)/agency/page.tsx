import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateAgencyForm } from "@/components/agency/create-agency-form";
import { Button } from "@/components/ui/button";
import { AGENCY_PLANS } from "@/lib/agency/permissions";
import { getUserAgencyOrganizations } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { requireFeatureAccess } from "@/lib/features/guard";
import { agencyPath } from "@/lib/agency/sections";

export const metadata: Metadata = {
  title: "Agency Portal",
  description: "Manage artist rosters, bookings, revenue, and sponsorships on LiveCircuit.",
};

export default async function AgencyHomePage() {
  await requireFeatureAccess("agency_portal");
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/agency");

  const orgs = await getUserAgencyOrganizations(user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-widest text-primary">Agency Portal</p>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Your agencies</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Professional roster management, Book Entire Roster auto-matching, revenue analytics, and team permissions —
        built into LiveCircuit.
      </p>

      {orgs.length > 0 ? (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link
                href={agencyPath(org.id, "dashboard")}
                className="glass-panel block rounded-2xl border border-white/10 p-6 transition hover:border-primary/40"
              >
                <p className="text-lg font-semibold">{org.name}</p>
                <p className="mt-1 text-sm capitalize text-muted-foreground">{org.plan} plan · {org.role}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Create an agency</h2>
        <div className="mt-6">
          <CreateAgencyForm />
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-semibold">Pricing</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {AGENCY_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`glass-panel rounded-2xl border p-6 ${
                plan.popular ? "border-primary/40 bg-primary/5" : "border-white/10"
              }`}
            >
              <p className="font-semibold">{plan.name}</p>
              <p className="mt-2 text-2xl font-bold">{plan.priceLabel}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {plan.popular ? (
                <Button className="mt-4 w-full" size="sm" href="/agency">
                  Most popular
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
