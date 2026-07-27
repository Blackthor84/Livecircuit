import {
  CONTRACT_LENGTH_OPTIONS,
  FOUNDER_SPONSOR_PRICING,
  PACKAGE_SCORE_LABELS,
  SPONSORSHIP_ADDONS,
  SPONSORSHIP_SETUP_FEES,
  type ArenaTierId,
  type ContractLengthYears,
  type PaymentOptionId,
  type SponsorshipAddonId,
  getArenaTierMeta,
  getFounderSavings,
} from "@/lib/pricing/livecircuit-pricing";
import { getFounderSponsorRoi } from "@/lib/pricing/founder-sponsor-utils";

export type SponsorshipQuoteInput = {
  tierId: ArenaTierId;
  contractYears: ContractLengthYears;
  paymentOption: PaymentOptionId;
  selectedAddonIds: SponsorshipAddonId[];
};

export type SponsorshipQuote = {
  tierId: ArenaTierId;
  tierName: string;
  contractYears: ContractLengthYears;
  paymentOption: PaymentOptionId;
  selectedAddons: (typeof SPONSORSHIP_ADDONS)[number][];
  baseAnnualPerYear: number;
  addonsAnnualPerYear: number;
  contractDiscountPercent: number;
  contractDiscountAmount: number;
  annualTotalPerYear: number;
  totalContractValue: number;
  regularAnnualTotal: number;
  estimatedSavings: number;
  setupFee: number;
  paymentAmount: number;
  paymentLabel: string;
  monthlyEquivalent: number;
  roi: ReturnType<typeof getFounderSponsorRoi>;
  costPerEvent: number;
  costPerImpression: number;
  cpm: number;
  estimatedFanTouchpoints: number;
  packageScore: number;
  packageScoreLabel: string;
  packageScoreExplanation: string;
};

export function calculateSponsorshipQuote(input: SponsorshipQuoteInput): SponsorshipQuote {
  const tier = getArenaTierMeta(input.tierId);
  const founder = FOUNDER_SPONSOR_PRICING[input.tierId];
  const contractYears = ([1, 3, 5].includes(input.contractYears) ? input.contractYears : 3) as ContractLengthYears;
  const contract = CONTRACT_LENGTH_OPTIONS.find((c) => c.years === contractYears)!;
  const selectedAddons = SPONSORSHIP_ADDONS.filter((a) => input.selectedAddonIds.includes(a.id));

  const baseAnnualPerYear = founder.annual;
  const addonsAnnualPerYear = selectedAddons.reduce((sum, a) => sum + a.annualCost, 0);
  const subtotalPerYear = baseAnnualPerYear + addonsAnnualPerYear;
  const contractDiscountAmount = Math.round(subtotalPerYear * (contract.discountPercent / 100));
  const annualTotalPerYear = subtotalPerYear - contractDiscountAmount;
  const totalContractValue = annualTotalPerYear * contractYears;
  const regularAnnualTotal = (founder.regularAnnual + addonsAnnualPerYear) * contractYears;
  const estimatedSavings = regularAnnualTotal - totalContractValue;
  const setupFee = SPONSORSHIP_SETUP_FEES[input.tierId];

  let paymentAmount: number;
  let paymentLabel: string;
  switch (input.paymentOption) {
    case "quarterly":
      paymentAmount = Math.round(annualTotalPerYear / 4);
      paymentLabel = "per quarter";
      break;
    case "monthly":
      paymentAmount = Math.round(annualTotalPerYear / 12);
      paymentLabel = "per month";
      break;
    default:
      paymentAmount = annualTotalPerYear;
      paymentLabel = "per year";
  }

  const roi = getFounderSponsorRoi(input.tierId, contractYears);
  const totalEvents = roi.annualEvents;
  const costPerEvent = totalEvents > 0 ? Math.round(totalContractValue / totalEvents) : 0;
  const costPerImpression = roi.brandImpressions > 0 ? totalContractValue / roi.brandImpressions : 0;
  const cpm = costPerImpression * 1000;
  const estimatedFanTouchpoints =
    roi.estimatedReach + roi.emailOpens + roi.pushNotifications + roi.socialShares + roi.chatEngagement;

  const packageScore = calculatePackageScore(input, annualTotalPerYear, selectedAddons.length);
  const scoreMeta = PACKAGE_SCORE_LABELS.find((s) => packageScore >= s.min) ?? PACKAGE_SCORE_LABELS[3];

  return {
    tierId: input.tierId,
    tierName: tier.name,
    contractYears,
    paymentOption: input.paymentOption,
    selectedAddons,
    baseAnnualPerYear,
    addonsAnnualPerYear,
    contractDiscountPercent: contract.discountPercent,
    contractDiscountAmount,
    annualTotalPerYear,
    totalContractValue,
    regularAnnualTotal,
    estimatedSavings,
    setupFee,
    paymentAmount,
    paymentLabel,
    monthlyEquivalent: Math.round(annualTotalPerYear / 12),
    roi,
    costPerEvent,
    costPerImpression,
    cpm,
    estimatedFanTouchpoints,
    packageScore,
    packageScoreLabel: scoreMeta.label,
    packageScoreExplanation: buildScoreExplanation(input, packageScore, founder.regularAnnual),
  };
}

