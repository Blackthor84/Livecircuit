import {
  ARTIST_VENUE_GUIDES,
  AUDIENCE_PLATFORMS,
  DEMO_PLATFORM_FEE_RATE,
  DEMO_PROCESSING_FEE,
  DEMO_TAX_RATE,
  FIT_SCORE_LABELS,
  type ArtistVenueId,
  type AudienceInputs,
  type PerformerTypeId,
} from "@/lib/demo/artist-success-center-data";

export function getVenueById(id: ArtistVenueId) {
  return ARTIST_VENUE_GUIDES.find((v) => v.id === id) ?? ARTIST_VENUE_GUIDES[0];
}

export function calculateActiveAudience(audience: AudienceInputs): number {
  const platformSum = AUDIENCE_PLATFORMS.reduce((sum, p) => {
    const key = p.id as keyof Omit<AudienceInputs, "pastAverageAttendance" | "averageTicketPrice" | "yearsPerforming">;
    return sum + audience[key] * p.weight;
  }, 0);
  const pastBoost = audience.pastAverageAttendance * 2.5;
  const experienceBoost = audience.yearsPerforming * 15;
  return Math.round(platformSum * 0.12 + pastBoost + experienceBoost);
}

function getPerformerConversion(type: PerformerTypeId): number {
  const rates: Record<PerformerTypeId, number> = {
    musician: 0.08,
    comedian: 0.1,
    podcast: 0.12,
    speaker: 0.07,
    magician: 0.09,
    dj: 0.085,
    dance: 0.075,
  };
  return rates[type];
}

function scoreToTier(score: number) {
  if (score >= FIT_SCORE_LABELS.excellent.min) return FIT_SCORE_LABELS.excellent;
  if (score >= FIT_SCORE_LABELS.good.min) return FIT_SCORE_LABELS.good;
  if (score >= FIT_SCORE_LABELS.moderate.min) return FIT_SCORE_LABELS.moderate;
  return FIT_SCORE_LABELS.needsGrowth;
}

export type ScoreItem = {
  score: number;
  label: string;
  color: "emerald" | "yellow" | "orange" | "red";
  explanation: string;
};

export type MultiScoreResult = {
  audienceFit: ScoreItem;
  venueReadiness: ScoreItem;
  pricingConfidence: ScoreItem;
  growth: ScoreItem;
};

export function calculateMultiScores(
  audience: AudienceInputs,
  performerType: PerformerTypeId,
  venueId: ArtistVenueId
): MultiScoreResult {
  const activeAudience = calculateActiveAudience(audience);
  const venue = getVenueById(venueId);
  const expected = Math.min(Math.round(activeAudience * getPerformerConversion(performerType)), venue.capacity);
  const fillRatio = expected / venue.capacity;
  const largerVenue = ARTIST_VENUE_GUIDES.find((v) => v.capacity > venue.capacity);

  let audienceFitScore = 50;
  if (fillRatio >= 0.85) audienceFitScore += 38;
  else if (fillRatio >= 0.65) audienceFitScore += 28;
  else if (fillRatio >= 0.45) audienceFitScore += 12;
  else audienceFitScore -= 15;
  if (audience.emailList > 100) audienceFitScore += 5;
  audienceFitScore = Math.max(0, Math.min(100, audienceFitScore));

  let venueReadinessScore = 30;
  venueReadinessScore += Math.min(audience.yearsPerforming * 12, 36);
  venueReadinessScore += audience.pastAverageAttendance > 50 ? 20 : audience.pastAverageAttendance > 0 ? 10 : 0;
  venueReadinessScore += audience.emailList > 500 ? 15 : audience.emailList > 100 ? 8 : 0;
  venueReadinessScore = Math.max(0, Math.min(100, venueReadinessScore));

  const midPrice = (venue.ticketRangeMin + venue.ticketRangeMax) / 2;
  let pricingConfidenceScore = 50;
  const priceDiff = Math.abs(audience.averageTicketPrice - midPrice) / midPrice;
  if (priceDiff <= 0.15) pricingConfidenceScore += 30;
  else if (priceDiff <= 0.35) pricingConfidenceScore += 10;
  else pricingConfidenceScore -= 15;
  if (audience.yearsPerforming >= 3) pricingConfidenceScore += 15;
  pricingConfidenceScore = Math.max(0, Math.min(100, pricingConfidenceScore));

  let growthScore = 40;
  growthScore += Math.min((audience.instagram + audience.tiktok) / 500, 25);
  growthScore += audience.emailList > 200 ? 15 : 0;
  growthScore += fillRatio >= 0.7 ? 20 : fillRatio >= 0.5 ? 10 : 0;
  growthScore = Math.max(0, Math.min(100, growthScore));

  const audienceFitTier = scoreToTier(audienceFitScore);
  const venueReadinessTier = scoreToTier(venueReadinessScore);
  const pricingTier = scoreToTier(pricingConfidenceScore);
  const growthTier = scoreToTier(growthScore);

  return {
    audienceFit: {
      score: audienceFitScore,
      label: audienceFitTier.label,
      color: audienceFitTier.color,
      explanation:
        fillRatio < 0.5 && largerVenue
          ? `Your audience size suggests you'll create a much better atmosphere in a ${venue.name} than a ${largerVenue.name}.`
          : `Your ~${expected.toLocaleString()} projected attendees represent ${Math.round(fillRatio * 100)}% fill at ${venue.name} — a strong match.`,
    },
    venueReadiness: {
      score: venueReadinessScore,
      label: venueReadinessTier.label,
      color: venueReadinessTier.color,
      explanation:
        venueReadinessScore >= 70
          ? "You've demonstrated consistent attendance and are ready to move into larger venues."
          : audience.yearsPerforming < 2
            ? "Build your live show track record with smaller venues before scaling up."
            : "Growing your email list and show history will unlock larger venue recommendations.",
    },
    pricingConfidence: {
      score: pricingConfidenceScore,
      label: pricingTier.label,
      color: pricingTier.color,
      explanation:
        audience.averageTicketPrice > venue.ticketRangeMax
          ? `Your average ticket price ($${audience.averageTicketPrice}) is above the ${venue.name} range (${venue.typicalTicketPrices}). Consider adjusting.`
          : `Your pricing at $${audience.averageTicketPrice} aligns with ${venue.name}'s typical range of ${venue.typicalTicketPrices}.`,
    },
    growth: {
      score: growthScore,
      label: growthTier.label,
      color: growthTier.color,
      explanation:
        growthScore >= 70
          ? "Strong social presence and engagement signal high growth potential for your next show."
          : "Invest in social clips, email capture, and consistent show dates to accelerate growth.",
    },
  };
}

