"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Download,
  Link2,
  Mail,
  Plane,
  Presentation,
  Printer,
} from "lucide-react";
import { ClosingExperience } from "@/components/demo/naming-rights/closing-experience";
import { ConfiguratorToolbar } from "@/components/demo/naming-rights/configurator-toolbar";
import { CustomizeVenueStep } from "@/components/demo/naming-rights/customize-venue-step";
import { FanJourneyBrandImpact } from "@/components/demo/naming-rights/fan-journey/fan-journey-brand-impact";
import { FanJourneyComparison } from "@/components/demo/naming-rights/fan-journey/fan-journey-comparison";
import { FanJourneyExecutiveInsight } from "@/components/demo/naming-rights/fan-journey/fan-journey-executive-insight";
import { FanJourneyExperience } from "@/components/demo/naming-rights/fan-journey/fan-journey-experience";
import { InteractiveAnalyticsDashboard } from "@/components/demo/naming-rights/interactive-analytics-dashboard";
import { LiveEventBrandingV3 } from "@/components/demo/naming-rights/live-event-branding-v3";
import { LivePersonalizationStrip } from "@/components/demo/naming-rights/live-personalization-strip";
import { RoiCalculatorV2 } from "@/components/demo/naming-rights/roi-calculator-v2";
import { SponsorshipPackageV3 } from "@/components/demo/naming-rights/sponsorship-package-v3";
import { useSponsorVisualizer } from "@/components/demo/naming-rights/sponsor-visualizer-context";
import { UsStateSelector } from "@/components/demo/naming-rights/us-state-selector";
import { VenueExteriorV3 } from "@/components/demo/naming-rights/venue-exterior-v3";
import { FadeUp } from "@/components/demo/naming-rights/fade-up";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ARENA_TIER_OPTIONS } from "@/lib/demo/naming-rights-data";
import { buildExecutiveMetrics, formatCompact, formatCurrency } from "@/lib/demo/naming-rights-utils";
import type { SponsorVisualizerStepId } from "@/lib/demo/sponsor-visualizer-steps";
import { cn } from "@/lib/utils";

