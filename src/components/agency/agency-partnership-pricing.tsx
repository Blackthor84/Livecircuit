"use client";

import { Check, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AGENCY_COMPARISON_ROWS,
  AGENCY_PARTNERSHIP_PHILOSOPHY,
  AGENCY_PARTNERSHIP_PLANS,
  AGENCY_EXCLUSIVE_FEATURES,
  AGENCY_PREMIUM_PERKS,
  AGENCY_WHOLESALE_BENEFITS,
  computeAgencyMonthlySavingsExample,
  getAgencyPartnershipPlan,
  normalizeAgencyPlan,
} from "@/lib/agency/partnership-program";
import type { AgencyComparisonRow } from "@/lib/monetization/extended-types";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/utils";

export function AgencyPartnershipValueBanner({ plan }: { plan: string | null | undefined }) {
  const normalized = normalizeAgencyPlan(plan);
  const partnership = getAgencyPartnershipPlan(normalized);
  const savings = computeAgencyMonthlySavingsExample(normalized);

  return (
    <Card className="glass-panel overflow-hidden border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/5">
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <Badge className="bg-primary/20 text-primary">
              <Sparkles className="mr-1 size-3" />
              {partnership.name} Partnership
            </Badge>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Your partnership saves more than it costs
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              {AGENCY_PARTNERSHIP_PHILOSOPHY.savingsPitch} Based on typical roster activity, included venue access
              and {partnership.promotionalCreditsLabel} in monthly credits can exceed your{" "}
              {partnership.priceLabel} partnership fee.
            </p>
          </div>
          <div className="min-w-[220px] rounded-xl border border-white/10 bg-background/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Example monthly value</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Venue savings</span>
                <span className="font-medium tabular-nums text-emerald-400">
                  +{formatCents(savings.venueSavingsCents)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Promotional credits</span>
                <span className="font-medium tabular-nums text-emerald-400">
                  +{formatCents(savings.creditsCents)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-2">
                <span className="text-muted-foreground">Partnership fee</span>
                <span className="font-medium tabular-nums">−{formatCents(savings.subscriptionCents)}</span>
              </div>
              <div className="flex justify-between gap-4 font-semibold">
                <span className="flex items-center gap-1">
                  <TrendingUp className="size-4 text-primary" />
                  Net benefit
                </span>
                <span className="tabular-nums text-primary">{formatCents(Math.max(0, savings.netBenefitCents))}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {partnership.includedVenueTiers.map((tier) => (
            <Badge key={tier} variant="outline" className="capitalize">
              {tier} venues included
            </Badge>
          ))}
          <Badge variant="outline">{partnership.promotionalCreditsLabel}/mo credits</Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgencyPartnershipPricingSection({
  compact = false,
  plans = AGENCY_PARTNERSHIP_PLANS,
}: {
  compact?: boolean;
  plans?: typeof AGENCY_PARTNERSHIP_PLANS;
}) {
  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-primary">Agency Partnership Program</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          {AGENCY_PARTNERSHIP_PHILOSOPHY.headline}
        </h2>
        <p className="mt-4 text-muted-foreground">{AGENCY_PARTNERSHIP_PHILOSOPHY.subheadline}</p>
      </div>

      <div className={cn("grid gap-5", compact ? "md:grid-cols-3" : "lg:grid-cols-3")}>
        {plans.map((plan) => {
          const savings = computeAgencyMonthlySavingsExample(plan.id);
          return (
            <Card
              key={plan.id}
              className={cn(
                "glass-panel relative flex flex-col border-white/10",
                plan.popular && "border-primary/40 shadow-lg shadow-primary/10"
              )}
            >
              {plan.popular ? (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary">Most popular</Badge>
              ) : null}
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="pt-2 text-3xl font-bold">{plan.priceLabel}</p>
                <p className="text-xs text-emerald-400">
                  Est. {formatCents(Math.max(0, savings.netBenefitCents))}+ net monthly value
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="mb-4 space-y-1.5">
                  {plan.highlights.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                {!compact ? (
                  <ul className="max-h-64 space-y-1 overflow-y-auto border-t border-white/10 pt-4 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Button className="mt-auto w-full" variant={plan.popular ? "default" : "secondary"} href="/agency">
                  Join as partner
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function AgencyPartnershipComparisonTable({
  rows = AGENCY_COMPARISON_ROWS,
}: {
  rows?: AgencyComparisonRow[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            <th className="px-4 py-3 font-medium text-muted-foreground">Feature</th>
            <th className="px-4 py-3 font-medium">Boutique</th>
            <th className="px-4 py-3 font-medium text-primary">Growth</th>
            <th className="px-4 py-3 font-medium">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-white/5">
              <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
              <td className="px-4 py-2.5">{row.boutique}</td>
              <td className="px-4 py-2.5 font-medium">{row.growth}</td>
              <td className="px-4 py-2.5">{row.enterprise}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgencyWholesaleBenefitsSection() {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Wholesale partner benefits</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Agencies are not buying software — you are joining LiveCircuit&apos;s exclusive partner ecosystem with
          operational, financial, promotional, and competitive advantages.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGENCY_WHOLESALE_BENEFITS.map((benefit) => (
          <Card key={benefit.title} className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{benefit.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function AgencyExclusiveFeaturesSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Agency-exclusive features</h2>
      <p className="max-w-2xl text-muted-foreground">
        Only available to verified agency partners — never offered to individual artists.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AGENCY_EXCLUSIVE_FEATURES.map((feature) => (
          <li key={feature} className="flex gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AgencyPremiumPerksSection() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Premium partner perks</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AGENCY_PREMIUM_PERKS.map((perk) => (
          <li key={perk} className="flex gap-2 rounded-lg border border-white/5 px-3 py-2 text-sm text-muted-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-400" />
            {perk}
          </li>
        ))}
      </ul>
    </section>
  );
}
