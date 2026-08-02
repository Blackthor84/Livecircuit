/**
 * Agency Partnership Program — single source of truth for plans, benefits, credits, and messaging.
 * Individual artists pay per venue booking; agencies receive included venue access as wholesale partners.
 */

import { DEFAULT_BOOKING_FEES, type ArenaTierId, type BookableArenaTierId } from "@/lib/pricing/livecircuit-pricing";
import type { AgencyPlan } from "@/lib/agency/types";

export type { AgencyPlan };

/** Maps legacy DB values and aliases to current plan ids. */
export const AGENCY_PLAN_ALIASES: Record<string, AgencyPlan> = {
  starter: "boutique",
  boutique: "boutique",
  pro: "growth",
  growth: "growth",
  enterprise: "enterprise",
};

export function normalizeAgencyPlan(plan: string | null | undefined): AgencyPlan {
  if (!plan) return "boutique";
  return AGENCY_PLAN_ALIASES[plan] ?? "boutique";
}

export function agencyPlanLabel(plan: string | null | undefined): string {
  const normalized = normalizeAgencyPlan(plan);
  return AGENCY_PARTNERSHIP_PLANS.find((p) => p.id === normalized)?.name ?? "Boutique";
}

export type AgencyPartnershipPlan = {
  id: AgencyPlan;
  name: string;
  tagline: string;
  priceLabel: string;
  priceCents: number;
  popular?: boolean;
  artistLimit: number | null;
  staffLimit: number | null;
  promotionalCreditsCents: number;
  promotionalCreditsLabel: string;
  includedVenueTiers: ArenaTierId[];
  stadiumNote?: string;
  features: string[];
  highlights: string[];
};

export const AGENCY_PARTNERSHIP_PHILOSOPHY = {
  headline: "Wholesale partners, not software subscribers",
  subheadline:
    "Individual artists pay per digital venue booking. Agencies receive included venue access, operational software, and promotional credits — because you are long-term platform partners.",
  savingsPitch:
    "Most agencies save more on venue bookings and promotional credits every month than their partnership costs.",
};

export const AGENCY_WHOLESALE_BENEFITS = [
  {
    title: "Venue access included",
    description: "Book Community, Club, Theater, or Arena venues without per-event booking fees — based on your partnership tier.",
  },
  {
    title: "Lower operating costs",
    description: "Run unlimited digital and ticketed events while keeping more revenue in your roster.",
  },
  {
    title: "Priority scheduling",
    description: "Reserve Friday and Saturday prime time and premium slots before individual artists.",
  },
  {
    title: "Exclusive inventory",
    description: "Access agency-only features like showcase weekends, bulk creation, and shared sponsor inventory.",
  },
  {
    title: "Business software included",
    description: "Booking CRM, roster management, contracts, payments, analytics, and shared inbox — built in.",
  },
  {
    title: "Marketing credits every month",
    description: "Promotional credits for homepage features, push notifications, email campaigns, and more.",
  },
  {
    title: "Partner pricing",
    description: "Wholesale economics designed so your partnership pays for itself from day one.",
  },
  {
    title: "Early feature access",
    description: "Beta features, roadmap voting, and priority support as a verified platform partner.",
  },
] as const;

export const AGENCY_EXCLUSIVE_FEATURES = [
  "Reserve Friday and Saturday prime time before individual artists",
  "Reserve premium venue slots earlier than everyone else",
  "Bulk event creation",
  "Duplicate existing events",
  "Recurring event scheduling",
  "Agency festival creation",
  "Agency showcase weekends",
  "Cross-promote every artist from one dashboard",
  "Shared sponsor inventory",
  "Sponsor marketplace",
  "Agency leaderboard",
  "Internal notes and internal messaging",
  "Shared documents and artist contract vault",
  "Agency asset library and shared branding kits",
  "Agency templates and custom onboarding pages",
  "Agency referral program with referral analytics",
  "Bulk artist onboarding, invitations, and imports",
  "Agency ticket bundles",
  "Agency-only networking events and educational webinars",
  "Agency community access",
  "Agency success manager (Growth+)",
  "Agency roadmap voting and beta access",
] as const;