export type VenueMatchResult = {
  venue: (typeof ARTIST_VENUE_GUIDES)[number];
  why: string;
  expectedAttendance: number;
  sellOutProbability: number;
  recommendedPrice: number;
  recommendedCapacity: number;
  ticketRecommendation: string;
  growthOpportunity: string;
  potentialRisks: string[];
};

export function getVenueMatch(audience: AudienceInputs, performerType: PerformerTypeId): VenueMatchResult {
  const activeAudience = calculateActiveAudience(audience);
  const conversion = getPerformerConversion(performerType);

  let bestVenue = ARTIST_VENUE_GUIDES[0];
  let bestScore = -1;

  for (const venue of ARTIST_VENUE_GUIDES) {
    const expected = Math.min(Math.round(activeAudience * conversion), venue.capacity);
    const fillRatio = expected / venue.capacity;
    let score = 0;
    if (fillRatio >= 0.7 && fillRatio <= 1) score = 100;
    else if (fillRatio >= 0.5 && fillRatio < 0.7) score = 80;
    else if (fillRatio >= 0.35 && fillRatio < 0.5) score = 60;
    else if (fillRatio < 0.35) score = 40 - (0.35 - fillRatio) * 100;
    else score = 70 - (fillRatio - 1) * 50;
    if (score > bestScore) {
      bestScore = score;
      bestVenue = venue;
    }
  }

  const expectedAttendance = Math.min(Math.round(activeAudience * conversion), bestVenue.capacity);
  const sellOutProbability = Math.min(Math.round((expectedAttendance / bestVenue.capacity) * 100), 99);
  const recommendedPrice = Math.round((bestVenue.ticketRangeMin + bestVenue.ticketRangeMax) / 2);
  const recommendedCapacity = Math.min(
    Math.max(expectedAttendance + Math.round(expectedAttendance * 0.1), 100),
    bestVenue.capacity
  );

  const risks: string[] = [];
  if (sellOutProbability < 50) risks.push("Low projected fill rate — consider a smaller venue");
  if (bestVenue.riskLevel === "High" || bestVenue.riskLevel === "Very High")
    risks.push(`${bestVenue.riskLevel} financial risk if attendance underperforms`);
  if (audience.yearsPerforming < 2) risks.push("Limited live performance history");
  if (audience.emailList < 100) risks.push("Small email list reduces direct conversion");
  if (risks.length === 0) risks.push("Low risk profile for this venue tier");

  return {
    venue: bestVenue,
    why: `${bestVenue.name} matches your ${activeAudience.toLocaleString()} active fanbase with ${sellOutProbability}% sell-out probability.`,
    expectedAttendance,
    sellOutProbability,
    recommendedPrice,
    recommendedCapacity,
    ticketRecommendation: `$${bestVenue.ticketRangeMin}–$${bestVenue.ticketRangeMax} (recommended: $${recommendedPrice})`,
    growthOpportunity: bestVenue.growthOpportunity,
    potentialRisks: risks,
  };
}

