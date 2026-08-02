"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_AUDIENCE,
  type ArtistVenueId,
  type AudienceInputs,
  type PerformerTypeId,
} from "@/lib/demo/artist-success-center-data";
import {
  calculateActiveAudience,
  calculateMultiScores,
  generateArtistReport,
  getVenueMatch,
  type ArtistReport,
} from "@/lib/demo/artist-success-center-utils";
import type { MonetizationSnapshot } from "@/lib/monetization/types";
import type { BusinessRulesSnapshot } from "@/lib/business-rules/types";
import {
  buildArtistBookingPricingDisplay,
  buildBookingFeeByVenue,
  buildFeeGuideItems,
  type ArtistBookingPricingDisplay,
} from "@/lib/monetization/pricing-utils";

type SuccessCenterContextValue = {
  performerType: PerformerTypeId;
  setPerformerType: (type: PerformerTypeId) => void;
  audience: AudienceInputs;
  updateAudience: (key: keyof AudienceInputs, value: number) => void;
  activeAudience: number;
  venueMatch: ReturnType<typeof getVenueMatch>;
  multiScores: ReturnType<typeof calculateMultiScores>;
  report: ArtistReport;
  presentationMode: boolean;
  setPresentationMode: (on: boolean) => void;
  presentationStep: number;
  setPresentationStep: (step: number) => void;
  compareVenueA: ArtistVenueId;
  compareVenueB: ArtistVenueId;
  setCompareVenueA: (id: ArtistVenueId) => void;
  setCompareVenueB: (id: ArtistVenueId) => void;
  pricingSnapshot: MonetizationSnapshot;
  rulesSnapshot: BusinessRulesSnapshot;
  artistPricing: ArtistBookingPricingDisplay;
  feeGuideItems: ReturnType<typeof buildFeeGuideItems>;
  bookingFeeByVenue: ReturnType<typeof buildBookingFeeByVenue>;
};

const SuccessCenterContext = createContext<SuccessCenterContextValue | null>(null);

export function SuccessCenterProvider({
  children,
  pricingSnapshot,
  rulesSnapshot,
}: {
  children: ReactNode;
  pricingSnapshot: MonetizationSnapshot;
  rulesSnapshot: BusinessRulesSnapshot;
}) {
  const [performerType, setPerformerType] = useState<PerformerTypeId>("musician");
  const [audience, setAudience] = useState<AudienceInputs>(DEFAULT_AUDIENCE);
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationStep, setPresentationStep] = useState(0);
  const [compareVenueA, setCompareVenueA] = useState<ArtistVenueId>("community");
  const [compareVenueB, setCompareVenueB] = useState<ArtistVenueId>("club");

  useEffect(() => {
    document.documentElement.dataset.ascPresentation = presentationMode ? "true" : "false";
    return () => {
      delete document.documentElement.dataset.ascPresentation;
    };
  }, [presentationMode]);

  const value = useMemo(() => {
    const activeAudience = calculateActiveAudience(audience);
    const venueMatch = getVenueMatch(audience, performerType);
    const multiScores = calculateMultiScores(audience, performerType, venueMatch.venue.id);
    const report = generateArtistReport(audience, performerType);
    const artistPricing = buildArtistBookingPricingDisplay(pricingSnapshot);
    const feeGuideItems = buildFeeGuideItems(pricingSnapshot);
    const bookingFeeByVenue = buildBookingFeeByVenue(pricingSnapshot);

    return {
      performerType,
      setPerformerType,
      audience,
      updateAudience: (key: keyof AudienceInputs, val: number) =>
        setAudience((prev) => ({ ...prev, [key]: val })),
      activeAudience,
      venueMatch,
      multiScores,
      report,
      presentationMode,
      setPresentationMode,
      presentationStep,
      setPresentationStep,
      compareVenueA,
      compareVenueB,
      setCompareVenueA,
      setCompareVenueB,
      pricingSnapshot,
      rulesSnapshot,
      artistPricing,
      feeGuideItems,
      bookingFeeByVenue,
    };
  }, [performerType, audience, presentationMode, presentationStep, compareVenueA, compareVenueB, pricingSnapshot, rulesSnapshot]);

  return <SuccessCenterContext.Provider value={value}>{children}</SuccessCenterContext.Provider>;
}

export function useSuccessCenter() {
  const ctx = useContext(SuccessCenterContext);
  if (!ctx) throw new Error("useSuccessCenter must be used within SuccessCenterProvider");
  return ctx;
}

export function useOptionalSuccessCenter() {
  return useContext(SuccessCenterContext);
}
