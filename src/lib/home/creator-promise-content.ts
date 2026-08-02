import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Coins,
  Crown,
  Gift,
  Heart,
  Lock,
  Mic2,
  Shield,
  Sparkles,
  Ticket,
  Wallet,
} from "lucide-react";
import { ARTIST_BOOKING_PRICING, DEFAULT_BOOKING_FEES, STADIUM_BOOKING } from "@/lib/pricing/livecircuit-pricing";

export const ARTIST_FIRST_TAGLINE =
  "Join free. Perform when you're ready. LiveCircuit only earns when you host digital events.";

export const DIGITAL_ONLY_STATEMENT =
  "LiveCircuit is digital only. We host digital performances, digital festivals, digital meet-and-greets, and digital fan experiences—not a marketplace for physical concerts.";

/** Modern Creator Promise cards — no monthly artist fees. */
export const CREATOR_PROMISE_COMMITMENTS = [
  { text: "No monthly artist fees", icon: Wallet },
  { text: "Artists keep 100% of tips", icon: Heart },
  { text: "Artists keep 100% of donations", icon: Coins },
  { text: "Artists keep 100% of merchandise revenue", icon: Gift },
  { text: "Artists own their content", icon: Crown },
  { text: "No exclusivity contracts", icon: Lock },
  { text: "Affordable venue booking", icon: Mic2 },
  { text: "Transparent ticketing", icon: Ticket },
] as const satisfies ReadonlyArray<{ text: string; icon: LucideIcon }>;

export const CREATOR_PROMISE_EXTENDED = [
  { text: "Artists keep all publishing rights", icon: BadgeCheck },
  { text: "Artists keep all master recording rights", icon: Mic2 },
  { text: "Artists can leave the platform without losing ownership", icon: Sparkles },
  { text: "No hidden platform fees on fan support", icon: Shield },
] as const satisfies ReadonlyArray<{ text: string; icon: LucideIcon }>;

export const CREATOR_PROMISE_TAGLINE =
  "Your fans support YOU. Join free — you only pay when you book a digital venue and sell tickets.";

export const LIVECIRCUIT_REVENUE_SOURCES = [
  "Digital ticketing fees",
  "Talent agency subscriptions",
  "Arena & stage sponsorships",
  "Advertising",
  "Fan purchases (VIP, backstage, replay)",
  "Event promotion",
  "Featured placement",
  "Pay-per-view events",
  "Sponsored events",
  "Enterprise & white-label licensing",
] as const;

export const PLAN_INCLUDED_PROMISES = [
  "100% Merchandise Revenue",
  "100% Tips",
  "100% Donations",
  "Content Ownership",
  "No Exclusivity",
  "Transparent Ticketing",
  "Affordable Venue Booking",
  "No Monthly Artist Fees",
] as const;

export const TRUST_SECTION = {
  title: "Built for artists—not shareholders.",
  body: "Recurring revenue comes from agency subscriptions, ticketing, sponsorships, advertising, and fan purchases—not from charging artists simply to be on the platform. Artists join free and only pay when they choose to perform.",
} as const;

export const ARTIST_FIRST_COMPARISON = [
  {
    label: "Monthly fees",
    livecircuit: "Free to join — no artist subscription",
    traditional: "Monthly Pro/Premium plans to access the platform",
  },
  {
    label: "Direct fan revenue",
    livecircuit: "You keep 100% of merch, tips, and donations",
    traditional: "Platforms often take a cut of every fan dollar",
  },
  {
    label: "When you pay",
    livecircuit: "Only when you book a venue and sell tickets",
    traditional: "Monthly fees plus revenue share on everything",
  },
  {
    label: "Content ownership",
    livecircuit: "You own your recordings, publishing, and catalog",
    traditional: "Platforms may claim usage or distribution rights",
  },
  {
    label: "Exclusivity",
    livecircuit: "Perform anywhere—no lock-in contracts",
    traditional: "Many platforms require exclusive distribution",
  },
] as const;