export type PricingAdvisorResult = {
  grossRevenue: number;
  platformFee: number;
  processingFees: number;
  taxes: number;
  netEarnings: number;
  breakEvenPoint: number;
  venueFillPercent: number;
  recommendation: "high" | "competitive" | "low" | "venue-large";
  recommendationText: string;
  alternateSuggestion?: string;
};

export function calculatePricingAdvisor({
  venueId,
  expectedAttendance,
  ticketPrice,
  marketingBudget = 0,
  platformFeeRate = DEMO_PLATFORM_FEE_RATE,
}: {
  venueId: ArtistVenueId;
  expectedAttendance: number;
  ticketPrice: number;
  marketingBudget?: number;
  platformFeeRate?: number;
}): PricingAdvisorResult {
  const venue = getVenueById(venueId);
  const grossRevenue = expectedAttendance * ticketPrice;
  const platformFee = grossRevenue * platformFeeRate;
  const processingFees = expectedAttendance * DEMO_PROCESSING_FEE;
  const taxes = grossRevenue * DEMO_TAX_RATE;
  const netEarnings = grossRevenue - platformFee - processingFees - taxes - marketingBudget;
  const fillRatio = expectedAttendance / venue.capacity;
  const venueFillPercent = Math.round(fillRatio * 100);
  const midPrice = (venue.ticketRangeMin + venue.ticketRangeMax) / 2;

  let recommendation: PricingAdvisorResult["recommendation"] = "competitive";
  let recommendationText = "Your pricing looks competitive for this venue and attendance.";
  let alternateSuggestion: string | undefined;

  if (fillRatio < 0.35) {
    recommendation = "venue-large";
    recommendationText = "Your venue is probably too large for projected attendance.";
    alternateSuggestion = "Consider a smaller venue to improve atmosphere and reviews.";
  } else if (ticketPrice > venue.ticketRangeMax * 1.1 || (ticketPrice > midPrice && fillRatio < 0.45)) {
    recommendation = "high";
    recommendationText = "Your ticket price is likely too high.";
    alternateSuggestion = "Consider lowering prices to increase attendance.";
  } else if (ticketPrice < venue.ticketRangeMin * 0.85 && fillRatio > 0.85) {
    recommendation = "low";
    recommendationText = "Strong demand — you may be able to raise prices.";
  }

  const fixedCosts = venue.capacity * 0.12 + marketingBudget;
  const netPerTicket = ticketPrice * (1 - platformFeeRate) - DEMO_PROCESSING_FEE;
  const breakEvenPoint = netPerTicket > 0 ? Math.ceil(fixedCosts / netPerTicket) : 999;

  return {
    grossRevenue,
    platformFee,
    processingFees,
    taxes,
    netEarnings,
    breakEvenPoint,
    venueFillPercent,
    recommendation,
    recommendationText,
    alternateSuggestion,
  };
}

export type ShowSimulatorResult = {
  ticketsSold: number;
  venueFilledPercent: number;
  grossRevenue: number;
  profit: number;
  audienceGrowth: number;
  newFollowers: number;
  futureBookingScore: number;
  recommendation: string;
};

export function simulateShow({
  followers,
  ticketPrice,
  venueId,
  conversionRate,
  marketingBudget = 0,
}: {
  followers: number;
  ticketPrice: number;
  venueId: ArtistVenueId;
  conversionRate: number;
  marketingBudget?: number;
}): ShowSimulatorResult {
  const venue = getVenueById(venueId);
  const marketingBoost = 1 + Math.min(marketingBudget / 5000, 0.4);
  const rawTickets = Math.round(followers * (conversionRate / 100) * marketingBoost);
  const ticketsSold = Math.min(rawTickets, venue.capacity);
  const grossRevenue = ticketsSold * ticketPrice;
  const fees = grossRevenue * DEMO_PLATFORM_FEE_RATE + ticketsSold * DEMO_PROCESSING_FEE;
  const profit = grossRevenue - fees - marketingBudget;
  const venueFilledPercent = Math.round((ticketsSold / venue.capacity) * 100);
  const newFollowers = Math.round(ticketsSold * 0.12 + (venueFilledPercent >= 80 ? 150 : 50));
  const audienceGrowth = Math.round(newFollowers * 1.5);
  const futureBookingScore = Math.min(
    100,
    Math.round(venueFilledPercent * 0.5 + (profit > 0 ? 25 : 0) + (newFollowers > 100 ? 15 : 0))
  );

  let recommendation = "Solid projection — maintain promotion through showtime.";
  if (venueFilledPercent < 35) recommendation = "Consider a smaller venue, lower price, or more marketing spend.";
  else if (venueFilledPercent >= 85) recommendation = "Excellent fit — strong future booking score expected.";
  else if (marketingBudget < 500 && venueFilledPercent < 60)
    recommendation = "Increasing marketing spend could significantly improve results.";

  return { ticketsSold, venueFilledPercent, grossRevenue, profit, audienceGrowth, newFollowers, futureBookingScore, recommendation };
}