export function StepContent({
  stepId,
  presentation = false,
}: {
  stepId: SponsorVisualizerStepId;
  presentation?: boolean;
}) {
  const ctx = useSponsorVisualizer();
  const {
    form,
    updateForm,
    displayCompany,
    arenaName,
    theme,
    resetKey,
    roi,
    selectedTier,
    setStep,
    enterPresentation,
    enterFlyover,
  } = ctx;

  const executiveMetrics = buildExecutiveMetrics(form.tierId);
  const mailBase = encodeURIComponent(displayCompany);
  const showToolbar = stepId >= 4 && stepId <= 9 && !presentation;
  const showPersonalization = stepId >= 3 && stepId <= 11 && !presentation;

  if (stepId === 1) {
    return (
      <div>
        <StepHeader title="Choose State" subtitle="Interactive map or searchable dropdown — explore every market." />
        <div className="mt-10">
          <UsStateSelector />
        </div>
      </div>
    );
  }

  if (stepId === 2) {
    const statusStyles = {
      Available: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
      Premium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
      Limited: "border-red-500/30 bg-red-500/10 text-red-400",
    };

    return (
      <div>
        <StepHeader title="Choose Venue" subtitle={`Select your LiveCircuit venue tier in ${form.state}.`} />
        <ul className="mt-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {ARENA_TIER_OPTIONS.map((tier, i) => (
            <FadeUp key={tier.id} delay={i * 0.05}>
              <li>
                <button
                  type="button"
                  onClick={() => {
                    updateForm({ tierId: tier.id, monthlyBudget: tier.investment });
                    setTimeout(() => setStep(3), 400);
                  }}
                  className={cn(
                    "glass-panel group h-full w-full rounded-2xl p-6 text-left transition hover:-translate-y-1 hover:border-amber-500/30",
                    form.tierId === tier.id && "border-amber-500/40 ring-1 ring-amber-500/30"
                  )}
                >
                  <Badge className={statusStyles[tier.status]}>{tier.status}</Badge>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="size-5" />
                    </div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>
                  <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Capacity</dt>
                      <dd className="font-semibold">{tier.maxCapacity.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Events / year</dt>
                      <dd className="font-semibold">{tier.annualEvents}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Visitors</dt>
                      <dd className="font-semibold">{formatCompact(tier.monthlyVisitors)}/mo</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Brand exposure</dt>
                      <dd className="font-semibold">{formatCompact(tier.monthlyVisitors * 12)}/yr</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Investment range</dt>
                      <dd className="font-semibold text-amber-400">
                        {formatCurrency(tier.investment)}/mo – {formatCurrency(tier.annualInvestment)}/yr
                      </dd>
                    </div>
                  </dl>
                </button>
              </li>
            </FadeUp>
          ))}
        </ul>
      </div>
    );
  }

  if (stepId === 3) {
    return (
      <div className="space-y-8">
        <StepHeader title="Company" subtitle="Configure your brand — every field updates the entire experience instantly." />
        <CustomizeVenueStep />
        <LivePersonalizationStrip />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showToolbar ? <ConfiguratorToolbar /> : null}
      {showPersonalization && stepId > 3 ? <LivePersonalizationStrip /> : null}

      {stepId === 4 && (
        <>
          <StepHeader title="Live Venue Preview" subtitle={`${arenaName} · ${form.state}`} large={presentation} />
          <VenueExteriorV3 arenaName={arenaName} companyName={displayCompany} theme={theme} logoUrl={form.logoUrl} compact={presentation} />
        </>
      )}

      {stepId === 5 && (
        <>
          {!presentation ? (
            <FanJourneyExperience />
          ) : (
            <>
              <StepHeader
                title="Follow Your Customer's Journey"
                subtitle="Watch how your sponsorship reaches fans from discovery until long after the show ends."
                large
              />
              <FanJourneyExperience compact />
            </>
          )}
        </>
      )}

      {stepId === 6 && (
        <>
          <StepHeader title="Live Event Branding" subtitle="Tickets, listings, apps, LED walls — all personalized." large={presentation} />
          <LiveEventBrandingV3 />
        </>
      )}

      {stepId === 7 && (
        <>
          <StepHeader title="Business Dashboard" subtitle="Executive analytics with animated metrics and charts." large={presentation} />
          <InteractiveAnalyticsDashboard theme={theme} resetKey={resetKey} metrics={executiveMetrics} />
        </>
      )}

      {stepId === 8 && (
        <>
          <StepHeader title="Your Brand Impact" subtitle="Cumulative sponsor exposure across the complete fan lifecycle." large={presentation} />
          <div className="space-y-8">
            <FanJourneyBrandImpact compact={presentation} />
            <FanJourneyExecutiveInsight compact={presentation} />
          </div>
        </>
      )}

      {stepId === 9 && (
        <>
          <StepHeader
            title="Traditional vs LiveCircuit"
            subtitle="Why digital naming rights deliver measurable engagement at every touchpoint."
            large={presentation}
          />
          <FanJourneyComparison compact={presentation} />
        </>
      )}

      {stepId === 10 && (
        <>
          <StepHeader title="ROI Calculator" subtitle="Adjust tier, years, and budget — outputs update instantly." large={presentation} />
          <RoiCalculatorV2
            monthlyBudget={form.monthlyBudget}
            contractYears={form.contractYears}
            tierId={form.tierId}
            onBudgetChange={(v) => updateForm({ monthlyBudget: v })}
            onYearsChange={(v) => updateForm({ contractYears: v })}
            onTierChange={(v) => updateForm({ tierId: v })}
            theme={theme}
          />
        </>
      )}

      {stepId === 11 && (
        <>
          <StepHeader title="Proposal Generator" subtitle="Executive naming rights package — prepared for your team." large={presentation} />
          <SponsorshipPackageV3
            companyName={displayCompany}
            arenaName={arenaName}
            state={form.state}
            tierName={selectedTier.name}
            industry={form.industry}
            estimatedReach={roi.estimatedReach}
            brandExposure={`${formatCompact(roi.estimatedBrandExposure)} annual exposure`}
            contractYears={form.contractYears}
            totalInvestment={roi.totalInvestment}
            investmentRange={`${formatCurrency(selectedTier.investment)}/mo – ${formatCurrency(selectedTier.annualInvestment)}/yr`}
            theme={theme}
            logoUrl={form.logoUrl}
            slogan={form.slogan}
          />
        </>
      )}

      {stepId === 12 && !presentation && (
        <FadeUp className="mx-auto max-w-2xl text-center">
          <div className="glass-panel space-y-6 rounded-3xl p-10 sm:p-14">
            <Presentation className="mx-auto size-12 text-primary" />
            <h2 className="text-3xl font-bold">Presentation & Flyover</h2>
            <p className="text-muted-foreground">
              Full-width slides for the conference room, or a cinematic auto-scroll flyover for executive demos.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12 px-8" onClick={enterPresentation}>
                Presentation Mode
                <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="secondary" className="h-12 px-8" onClick={enterFlyover}>
                <Plane className="size-4" />
                Start Executive Flyover
              </Button>
            </div>
          </div>
        </FadeUp>
      )}

      {stepId === 13 && !presentation && (
        <>
          <StepHeader title="Exports" subtitle="Share your executive proposal with stakeholders." />
          <FadeUp className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Download PDF", icon: Download },
              { label: "Print Proposal", icon: Printer },
              { label: "Share Proposal", icon: Link2 },
              { label: "Email Proposal", icon: Mail },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                disabled
                className="glass-panel flex items-center gap-4 rounded-2xl p-6 text-left opacity-80 disabled:cursor-not-allowed"
              >
                <action.icon className="size-5" />
                <div>
                  <p className="font-semibold">{action.label}</p>
                  <p className="text-sm text-muted-foreground">Coming soon</p>
                </div>
              </button>
            ))}
          </FadeUp>
          <FadeUp className="mt-10 flex flex-wrap justify-center gap-4">
            <Button size="lg" href={`mailto:partners@livecircuit.com?subject=Reserve%20Venue%20-%20${mailBase}`}>
              Reserve Venue
            </Button>
            <Button size="lg" variant="secondary" href={`mailto:partners@livecircuit.com?subject=Schedule%20Meeting%20-%20${mailBase}`}>
              <Calendar className="size-4" />
              Schedule Meeting
            </Button>
          </FadeUp>
        </>
      )}

      {stepId === 14 && !presentation && <ClosingExperience />}
    </div>
  );
}

function StepHeader({ title, subtitle, large }: { title: string; subtitle: string; large?: boolean }) {
  return (
    <FadeUp className={large ? "text-center" : "mb-2"}>
      <h2 className={cn("font-bold tracking-tight", large ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl")}>{title}</h2>
      <p className={cn("text-muted-foreground", large ? "mx-auto mt-4 max-w-2xl text-lg" : "mt-3")}>{subtitle}</p>
    </FadeUp>
  );
}
