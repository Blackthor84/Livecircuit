import { ARENA_TIER_OPTIONS } from "@/lib/demo/naming-rights-data";
import { STATE_ECONOMIC_REGIONS } from "@/lib/demo/sponsor-visualizer-steps";

export type BrandTheme = {
  initials: string;
  hue: number;
  primary: string;
  secondary: string;
  gold: string;
  gradient: string;
  glow: string;
};

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "LC";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getBrandTheme(
  companyName: string,
  overrides?: { primary?: string; secondary?: string }
): BrandTheme {
  const hue = hashString(companyName.toLowerCase() || "livecircuit") % 360;
  const primary = overrides?.primary ?? `oklch(0.68 0.2 ${hue})`;
  const secondary = overrides?.secondary ?? `oklch(0.52 0.16 ${(hue + 45) % 360})`;
  return {
    initials: getInitials(companyName),
    hue,
    primary,
    secondary,
    gold: "oklch(0.78 0.14 85)",
    gradient: `linear-gradient(135deg, ${primary}, ${secondary})`,
    glow: `${primary}59`,
  };
}

export function getArenaName(companyName: string, tierId?: string): string {
  const trimmed = companyName.trim();
  const company = trimmed || "Your Company";
  const lower = company.toLowerCase();
  if (lower.endsWith(" arena") || lower.endsWith(" stadium") || lower.endsWith(" theater") || lower.endsWith(" club")) {
    return company;
  }
  const suffix: Record<string, string> = {
    community: "Community Arena",
    club: "Club",
    theater: "Theater",
    arena: "Arena",
    stadium: "Stadium",
  };
  const label = tierId ? suffix[tierId] : "Arena";
  return label ? `${company} ${label}` : `${company} Arena`;
}

export function getDisplayCompany(companyName: string): string {
  return companyName.trim() || "Your Company";
}

export type RoiInputs = {
  monthlyBudget: number;
  contractMonths: number;
  tierId: string;
};

export type RoiOutputs = {
  totalInvestment: number;
  estimatedImpressions: number;
  estimatedVisitors: number;
  costPerImpression: number;
  estimatedValue: number;
};

export function calculateRoi({ monthlyBudget, contractMonths, tierId }: RoiInputs): RoiOutputs {
  const tier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId) ?? ARENA_TIER_OPTIONS[2];
  const totalInvestment = monthlyBudget * contractMonths;
  const tierMultiplier = tier.maxCapacity / 5000;
  const estimatedVisitors = Math.round(tier.monthlyVisitors * contractMonths * (monthlyBudget / tier.investment));
  const estimatedImpressions = Math.round(estimatedVisitors * 9.8 * tierMultiplier);
  const costPerImpression = estimatedImpressions > 0 ? totalInvestment / estimatedImpressions : 0;
  const estimatedValue = Math.round(totalInvestment * (2.4 + tierMultiplier * 0.3));

  return {
    totalInvestment,
    estimatedImpressions,
    estimatedVisitors,
    costPerImpression,
    estimatedValue,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export function scaleStatsByTier<T extends { value: number; label: string }>(stats: T[], tierId: string): T[] {
  const tier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId);
  const multiplier = tier ? tier.maxCapacity / 8_000 : 1;
  return stats.map((s) => {
    if (s.label === "Sponsor Since") return s;
    return { ...s, value: Math.round(s.value * Math.max(multiplier, 0.15)) };
  });
}

export function suggestTier(monthlyBudget: number) {
  const sorted = [...ARENA_TIER_OPTIONS].sort((a, b) => a.investment - b.investment);
  return sorted.find((t) => monthlyBudget <= t.investment * 1.5) ?? sorted[sorted.length - 1];
}

export type StateMarketData = {
  state: string;
  venues: number;
  population: number;
  annualVisitors: number;
  sponsorshipOpportunities: number;
  economicRegion: string;
};

export function getEconomicRegion(state: string): string {
  return STATE_ECONOMIC_REGIONS[state] ?? "National";
}

export function getStateMarketData(state: string, population: number): StateMarketData {
  const h = hashString(state);
  const popFactor = population / 10_000_000;
  const venues = Math.max(3, Math.round(4 + popFactor * 18 + (h % 7)));
  const annualVisitors = Math.round(population * (0.08 + (h % 12) / 100));
  const sponsorshipOpportunities = Math.max(2, Math.round(venues * (0.35 + (h % 5) / 10)));

  return {
    state,
    venues,
    population,
    annualVisitors,
    sponsorshipOpportunities,
    economicRegion: getEconomicRegion(state),
  };
}

export type RoiInputsV2 = {
  monthlyBudget: number;
  contractYears: number;
  tierId: string;
};

export type RoiOutputsV2 = RoiOutputs & {
  estimatedReach: number;
  estimatedAnnualValue: number;
  estimatedBrandExposure: number;
};

export function calculateRoiV2({ monthlyBudget, contractYears, tierId }: RoiInputsV2): RoiOutputsV2 {
  const contractMonths = contractYears * 12;
  const base = calculateRoi({ monthlyBudget, contractMonths, tierId });
  const tier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId) ?? ARENA_TIER_OPTIONS[2];
  const estimatedReach = Math.round(tier.monthlyVisitors * (monthlyBudget / tier.investment));
  const estimatedAnnualValue = Math.round(base.estimatedValue / contractYears);
  const estimatedBrandExposure = Math.round(base.estimatedImpressions / contractYears);

  return {
    ...base,
    estimatedReach,
    estimatedAnnualValue,
    estimatedBrandExposure,
  };
}

export function buildExecutiveMetrics(tierId: string) {
  const tier = ARENA_TIER_OPTIONS.find((t) => t.id === tierId) ?? ARENA_TIER_OPTIONS[2];
  const m = tier.maxCapacity / 8_000;
  const factor = Math.max(m, 0.15);

  return [
    { label: "Visitors", value: Math.round(tier.monthlyVisitors * factor), format: "compact" as const },
    { label: "Attendance", value: Math.round(3_420 * factor), format: "number" as const },
    { label: "Reach", value: Math.round(tier.monthlyVisitors * 12 * factor), format: "compact" as const },
    { label: "Streaming Views", value: Math.round(840 * factor * 120), format: "compact" as const },
    { label: "Social Impressions", value: Math.round(12_400 * factor), format: "compact" as const },
    { label: "Brand Recognition", value: Math.round(78 + factor * 12), format: "number" as const },
    { label: "Ticket Sales", value: Math.round(24_800 * factor), format: "compact" as const },
    { label: "ROI", value: Math.round(240 + factor * 180), format: "number" as const },
  ];
}
