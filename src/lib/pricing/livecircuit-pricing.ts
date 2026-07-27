/**
 * LiveCircuit Pricing System 2.0
 * Single source of truth — never hardcode prices in components.
 */

export type ArenaTierId = "community" | "club" | "theater" | "arena" | "stadium";

export type ArenaTierMeta = {
  id: ArenaTierId;
  name: string;
  tagline: string;
  maxCapacity: number;
  monthlyVisitors: number;
  annualEvents: number;
  status: "Available" | "Premium" | "Limited";
};

/** Shared venue metadata (non-price fields). */
export const ARENA_TIER_META: ArenaTierMeta[] = [
  {
    id: "community",
    name: "Community Arena",
    tagline: "Perfect for Local Businesses",
    maxCapacity: 500,
    monthlyVisitors: 15_000,
    annualEvents: 120,
    status: "Available",
  },
  {
    id: "club",
    name: "Club Arena",
    tagline: "Growing Regional Brands",
    maxCapacity: 2_500,
    monthlyVisitors: 76_000,
    annualEvents: 280,
    status: "Available",
  },
  {
    id: "theater",
    name: "Theater",
    tagline: "Mid-Market Companies",
    maxCapacity: 8_000,
    monthlyVisitors: 200_000,
    annualEvents: 520,
    status: "Premium",
  },
  {
    id: "arena",
    name: "Arena",
    tagline: "Major Regional Sponsors",
    maxCapacity: 25_000,
    monthlyVisitors: 675_000,
    annualEvents: 840,
    status: "Limited",
  },
  {
    id: "stadium",
    name: "Stadium",
    tagline: "National Brands",
    maxCapacity: 50_000,
    monthlyVisitors: 1_500_000,
    annualEvents: 1_200,
    status: "Limited",
  },
];

/** Artist booking fees — per event, charged when booking a show. */
export const BOOKING_FEES: Record<ArenaTierId, number> = {
  community: 75,
  club: 250,
  theater: 750,
  arena: 2_000,
  stadium: 5_000,
};

export const ARTIST_BOOKING_PRICING = {
  bookingFees: BOOKING_FEES,
  platformFeePercentage: 10,
  platformFeeLabel: "Platform Service Fee",
  paymentProcessingLabel: "Payment Processing",
  paymentProcessingDescription: "Standard card processing rates (typically 2.9% + $0.30 per transaction)",
  paymentProcessingRatePercent: 2.9,
  paymentProcessingFixedCents: 30,
  taxesLabel: "Taxes",
  taxesDescription: "Calculated where applicable based on event location and tax rules",
  defaultTaxRatePercent: 0,
  noSubscriptionMessage: {
    headline: "No monthly subscription.",
    lines: [
      "Create your artist profile for free.",
      "Browse venues for free.",
      "Only pay when you book a show.",
      "Platform fees apply only after your event is booked and tickets begin selling.",
    ],
  },
  transparencyMessage:
    "LiveCircuit believes artists should understand every fee before publishing an event. No hidden fees. No monthly subscriptions. Clear pricing.",
  bookingFeeExplainer: {
    title: "What am I paying for?",
    items: [
      "Venue operations",
      "Streaming infrastructure",
      "Audience discovery",
      "Ticketing",
      "Event hosting",
      "Customer support",
      "Analytics",
      "Security",
      "Moderation",
      "Payment processing",
    ],
  },
} as const;

/** Founder sponsor pricing — introductory rates for early partners. */
export const FOUNDER_SPONSOR_PRICING: Record<
  ArenaTierId,
  { annual: number; monthly: number; regularAnnual: number }
> = {
  community: { annual: 5_000, monthly: 417, regularAnnual: 10_000 },
  club: { annual: 12_500, monthly: 1_042, regularAnnual: 25_000 },
  theater: { annual: 25_000, monthly: 2_083, regularAnnual: 50_000 },
  arena: { annual: 50_000, monthly: 4_167, regularAnnual: 100_000 },
  stadium: { annual: 100_000, monthly: 8_333, regularAnnual: 200_000 },
};

/** Illustrative future tiers — not guaranteed. */
export const FUTURE_GROWTH_PRICING: Record<ArenaTierId, number> = {
  community: 10_000,
  club: 25_000,
  theater: 50_000,
  arena: 100_000,
  stadium: 200_000,
};

export const FUTURE_ENTERPRISE_PRICING: Record<ArenaTierId, string> = {
  community: "$25,000+",
  club: "$50,000+",
  theater: "$100,000+",
  arena: "$250,000+",
  stadium: "$500,000+",
};