function calculatePackageScore(
  input: SponsorshipQuoteInput,
  annualTotal: number,
  addonCount: number
): number {
  let score = 55;
  const tierIndex = ["community", "club", "theater", "arena", "stadium"].indexOf(input.tierId);
  score += tierIndex * 6;
  score += input.contractYears === 3 ? 8 : input.contractYears === 5 ? 14 : 0;
  score += Math.min(addonCount * 3, 18);
  const savings = getFounderSavings(input.tierId);
  if (savings > 0) score += 5;
  if (annualTotal > 0) score += 4;
  return Math.min(100, Math.max(40, score));
}

function buildScoreExplanation(
  input: SponsorshipQuoteInput,
  score: number,
  regularAnnual: number
): string {
  if (score >= 90) {
    return "This package provides premium visibility while locking in Founder Pricing before future pricing increases.";
  }
  if (score >= 75) {
    return `A strong founder package with ${input.contractYears}-year commitment and measurable digital reach across the fan journey.`;
  }
  if (input.selectedAddonIds.length < 2) {
    return "Consider add-ons to maximize exposure across homepage, livestream, and email touchpoints.";
  }
  return `Founder pricing saves significantly vs. illustrative regular pricing of $${regularAnnual.toLocaleString()}/yr.`;
}

export function compareTierQuotes(
  tierA: ArenaTierId,
  tierB: ArenaTierId,
  contractYears: ContractLengthYears,
  paymentOption: PaymentOptionId,
  selectedAddonIds: SponsorshipAddonId[]
) {
  const quoteA = calculateSponsorshipQuote({ tierId: tierA, contractYears, paymentOption, selectedAddonIds });
  const quoteB = calculateSponsorshipQuote({ tierId: tierB, contractYears, paymentOption, selectedAddonIds });
  const metaA = getArenaTierMeta(tierA);
  const metaB = getArenaTierMeta(tierB);

  return {
    quoteA,
    quoteB,
    rows: [
      { label: "Founder Annual", a: quoteA.annualTotalPerYear, b: quoteB.annualTotalPerYear, format: "currency" as const },
      { label: "Total Contract", a: quoteA.totalContractValue, b: quoteB.totalContractValue, format: "currency" as const },
      { label: "Estimated Reach", a: quoteA.roi.estimatedReach, b: quoteB.roi.estimatedReach, format: "compact" as const },
      { label: "Annual Events", a: metaA.annualEvents, b: metaB.annualEvents, format: "number" as const },
      { label: "Brand Impressions", a: quoteA.roi.brandImpressions, b: quoteB.roi.brandImpressions, format: "compact" as const },
      { label: "Cost Per Event", a: quoteA.costPerEvent, b: quoteB.costPerEvent, format: "currency" as const },
      { label: "CPM", a: quoteA.cpm, b: quoteB.cpm, format: "cpm" as const },
      { label: "Capacity", a: metaA.maxCapacity, b: metaB.maxCapacity, format: "number" as const },
    ],
  };
}