export const AGENCY_PREMIUM_PERKS = [
  "Dedicated agency success score",
  "Agency performance insights and rankings",
  "Top agency badges and verified partner badge",
  "Agency certification and partner directory listing",
  "Exclusive hiring board and talent scouting dashboard",
  "AI talent, fan growth, pricing, and sponsor recommendations",
  "Artist comparison reports and revenue forecasting",
  "Fan lifetime value analytics",
  "Automated monthly business reports",
  "Quarterly performance reviews and sponsor performance reports",
  "One-click financial exports and tax reporting dashboard",
  "Custom branding, custom domain, and branded ticket confirmations",
  "Branded event pages and agency merchandise storefront",
  "Agency sponsorship marketplace",
  "Priority customer support and live chat",
  "Feature request priority and early beta testing",
] as const;

export const MARKETING_CREDIT_USES = [
  "Homepage promotion",
  "Featured events",
  "Genre page promotion",
  "Homepage hero placement",
  "Push notifications",
  "Email campaigns",
  "Search boosts",
  "Trending boosts",
  "Recommended events",
  "Featured artist slots",
  "Agency spotlight",
  "Sponsored newsletters",
  "Featured collections",
] as const;

const BOUTIQUE_FEATURES = [
  "Up to 10 artists",
  "Unlimited Community Venue bookings",
  "Unlimited Club Venue bookings",
  "Unlimited digital events",
  "Unlimited ticketed events",
  "Booking CRM",
  "Agency dashboard",
  "Agency branding",
  "5 staff members",
  "Roster management",
  "Event calendar",
  "Task management",
  "Contracts",
  "Payments",
  "Revenue analytics",
  "Ticket analytics",
  "Fan CRM",
  "Sponsor CRM",
  "Shared inbox",
  "Priority support",
  "Artist verification priority",
  "Basic AI marketing tools",
  "Agency badge",
  "Agency profile page",
  "Agency analytics",
  "Agency event calendar",
  "Agency reporting",
  "Agency performance dashboard",
  "$100 monthly promotional credits",
];

const GROWTH_FEATURES = [
  "Everything in Boutique",
  "Up to 50 artists",
  "Unlimited Theater bookings",
  "Unlimited staff",
  "Advanced analytics",
  "Advanced AI marketing",
  "Sponsor marketplace",
  "Audience segmentation",
  "Export reports",
  "White-label ticket pages",
  "Multiple offices",
  "API access",
  "Custom permissions",
  "Priority event approval",
  "Featured agency profile",
  "Priority homepage placement",
  "Agency showcase weekends",
  "Dedicated sponsor recommendations",
  "$300 monthly promotional credits",
];

const ENTERPRISE_FEATURES = [
  "Everything in Growth",
  "Unlimited artists",
  "Unlimited Arena bookings",
  "Unlimited staff",
  "Dedicated account manager",
  "Concierge onboarding",
  "White-label portal",
  "Enterprise integrations",
  "CRM integrations",
  "Accounting integrations",
  "Single Sign-On",
  "Audit logs",
  "Beta features",
  "Quarterly business reviews",
  "Custom reporting",
  "Dedicated infrastructure priority",
  "Highest support priority",
  "$800 monthly promotional credits",
  "Stadium bookings require approval",
];