export const CREATOR_PROMISE_FAQ = [
  {
    q: "Why don't artists pay monthly?",
    a: "LiveCircuit is Artist First. We want zero financial risk to joining. Create your profile, build your audience, sell merch, and receive tips for free. You only pay when you choose to host a digital event.",
  },
  {
    q: "Why is there a venue booking fee?",
    a: "The booking fee reserves digital venue inventory and reduces abandoned bookings. It is intentionally affordable—not a major revenue source. Community venues start at $25 per event.",
  },
  {
    q: "How much does it cost to host an event?",
    a: `Venue booking: Community $${DEFAULT_BOOKING_FEES.community}, Club $${DEFAULT_BOOKING_FEES.club}, Theater $${DEFAULT_BOOKING_FEES.theater}, Arena $${DEFAULT_BOOKING_FEES.arena}. Stadium requires approval and custom pricing. Plus transparent ticketing fees on ticket sales only.`,
  },
  {
    q: "What do I keep?",
    a: "100% of tips, donations, and merchandise revenue. Full ownership of your content, publishing rights, and master recordings. No exclusivity—you can leave anytime.",
  },
  {
    q: "How do ticket fees work?",
    a: `A ${ARTIST_BOOKING_PRICING.platformFeePercentage}% digital ticketing fee applies to ticket sales only, plus standard payment processing. Fees are disclosed before you publish. Merch, tips, and donations are never taxed by LiveCircuit.`,
  },
  {
    q: "Why are booking fees so affordable?",
    a: "We believe the barrier to performing digitally should be almost zero. Booking fees cover venue reservation and hosting—they are not designed to be a profit center. Our primary revenue comes from ticketing, agency subscriptions, and sponsorships.",
  },
  {
    q: "Why don't you take merch revenue?",
    a: "Merchandise is a direct relationship between you and your fans. LiveCircuit provides the tools to sell digital merch—we don't take a percentage of those sales.",
  },
  {
    q: "Why don't you take tips?",
    a: "Tips go directly to artists. Fans tip you because they love your performance, and that support stays with the creator—not the platform.",
  },
  {
    q: "How does LiveCircuit make money?",
    a: "Digital ticketing, talent agency subscriptions, sponsorships, advertising, and fan purchases (VIP, backstage passes, replay). Not by charging artists a monthly fee or taxing merch, tips, and donations.",
  },
  {
    q: "Who owns my content?",
    a: "You do. Artists retain full ownership of their content, publishing rights, and master recording rights. LiveCircuit hosts your digital performances—you keep the catalog.",
  },
  {
    q: "Can I leave whenever I want?",
    a: "Yes. There are no exclusivity contracts and no monthly artist fees. Leave at any time without losing ownership of your work.",
  },
  {
    q: "Can I perform elsewhere?",
    a: "Absolutely. LiveCircuit is digital-only and non-exclusive. Host shows on other platforms, perform at physical venues, and distribute your music anywhere you choose.",
  },
] as const;

export const ARTIST_FIRST_HOMEPAGE = {
  title: "Artist First. Always.",
  subtitle:
    "Join LiveCircuit free. Build your audience, sell merch, receive tips, and interact with fans at no cost. You only pay when you book a digital venue and sell tickets.",
  revenueTitle: "How LiveCircuit makes money",
  revenueSubtitle:
    "Recurring revenue comes from agency subscriptions, ticketing, sponsorships, and fan experiences—not from charging artists a monthly fee.",
} as const;

export const FREE_TO_JOIN_HOMEPAGE = ARTIST_BOOKING_PRICING.payWhenYouPerformMessage;

export const VENUE_BOOKING_FEES_DISPLAY = [
  { tier: "Community Venue", fee: `$${DEFAULT_BOOKING_FEES.community}` },
  { tier: "Club Venue", fee: `$${DEFAULT_BOOKING_FEES.club}` },
  { tier: "Theater", fee: `$${DEFAULT_BOOKING_FEES.theater}` },
  { tier: "Arena", fee: `$${DEFAULT_BOOKING_FEES.arena}` },
  { tier: "Stadium", fee: STADIUM_BOOKING.headline },
] as const;

export const AGENCY_SUBSCRIPTION_HIGHLIGHT = {
  title: "Agency subscriptions power recurring revenue",
  subtitle: "Talent agencies get included venue access, CRM, marketing tools, team management, and analytics—plans that save more than they cost.",
  plans: [
    { name: "Boutique", price: "$149/mo" },
    { name: "Growth", price: "$399/mo" },
    { name: "Enterprise", price: "$999/mo" },
  ],
} as const;