export type WhatIfResult = {
  grossRevenue: number;
  netEarnings: number;
  venueFillPercent: number;
  fitImpact: number;
  summary: string;
};

export function calculateWhatIf({
  audience,
  performerType,
  venueId,
  ticketPrice,
  expectedAttendance,
  marketingBudget,
}: {
  audience: AudienceInputs;
  performerType: PerformerTypeId;
  venueId: ArtistVenueId;
  ticketPrice: number;
  expectedAttendance: number;
  marketingBudget: number;
}): WhatIfResult {
  const pricing = calculatePricingAdvisor({ venueId, expectedAttendance, ticketPrice, marketingBudget });
  const scores = calculateMultiScores(audience, performerType, venueId);
  const avgScore = Math.round(
    (scores.audienceFit.score + scores.venueReadiness.score + scores.pricingConfidence.score) / 3
  );

  let summary = "Balanced scenario — revenue and venue fit look healthy.";
  if (pricing.venueFillPercent < 40) summary = "Low fill rate — try lower prices or a smaller venue.";
  else if (pricing.recommendation === "high") summary = "High ticket price may suppress attendance.";
  else if (pricing.venueFillPercent >= 85) summary = "Strong sellout potential at this configuration.";

  return {
    grossRevenue: pricing.grossRevenue,
    netEarnings: pricing.netEarnings,
    venueFillPercent: pricing.venueFillPercent,
    fitImpact: avgScore,
    summary,
  };
}

export type ArtistReport = {
  audienceFitScore: number;
  fitLabel: string;
  recommendedVenue: string;
  recommendedTicketPrice: number;
  expectedAttendance: number;
  estimatedRevenue: number;
  growthPlan: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
};

export function generateArtistReport(audience: AudienceInputs, performerType: PerformerTypeId): ArtistReport {
  const match = getVenueMatch(audience, performerType);
  const scores = calculateMultiScores(audience, performerType, match.venue.id);
  const pricing = calculatePricingAdvisor({
    venueId: match.venue.id,
    expectedAttendance: match.expectedAttendance,
    ticketPrice: match.recommendedPrice,
  });

  const strengths: string[] = [];
  const improvements: string[] = [];
  const nextSteps: string[] = [];

  if (audience.emailList > 200) strengths.push("Strong email list for direct ticket conversion");
  else improvements.push("Grow email list to 500+ subscribers");
  if (audience.pastAverageAttendance > 50) strengths.push("Proven live attendance history");
  else improvements.push("Build track record with Community Arena shows");
  if (scores.audienceFit.score >= 70) strengths.push("Audience-venue alignment is strong");
  else improvements.push("Focus on audience growth before scaling venues");
  if (audience.instagram + audience.tiktok > 3000) strengths.push("Solid social media presence");
  else improvements.push("Increase social content and clip sharing");

  nextSteps.push(`Book ${match.venue.name} with tickets at $${match.recommendedPrice}`);
  nextSteps.push("Start promotion 3–4 weeks before showtime");
  nextSteps.push("Capture email signups at every touchpoint");
  if (match.sellOutProbability < 70) nextSteps.push("Consider increasing marketing budget by $500");

  return {
    audienceFitScore: scores.audienceFit.score,
    fitLabel: scores.audienceFit.label,
    recommendedVenue: match.venue.name,
    recommendedTicketPrice: match.recommendedPrice,
    expectedAttendance: match.expectedAttendance,
    estimatedRevenue: pricing.netEarnings,
    growthPlan: match.growthOpportunity,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    nextSteps: nextSteps.slice(0, 4),
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function getFitScoreColorClasses(color: ScoreItem["color"]) {
  const map = {
    emerald: { ring: "ring-emerald-500/40", text: "text-emerald-400", bg: "bg-emerald-500/15", bar: "from-emerald-500 to-emerald-400", fill: "bg-emerald-500" },
    yellow: { ring: "ring-yellow-500/40", text: "text-yellow-400", bg: "bg-yellow-500/15", bar: "from-yellow-500 to-amber-400", fill: "bg-yellow-500" },
    orange: { ring: "ring-orange-500/40", text: "text-orange-400", bg: "bg-orange-500/15", bar: "from-orange-500 to-amber-500", fill: "bg-orange-500" },
    red: { ring: "ring-red-500/40", text: "text-red-400", bg: "bg-red-500/15", bar: "from-red-500 to-rose-400", fill: "bg-red-500" },
  };
  return map[color];
}