export const AGENCY_PARTNERSHIP_PLANS: AgencyPartnershipPlan[] = [
  {
    id: "boutique",
    name: "Boutique",
    tagline: "For focused rosters ready to scale digitally",
    priceLabel: "$149/month",
    priceCents: 14_900,
    artistLimit: 10,
    staffLimit: 5,
    promotionalCreditsCents: 10_000,
    promotionalCreditsLabel: "$100",
    includedVenueTiers: ["community", "club"],
    features: BOUTIQUE_FEATURES,
    highlights: [
      "Unlimited Community & Club venues included",
      "Full Booking CRM + roster tools",
      "$100/mo promotional credits",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For agencies scaling revenue across markets",
    priceLabel: "$399/month",
    priceCents: 39_900,
    popular: true,
    artistLimit: 50,
    staffLimit: null,
    promotionalCreditsCents: 30_000,
    promotionalCreditsLabel: "$300",
    includedVenueTiers: ["community", "club", "theater"],
    features: GROWTH_FEATURES,
    highlights: [
      "Everything in Boutique + Theater venues",
      "Sponsor marketplace & advanced AI",
      "$300/mo promotional credits",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For market-leading agencies and enterprise partners",
    priceLabel: "$999/month",
    priceCents: 99_900,
    artistLimit: null,
    staffLimit: null,
    promotionalCreditsCents: 80_000,
    promotionalCreditsLabel: "$800",
    includedVenueTiers: ["community", "club", "theater", "arena"],
    stadiumNote: "Stadium bookings require approval.",
    features: ENTERPRISE_FEATURES,
    highlights: [
      "Unlimited artists + Arena venues included",
      "Dedicated account manager & white-label portal",
      "$800/mo promotional credits",
    ],
  },
];

/** @deprecated Use AGENCY_PARTNERSHIP_PLANS — kept for backward-compatible imports */
export const AGENCY_PLANS = AGENCY_PARTNERSHIP_PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  priceLabel: plan.priceLabel,
  priceCents: plan.priceCents,
  popular: plan.popular,
  features: plan.features,
  artistLimit: plan.artistLimit,
  teamLimit: plan.staffLimit,
}));

export function getAgencyPartnershipPlan(plan: string | null | undefined): AgencyPartnershipPlan {
  const normalized = normalizeAgencyPlan(plan);
  return AGENCY_PARTNERSHIP_PLANS.find((p) => p.id === normalized) ?? AGENCY_PARTNERSHIP_PLANS[0]!;
}

export function getAgencyPlanLimits(plan: string | null | undefined) {
  const def = getAgencyPartnershipPlan(plan);
  return {
    id: def.id,
    name: def.name,
    priceLabel: def.priceLabel,
    priceCents: def.priceCents,
    artistLimit: def.artistLimit,
    teamLimit: def.staffLimit,
    promotionalCreditsCents: def.promotionalCreditsCents,
    includedVenueTiers: def.includedVenueTiers,
  };
}

export function getAgencyPromotionalCredits(plan: string | null | undefined): number {
  return getAgencyPartnershipPlan(plan).promotionalCreditsCents;
}

export function agencyIncludesVenueTier(plan: string | null | undefined, tier: ArenaTierId): boolean {
  return getAgencyPartnershipPlan(plan).includedVenueTiers.includes(tier);
}

/** Example monthly venue savings vs paying per booking as an individual artist. */
export function computeAgencyMonthlySavingsExample(
  plan: string | null | undefined,
  bookingFeeCentsByTier?: Partial<Record<BookableArenaTierId, number>>,
): {
  venueSavingsCents: number;
  creditsCents: number;
  subscriptionCents: number;
  netBenefitCents: number;
  exampleBookings: { tier: ArenaTierId; count: number; feeCents: number }[];
} {
  const def = getAgencyPartnershipPlan(plan);
  const examples: Record<AgencyPlan, { tier: ArenaTierId; count: number }[]> = {
    boutique: [
      { tier: "community", count: 4 },
      { tier: "club", count: 2 },
    ],
    growth: [
      { tier: "community", count: 4 },
      { tier: "club", count: 3 },
      { tier: "theater", count: 2 },
    ],
    enterprise: [
      { tier: "community", count: 6 },
      { tier: "club", count: 4 },
      { tier: "theater", count: 3 },
      { tier: "arena", count: 1 },
    ],
  };

  const bookings = examples[def.id].map((b) => ({
    ...b,
    feeCents: bookingFeeCentsByTier?.[b.tier as BookableArenaTierId] ?? (DEFAULT_BOOKING_FEES[b.tier as BookableArenaTierId] ?? 0) * 100,
  }));

  const venueSavingsCents = bookings.reduce((sum, b) => sum + b.feeCents * b.count, 0);
  const creditsCents = def.promotionalCreditsCents;
  const subscriptionCents = def.priceCents;
  const netBenefitCents = venueSavingsCents + creditsCents - subscriptionCents;

  return {
    venueSavingsCents,
    creditsCents,
    subscriptionCents,
    netBenefitCents,
    exampleBookings: bookings,
  };
}