export const FOUNDER_PROGRAM = {
  badge: "FOUNDER PROGRAM",
  headline: "Become One of LiveCircuit's Founding Sponsors",
  subheadline:
    "Early sponsors receive exclusive introductory pricing, priority renewal opportunities, and permanent recognition as founding partners while LiveCircuit grows.",
  sectionTitle: "Founder Sponsor Pricing",
  timerTitle: "Founder Program",
  timerSubtitle: "Limited Availability",
  timerMessage:
    "Founder pricing is reserved for a limited number of early sponsors. As LiveCircuit grows and audience reach expands, sponsorship pricing may increase for future partners.",
  legalNote:
    "Founder pricing shown is for demonstration purposes. Final sponsorship packages are customized based on market, exclusivity, venue availability, contract length, and promotional opportunities.",
} as const;

export const FOUNDER_BENEFITS = [
  { title: "Lock in Founder Pricing", description: "Secure introductory rates before standard pricing takes effect." },
  { title: "Priority Renewal", description: "First opportunity to renew when your contract term ends." },
  { title: "Founding Sponsor Recognition", description: "Permanent credit as an early LiveCircuit partner." },
  { title: "Early Product Feedback", description: "Direct input on features shaping the platform." },
  { title: "Preferred Placement", description: "Enhanced visibility across discovery and event surfaces." },
  { title: "First Right of Renewal", description: "Contractual preference before new sponsors enter your market." },
  { title: "Access to New Features", description: "Early access to sponsorship tools and placements." },
  { title: "Exclusive Founder Badge", description: "Digital badge displayed across your sponsored arena." },
  { title: "Invitation to Founder Events", description: "Exclusive partner gatherings (coming soon)." },
  { title: "Recognition on Founder Wall", description: "Permanent listing on the LiveCircuit Founder Wall." },
] as const;

export const FOUNDER_WHATS_INCLUDED = [
  "Naming Rights",
  "Arena Branding",
  "Homepage Placement",
  "Event Pages",
  "Search Results",
  "Digital Tickets",
  "Email Campaigns",
  "Push Notifications",
  "Livestream Branding",
  "VIP Lounge",
  "Chat Branding",
  "Analytics Dashboard",
  "Fan Journey Branding",
  "Sponsor Reports",
] as const;

export const FOUNDER_BADGES = [
  { label: "Founding Sponsor Badge", description: "Displayed across your sponsored arena and event pages." },
  { label: "Founding Year", description: "Permanent founding partner year on all sponsor materials." },
  { label: "Priority Renewal Status", description: "Preferred renewal queue for contract extensions." },
  { label: "Founder Recognition", description: "Listed on the LiveCircuit Founder Wall." },
] as const;

export const SPONSOR_COMPARISON = {
  traditional: [
    "Physical Sign",
    "Local Audience",
    "Limited Analytics",
    "Difficult ROI",
  ],
  livecircuit: [
    "Digital Fan Journey",
    "Tickets",
    "Emails",
    "Notifications",
    "Livestreams",
    "Interactive Engagement",
    "Analytics",
    "Repeat Exposure",
  ],
} as const;

export function getArenaTierMeta(id: ArenaTierId): ArenaTierMeta {
  return ARENA_TIER_META.find((t) => t.id === id) ?? ARENA_TIER_META[0];
}

export function getBookingFee(id: ArenaTierId): number {
  return BOOKING_FEES[id];
}

export function getFounderPricing(id: ArenaTierId) {
  return FOUNDER_SPONSOR_PRICING[id];
}

export function getFounderSavings(id: ArenaTierId): number {
  const p = FOUNDER_SPONSOR_PRICING[id];
  return p.regularAnnual - p.annual;
}

export function getFounderSavingsPercent(id: ArenaTierId): number {
  const p = FOUNDER_SPONSOR_PRICING[id];
  return Math.round(((p.regularAnnual - p.annual) / p.regularAnnual) * 100);
}

// ─── Price My Sponsorship configurator ─────────────────────────────────────

export type ContractLengthYears = 1 | 3 | 5;
export type PaymentOptionId = "annual" | "quarterly" | "monthly";

export const CONTRACT_LENGTH_OPTIONS: {
  years: ContractLengthYears;
  label: string;
  discountPercent: number;
  subtitle: string;
  benefits: string[];
}[] = [
  { years: 1, label: "1 Year", discountPercent: 0, subtitle: "Standard Founder Pricing", benefits: [] },
  {
    years: 3,
    label: "3 Years",
    discountPercent: 10,
    subtitle: "Save 10%",
    benefits: ["Priority Renewal"],
  },
  {
    years: 5,
    label: "5 Years",
    discountPercent: 20,
    subtitle: "Save 20%",
    benefits: ["Maximum Founder Benefits", "Priority Renewal"],
  },
];

