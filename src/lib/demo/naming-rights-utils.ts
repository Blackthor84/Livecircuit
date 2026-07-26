import { ARENA_TIER_OPTIONS } from "@/lib/demo/naming-rights-data";

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

export function getBrandTheme(companyName: string): BrandTheme {
  const hue = hashString(companyName.toLowerCase() || "livecircuit") % 360;
  return {
    initials: getInitials(companyName),
    hue,
    primary: `oklch(0.68 0.2 ${hue})`,
    secondary: `oklch(0.52 0.16 ${(hue + 45) % 360})`,
    gold: "oklch(0.78 0.14 85)",
    gradient: `linear-gradient(135deg, oklch(0.68 0.2 ${hue}), oklch(0.52 0.16 ${(hue + 50) % 360}))`,
    glow: `oklch(0.68 0.2 ${hue} / 0.35)`,
  };
}

export function getArenaName(companyName: string): string {
  const trimmed = companyName.trim();
  if (!trimmed) return "Your Company Arena";
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(" arena") || lower.endsWith(" stadium") || lower.endsWith(" theater")) {
    return trimmed;
  }
  return `${trimmed} Arena`;
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