export type AgencyPlanCapability =
  | "sponsor_marketplace"
  | "advanced_analytics"
  | "advanced_ai_marketing"
  | "white_label_tickets"
  | "white_label_portal"
  | "api_access"
  | "custom_permissions"
  | "dedicated_account_manager"
  | "sso"
  | "audit_logs"
  | "agency_success_manager";

const PLAN_CAPABILITIES: Record<AgencyPlanCapability, AgencyPlan[]> = {
  sponsor_marketplace: ["growth", "enterprise"],
  advanced_analytics: ["growth", "enterprise"],
  advanced_ai_marketing: ["growth", "enterprise"],
  white_label_tickets: ["growth", "enterprise"],
  white_label_portal: ["enterprise"],
  api_access: ["growth", "enterprise"],
  custom_permissions: ["growth", "enterprise"],
  dedicated_account_manager: ["enterprise"],
  sso: ["enterprise"],
  audit_logs: ["enterprise"],
  agency_success_manager: ["growth", "enterprise"],
};

export function agencyPlanHasCapability(
  plan: string | null | undefined,
  capability: AgencyPlanCapability
): boolean {
  const normalized = normalizeAgencyPlan(plan);
  return PLAN_CAPABILITIES[capability].includes(normalized);
}

export const AGENCY_COMPARISON_ROWS: {
  label: string;
  boutique: string;
  growth: string;
  enterprise: string;
}[] = [
  { label: "Monthly partnership", boutique: "$149", growth: "$399", enterprise: "$999" },
  { label: "Artists", boutique: "Up to 10", growth: "Up to 50", enterprise: "Unlimited" },
  { label: "Staff", boutique: "5", growth: "Unlimited", enterprise: "Unlimited" },
  { label: "Community venues", boutique: "Included", growth: "Included", enterprise: "Included" },
  { label: "Club venues", boutique: "Included", growth: "Included", enterprise: "Included" },
  { label: "Theater venues", boutique: "—", growth: "Included", enterprise: "Included" },
  { label: "Arena venues", boutique: "—", growth: "—", enterprise: "Included" },
  { label: "Stadium venues", boutique: "—", growth: "—", enterprise: "By approval" },
  { label: "Promotional credits", boutique: "$100/mo", growth: "$300/mo", enterprise: "$800/mo" },
  { label: "Booking CRM", boutique: "✓", growth: "✓", enterprise: "✓" },
  { label: "Sponsor marketplace", boutique: "—", growth: "✓", enterprise: "✓" },
  { label: "Advanced AI marketing", boutique: "Basic", growth: "Advanced", enterprise: "Advanced" },
  { label: "White-label portal", boutique: "—", growth: "Ticket pages", enterprise: "Full portal" },
  { label: "API access", boutique: "—", growth: "✓", enterprise: "✓" },
  { label: "Account manager", boutique: "—", growth: "Success manager", enterprise: "Dedicated" },
  { label: "Prime-time priority", boutique: "✓", growth: "✓", enterprise: "✓" },
];