export const PAYMENT_OPTIONS: {
  id: PaymentOptionId;
  label: string;
  description: string;
  installmentsPerYear: number;
}[] = [
  { id: "annual", label: "Annual", description: "Single annual payment — simplest billing", installmentsPerYear: 1 },
  { id: "quarterly", label: "Quarterly", description: "Four equal payments per year", installmentsPerYear: 4 },
  { id: "monthly", label: "Monthly", description: "Twelve monthly installments", installmentsPerYear: 12 },
];

export type SponsorshipAddonId =
  | "homepage-featured"
  | "exclusive-category"
  | "featured-event"
  | "homepage-hero"
  | "premium-analytics"
  | "account-manager"
  | "custom-landing"
  | "sponsored-push"
  | "sponsored-email"
  | "featured-livestream"
  | "vip-lounge-branding"
  | "digital-merchandise"
  | "founder-spotlight";

export const SPONSORSHIP_ADDONS: {
  id: SponsorshipAddonId;
  label: string;
  description: string;
  monthlyCost: number;
  annualCost: number;
}[] = [
  { id: "homepage-featured", label: "Homepage Featured Sponsor", description: "Premium placement on LiveCircuit homepage discovery.", monthlyCost: 350, annualCost: 3_500 },
  { id: "exclusive-category", label: "Exclusive Industry Category", description: "Category exclusivity within your sponsored market.", monthlyCost: 500, annualCost: 5_000 },
  { id: "featured-event", label: "Featured Event Placement", description: "Highlighted placement on trending and recommended events.", monthlyCost: 275, annualCost: 2_750 },
  { id: "homepage-hero", label: "Homepage Hero Banner", description: "Full-width hero banner on arena homepage.", monthlyCost: 650, annualCost: 6_500 },
  { id: "premium-analytics", label: "Premium Analytics Dashboard", description: "Advanced reporting, exports, and executive dashboards.", monthlyCost: 200, annualCost: 2_000 },
  { id: "account-manager", label: "Dedicated Account Manager", description: "Named partner success manager for your sponsorship.", monthlyCost: 450, annualCost: 4_500 },
  { id: "custom-landing", label: "Custom Landing Page", description: "Co-branded landing page for campaigns and conversions.", monthlyCost: 300, annualCost: 3_000 },
  { id: "sponsored-push", label: "Sponsored Push Notifications", description: "Branded push notifications to arena followers.", monthlyCost: 225, annualCost: 2_250 },
  { id: "sponsored-email", label: "Sponsored Email Campaigns", description: "Co-branded email campaigns to ticket holders.", monthlyCost: 275, annualCost: 2_750 },
  { id: "featured-livestream", label: "Featured Livestream Placement", description: "Priority livestream overlay and lower-third placement.", monthlyCost: 400, annualCost: 4_000 },
  { id: "vip-lounge-branding", label: "VIP Lounge Branding", description: "Premium VIP lounge co-branding and exclusive offers.", monthlyCost: 325, annualCost: 3_250 },
  { id: "digital-merchandise", label: "Sponsored Digital Merchandise", description: "Branded digital merch and fan collectibles.", monthlyCost: 175, annualCost: 1_750 },
  { id: "founder-spotlight", label: "Founder Spotlight Story", description: "Featured founder partner story across platform channels.", monthlyCost: 150, annualCost: 1_500 },
];

/** One-time setup fee by venue tier (demo). */
export const SPONSORSHIP_SETUP_FEES: Record<ArenaTierId, number> = {
  community: 500,
  club: 1_000,
  theater: 2_500,
  arena: 5_000,
  stadium: 10_000,
};

export const PRICE_MY_SPONSORSHIP = {
  title: "Price My Sponsorship",
  subtitle: "Customize your sponsorship package and receive an instant proposal.",
  founderIncentive: {
    headline: "Founder Pricing Available",
    subheadline: "Become one of the first organizations to secure naming rights before public pricing begins.",
    benefits: [
      "Locked-in introductory pricing",
      "Priority renewal opportunities",
      "Founder recognition",
      "Early access to new sponsorship features",
      "Opportunity to help shape the platform",
    ],
    disclaimer:
      "Founder pricing is available for a limited number of early sponsorships and is subject to change as LiveCircuit grows.",
  },
  contact: {
    email: "partners@livecircuit.com",
    phone: "(555) 012-3456",
  },
} as const;

export const PACKAGE_SCORE_LABELS: { min: number; label: string; color: string }[] = [
  { min: 90, label: "Excellent Investment", color: "emerald" },
  { min: 75, label: "Strong Value", color: "primary" },
  { min: 60, label: "Good Fit", color: "amber" },
  { min: 0, label: "Consider Upgrades", color: "muted" },
];
