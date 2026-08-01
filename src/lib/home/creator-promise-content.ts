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

export const ARTIST_FIRST_TAGLINE =
  "LiveCircuit makes money by helping artists grow—not by taking money directly from artists.";

export const DIGITAL_ONLY_STATEMENT =
  "LiveCircuit is digital only. We host digital performances, digital festivals, digital meet-and-greets, and digital fan experiences—not a marketplace for physical concerts.";

export const CREATOR_PROMISE_COMMITMENTS = [
  { text: "Artists keep 100% of merchandise revenue", icon: Gift },
  { text: "Artists keep 100% of tips", icon: Heart },
  { text: "Artists keep 100% of donations", icon: Coins },
  { text: "Artists own 100% of their content", icon: Crown },
  { text: "Artists keep all publishing rights", icon: BadgeCheck },
  { text: "Artists keep all master recording rights", icon: Mic2 },
  { text: "No exclusivity contracts", icon: Lock },
  { text: "Transparent digital ticketing", icon: Ticket },
  { text: "No hidden platform fees", icon: Shield },
  { text: "Artists can leave the platform without losing ownership of their work", icon: Sparkles },
] as const satisfies ReadonlyArray<{ text: string; icon: LucideIcon }>;

export const CREATOR_PROMISE_TAGLINE =
  "Your fans support YOU. Our business is built around helping you grow—not taking a percentage of everything you earn.";

export const LIVECIRCUIT_REVENUE_SOURCES = [
  "Digital ticketing",
  "Premium artist subscriptions",
  "Talent agency subscriptions",
  "Label subscriptions",
  "Featured artist placement",
  "Event promotion",
  "Premium analytics",
  "AI marketing tools",
  "Fan subscriptions",
  "Cosmetic purchases",
  "VIP experiences",
  "Digital backstage passes",
  "Pay-per-view events",
  "Arena sponsorships",
  "Stage sponsorships",
  "Sponsored events",
  "Advertising",
  "Enterprise software",
  "White-label licensing",
  "API licensing",
] as const;

export const PLAN_INCLUDED_PROMISES = [
  "100% Merchandise Revenue",
  "100% Tips",
  "100% Donations",
  "Content Ownership",
  "No Exclusivity",
  "Transparent Ticketing",
] as const;

export const TRUST_SECTION = {
  title: "Built for artists—not shareholders.",
  body: "Our long-term strategy is to build a thriving digital entertainment ecosystem where artists keep more of what they earn directly from fans, while LiveCircuit grows through premium services, sponsorships, digital ticketing, and fan experiences.",
} as const;

export const ARTIST_FIRST_COMPARISON = [
  {
    label: "Direct fan revenue",
    livecircuit: "You keep 100% of merch, tips, and donations",
    traditional: "Platforms often take a cut of every fan dollar",
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
  {
    label: "How we earn",
    livecircuit: "Premium tools, ticketing, sponsorships, and fan experiences",
    traditional: "Revenue share on tips, merch, and fan transactions",
  },
  {
    label: "Experience type",
    livecircuit: "Digital performances, festivals, and fan experiences",
    traditional: "Often built around physical venue marketplaces",
  },
] as const;

export const CREATOR_PROMISE_FAQ = [
  {
    q: "Why don't you take merch revenue?",
    a: "Merchandise is a direct relationship between you and your fans. LiveCircuit provides the tools to sell digital merch during live shows—we don't take a percentage of those sales.",
  },
  {
    q: "Why don't you take tips?",
    a: "Tips go directly to artists. Fans tip you because they love your performance, and we believe that support should stay with the creator—not be skimmed by a platform.",
  },
  {
    q: "How does LiveCircuit make money?",
    a: "We earn through premium artist tools, transparent digital ticketing, sponsorships, fan subscriptions, VIP experiences, analytics, agency and label subscriptions, advertising, and enterprise services—not by taxing your merch, tips, or donations.",
  },
  {
    q: "Who owns my content?",
    a: "You do. Artists retain full ownership of their content, publishing rights, and master recording rights. LiveCircuit hosts and distributes your digital performances—you keep the catalog.",
  },
  {
    q: "Can I leave whenever I want?",
    a: "Yes. There are no exclusivity contracts. You can leave LiveCircuit at any time without losing ownership of your work, recordings, or fan relationships you've built.",
  },
  {
    q: "How are ticket fees handled?",
    a: "Digital ticketing fees are disclosed upfront before you publish an event. They cover streaming infrastructure, secure checkout, and event hosting—not a hidden cut of your merch, tips, or donations.",
  },
  {
    q: "Do I keep my fans?",
    a: "Your audience is yours. Email lists, followers, subscribers, and fan relationships belong to you. LiveCircuit helps you grow and engage them—not own them.",
  },
  {
    q: "Can I perform elsewhere?",
    a: "Absolutely. LiveCircuit is digital-only and non-exclusive. Host shows on other platforms, perform at physical venues, and distribute your music anywhere you choose.",
  },
] as const;

export const ARTIST_FIRST_HOMEPAGE = {
  title: "Artist First. Always.",
  subtitle:
    "Unlike many platforms, LiveCircuit does not profit from the direct relationship between artists and their fans. Instead, we earn revenue by providing premium tools, digital ticketing, sponsorship opportunities, and enhanced fan experiences.",
  revenueTitle: "How LiveCircuit makes money",
  revenueSubtitle:
    "Our success grows with yours. We build premium services and partnerships—not by taking a cut of every fan dollar.",
} as const;
