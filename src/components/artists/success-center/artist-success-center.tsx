"use client";

import { ArtistReportSection } from "@/components/artists/success-center/artist-report-section";
import { AudienceBuilderStep } from "@/components/artists/success-center/audience-builder-step";
import { AudienceFitScoreStep } from "@/components/artists/success-center/audience-fit-score-step";
import { CreatorPromiseSection } from "@/components/artists/success-center/creator-promise-section";
import { DashboardPreviewSection } from "@/components/artists/success-center/dashboard-preview-section";
import { FeeGuideSection } from "@/components/artists/success-center/fee-guide-section";
import { GrowthRoadmapSection } from "@/components/artists/success-center/growth-roadmap-section";
import { PerformerTypeStep } from "@/components/artists/success-center/performer-type-step";
import { PresentationOverlay, SuccessCenterToolbar } from "@/components/artists/success-center/success-center-toolbar";
import { RevenueTimelineSection } from "@/components/artists/success-center/revenue-timeline-section";
import { SellMoreTicketsSection } from "@/components/artists/success-center/sell-more-tickets-section";
import { ShowSimulatorSection } from "@/components/artists/success-center/show-simulator-section";
import { SuccessCenterCtaSection } from "@/components/artists/success-center/success-center-cta-section";
import { SuccessCenterFaqSection } from "@/components/artists/success-center/success-center-faq-section";
import { SuccessCenterHero } from "@/components/artists/success-center/success-center-hero";
import { SuccessCenterProvider } from "@/components/artists/success-center/success-center-context";
import { TicketPricingAdvisorSection } from "@/components/artists/success-center/ticket-pricing-advisor-section";
import { VenueComparisonSection } from "@/components/artists/success-center/venue-comparison-section";
import { VenueMatchStep } from "@/components/artists/success-center/venue-match-step";
import { WhatIfPanel } from "@/components/artists/success-center/what-if-panel";

import type { MonetizationSnapshot } from "@/lib/monetization/types";
import type { BusinessRulesSnapshot } from "@/lib/business-rules/types";

export function ArtistSuccessCenter({
  pricingSnapshot,
  rulesSnapshot,
}: {
  pricingSnapshot: MonetizationSnapshot;
  rulesSnapshot: BusinessRulesSnapshot;
}) {
  return (
    <SuccessCenterProvider pricingSnapshot={pricingSnapshot} rulesSnapshot={rulesSnapshot}>
      <SuccessCenterToolbar />
      <div className="gradient-mesh min-h-screen pb-20">
        <SuccessCenterHero />
        <CreatorPromiseSection />
        <PerformerTypeStep />
        <AudienceBuilderStep />
        <AudienceFitScoreStep />
        <VenueMatchStep />
        <VenueComparisonSection />
        <TicketPricingAdvisorSection />
        <WhatIfPanel />
        <ShowSimulatorSection />
        <GrowthRoadmapSection />
        <FeeGuideSection />
        <SellMoreTicketsSection />
        <RevenueTimelineSection />
        <SuccessCenterFaqSection />
        <ArtistReportSection />
        <DashboardPreviewSection />
        <SuccessCenterCtaSection />
      </div>
      <PresentationOverlay />
    </SuccessCenterProvider>
  );
}
