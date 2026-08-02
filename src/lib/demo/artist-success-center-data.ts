export type PerformerTypeId =
  | "musician"
  | "comedian"
  | "podcast"
  | "speaker"
  | "magician"
  | "dj"
  | "dance";

export type ArtistVenueId = "community" | "club" | "theater" | "arena" | "stadium";

export const PERFORMER_TYPE_CARDS: {
  id: PerformerTypeId;
  label: string;
  icon: string;
  tagline: string;
  venueBias: ArtistVenueId;
}[] = [
  { id: "musician", label: "Musician", icon: "🎸", tagline: "Live sets, albums, and tour stops", venueBias: "club" },
  { id: "comedian", label: "Comedian", icon: "🎭", tagline: "Stand-up specials and comedy nights", venueBias: "theater" },
  { id: "podcast", label: "Podcast", icon: "🎙️", tagline: "Live recordings and fan Q&A", venueBias: "theater" },
  { id: "speaker", label: "Speaker", icon: "🎤", tagline: "Talks, workshops, and keynotes", venueBias: "theater" },
  { id: "magician", label: "Magician", icon: "✨", tagline: "Interactive illusions and stage magic", venueBias: "club" },
  { id: "dj", label: "DJ", icon: "🎧", tagline: "Club nights, festivals, and live mixes", venueBias: "club" },
  { id: "dance", label: "Dance", icon: "💃", tagline: "Choreography showcases and performances", venueBias: "theater" },
];

export const AUDIENCE_PLATFORMS = [
  { id: "instagram", label: "Instagram Followers", weight: 0.35, icon: "📸" },
  { id: "tiktok", label: "TikTok Followers", weight: 0.3, icon: "🎵" },
  { id: "youtube", label: "YouTube Subscribers", weight: 0.2, icon: "▶️" },
  { id: "facebook", label: "Facebook Followers", weight: 0.1, icon: "👥" },
  { id: "emailList", label: "Email Subscribers", weight: 0.55, icon: "✉️" },
] as const;

export type AudienceInputs = {
  instagram: number;
  tiktok: number;
  youtube: number;
  facebook: number;
  emailList: number;
  pastAverageAttendance: number;
  averageTicketPrice: number;
  yearsPerforming: number;
};

export const DEFAULT_AUDIENCE: AudienceInputs = {
  instagram: 1200,
  tiktok: 800,
  youtube: 400,
  facebook: 300,
  emailList: 150,
  pastAverageAttendance: 85,
  averageTicketPrice: 18,
  yearsPerforming: 2,
};

export const ARTIST_VENUE_GUIDES: {
  id: ArtistVenueId;
  name: string;
  capacity: number;
  typicalAttendance: number;
  ticketRangeMin: number;
  ticketRangeMax: number;
  typicalTicketPrices: string;
  experienceLevel: string;
  recommendedPerformer: string;
  productionLevel: string;
  atmosphere: string;
  audienceSize: string;
  riskLevel: "Low" | "Moderate" | "High" | "Very High";
  growthPotential: string;
  averageShowLength: string;
  bestUses: string[];
  estimatedReach: number;
  growthOpportunity: string;
}[] = [
  {
    id: "community",
    name: "Community Arena",
    capacity: 500,
    typicalAttendance: 200,
    ticketRangeMin: 5,
    ticketRangeMax: 15,
    typicalTicketPrices: "$5–$15",
    experienceLevel: "Emerging",
    recommendedPerformer: "First-time & local acts",
    productionLevel: "Basic streaming",
    atmosphere: "Intimate & supportive",
    audienceSize: "50–500",
    riskLevel: "Low",
    growthPotential: "High — ideal launchpad",
    averageShowLength: "45–60 min",
    bestUses: ["First live show", "Open mic nights", "Local fan meetups"],
    estimatedReach: 2_500,
    growthOpportunity: "Sell out 3 shows to unlock Club Arena.",
  },
  {
    id: "club",
    name: "Club Arena",
    capacity: 2_500,
    typicalAttendance: 900,
    ticketRangeMin: 12,
    ticketRangeMax: 35,
    typicalTicketPrices: "$12–$35",
    experienceLevel: "Developing",
    recommendedPerformer: "500+ engaged followers",
    productionLevel: "Enhanced audio & lighting",
    atmosphere: "Energetic & community-driven",
    audienceSize: "200–2,500",
    riskLevel: "Low",
    growthPotential: "Strong — repeat audience building",
    averageShowLength: "60–90 min",
    bestUses: ["Tour stops", "Album releases", "Regular residency"],
    estimatedReach: 12_000,
    growthOpportunity: "75%+ fill rate unlocks Theater.",
  },
  {
    id: "theater",
    name: "Theater",
    capacity: 8_000,
    typicalAttendance: 3_200,
    ticketRangeMin: 25,
    ticketRangeMax: 75,
    typicalTicketPrices: "$25–$75",
    experienceLevel: "Established",
    recommendedPerformer: "Regional recognition",
    productionLevel: "Premium production suite",
    atmosphere: "Polished & professional",
    audienceSize: "500–8,000",
    riskLevel: "Moderate",
    growthPotential: "High — premium positioning",
    averageShowLength: "75–120 min",
    bestUses: ["Comedy specials", "Podcast live recordings", "Special events"],
    estimatedReach: 45_000,
    growthOpportunity: "4.5+ rating unlocks Arena eligibility.",
  },
  {
    id: "arena",
    name: "Arena",
    capacity: 25_000,
    typicalAttendance: 12_000,
    ticketRangeMin: 45,
    ticketRangeMax: 150,
    typicalTicketPrices: "$45–$150",
    experienceLevel: "Professional",
    recommendedPerformer: "National following",
    productionLevel: "Full production & VIP",
    atmosphere: "Arena-scale excitement",
    audienceSize: "2,000–25,000",
    riskLevel: "High",
    growthPotential: "Very high — career milestone",
    averageShowLength: "90–150 min",
    bestUses: ["Headline tours", "Festival headliners", "Major releases"],
    estimatedReach: 180_000,
    growthOpportunity: "3 consecutive sellouts → Stadium.",
  },
  {
    id: "stadium",
    name: "Stadium",
    capacity: 50_000,
    typicalAttendance: 28_000,
    ticketRangeMin: 75,
    ticketRangeMax: 300,
    typicalTicketPrices: "$75–$300+",
    experienceLevel: "Headliner",
    recommendedPerformer: "Global demand",
    productionLevel: "World-class production",
    atmosphere: "Landmark live experience",
    audienceSize: "10,000–50,000+",
    riskLevel: "Very High",
    growthPotential: "Maximum — global reach",
    averageShowLength: "120–180 min",
    bestUses: ["World tours", "Landmark events", "Charity spectaculars"],
    estimatedReach: 500_000,
    growthOpportunity: "Global campaigns & brand partnerships.",
  },
];

export const VENUE_COMPARE_PRESETS: { label: string; a: ArtistVenueId; b: ArtistVenueId }[] = [
  { label: "Community vs Club", a: "community", b: "club" },
  { label: "Club vs Theater", a: "club", b: "theater" },
  { label: "Theater vs Arena", a: "theater", b: "arena" },
  { label: "Arena vs Stadium", a: "arena", b: "stadium" },
];

export const GROWTH_ROADMAP = [
  {
    venueId: "community" as ArtistVenueId,
    milestones: [
      "Sell out three Community Arena shows",
      "Receive at least a 4.5-star average rating",
      "Build an email list of 1,000 fans",
    ],
    graduateTo: "Club Arena",
  },
  {
    venueId: "club" as ArtistVenueId,
    milestones: [
      "Maintain 75%+ fill rate across 5 shows",
      "Grow social following by 25%",
      "Earn repeat ticket buyers (20%+ return rate)",
    ],
    graduateTo: "Theater",
  },
  {
    venueId: "theater" as ArtistVenueId,
    milestones: [
      "Earn 4.5+ avg rating with 2,500+ attendees",
      "Generate 50+ reviews per show",
      "Launch VIP or premium ticket tier",
    ],
    graduateTo: "Arena",
  },
  {
    venueId: "arena" as ArtistVenueId,
    milestones: [
      "Achieve 3 consecutive sellouts",
      "Reach 100K+ combined social following",
      "Secure brand or sponsorship partnership",
    ],
    graduateTo: "Stadium",
  },
  {
    venueId: "stadium" as ArtistVenueId,
    milestones: ["Headline-level performer — global reach unlocked"],
    graduateTo: null,
  },
];

export const FEE_GUIDE_ITEMS = [
  { item: "Creating an account", cost: "FREE", note: "No credit card required" },
  { item: "Building your profile", cost: "FREE", note: "Full artist presence" },
  { item: "Browsing digital venues", cost: "FREE", note: "Explore all tiers" },
  { item: "Searching events", cost: "FREE", note: "Discover and research" },
  { item: "Following artists", cost: "FREE", note: "Build your network" },
  { item: "Merchandise sales", cost: "100% to artist", note: "LiveCircuit does not take merch revenue" },
  { item: "Tips & donations", cost: "100% to artist", note: "Direct fan support stays with you" },
  { item: "Booking a digital show", cost: "Per-event booking fee", note: "Only charged when you book — see tier rates below" },
  {
    item: ARTIST_BOOKING_PRICING.platformFeeLabel,
    cost: `${ARTIST_BOOKING_PRICING.platformFeePercentage}% on ticket sales`,
    note: "Transparent digital ticketing only — disclosed before you publish. Does not apply to merch, tips, or donations.",
  },
  {
    item: ARTIST_BOOKING_PRICING.paymentProcessingLabel,
    cost: ARTIST_BOOKING_PRICING.paymentProcessingDescription,
    note: "Actual payment processor rates",
  },
] as const;

export const BOOKING_FEE_BY_VENUE = ARTIST_VENUE_GUIDES.map((v) => ({
  venueId: v.id,
  label: v.name,
  fee: v.id === "stadium" ? STADIUM_BOOKING.headline : formatBookingFee(v.id),
}));

export const TICKET_SALES_TIPS = [
  { title: "Start with the right venue", description: "Match venue size to realistic demand. A sellout beats a half-empty room every time.", icon: "🎯" },
  { title: "Sell out smaller rooms", description: "Full venues create buzz, clips, and reviews that fuel your next booking.", icon: "🎫" },
  { title: "Use social media clips", description: "Share performance highlights to convert viewers into ticket buyers.", icon: "🎬" },
  { title: "Collect reviews", description: "Happy fans who leave reviews boost discovery and venue upgrades.", icon: "⭐" },
  { title: "Reward repeat fans", description: "Early access and loyalty perks turn one-time buyers into regulars.", icon: "🎁" },
  { title: "Build an email list", description: "Email converts 3–5× better than social for direct ticket sales.", icon: "✉️" },
  { title: "Announce early", description: "Start promotion 3–4 weeks out. Early buyers become promoters.", icon: "📣" },
  { title: "Offer VIP experiences", description: "Meet-and-greets and premium tiers increase revenue per fan.", icon: "👑" },
  { title: "Collaborate with performers", description: "Co-headline shows to cross-pollinate audiences and split marketing costs.", icon: "🤝" },
] as const;

export const REVENUE_TIMELINE = [
  { step: 1, title: "Publish Event", description: "Create your show, set pricing, and publish to LiveCircuit discovery.", icon: "📅" },
  { step: 2, title: "Promote Event", description: "Share across social, email, and partner channels. Sales accelerate in the final 2 weeks.", icon: "📣" },
  { step: 3, title: "Sell Tickets", description: "Fans purchase directly on LiveCircuit. Track sales and fill rate in real time.", icon: "🎫" },
  { step: 4, title: "Perform Show", description: "Go live from your venue. Engage fans, collect reviews, capture clips.", icon: "🔴" },
  { step: 5, title: "Payout Processing", description: "LiveCircuit calculates ticket earnings minus transparent digital ticketing and processing fees. Merch, tips, and donations are paid separately—100% to you.", icon: "🧾" },
  { step: 6, title: "Funds Deposited", description: "Ticket payouts within 3–5 business days after your digital event ends.", icon: "💰" },
] as const;

export const SUCCESS_CENTER_FAQ = [
  {
    q: "Why don't artists pay monthly?",
    a: "LiveCircuit is Artist First. There are no monthly artist fees, Pro plans, or Premium subscriptions. Join free and only pay when you host a digital event.",
  },
  {
    q: "Why is there a venue booking fee?",
    a: "Booking fees reserve digital venue inventory and reduce abandoned bookings. They are intentionally affordable—not a major revenue source.",
  },
  {
    q: "How much does it cost to host an event?",
    a: "Community venues from $25, Club $75, Theater $200, Arena $500 per event, plus transparent ticketing fees on ticket sales. Stadium requires approval.",
  },
  {
    q: "Do you take a cut of my merch, tips, or donations?",
    a: "No. Artists keep 100% of merchandise revenue, tips, and donations. LiveCircuit earns through digital ticketing, agency subscriptions, sponsorships, and fan experiences—not monthly artist fees or cuts on direct fan support.",
  },
  {
    q: "How do I get paid?",
    a: "After your digital event, ticket earnings are calculated minus transparent digital ticketing and payment processing fees. Merch, tips, and donations go directly to you. Funds are sent to your connected payment method per your artist dashboard payout schedule.",
  },
  {
    q: "How do refunds work?",
    a: "Fans who request refunds within the event refund window receive their ticket amount back per LiveCircuit policy. Refunded tickets are removed from your sales totals.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. Cancel from your event dashboard. Fans with purchased tickets are notified and refunded per your cancellation policy.",
  },
  {
    q: "Can I change pricing?",
    a: "Adjust prices before significant sales occur. After a sales threshold, changes may be restricted to protect existing buyers.",
  },
  {
    q: "How do I move to a bigger venue?",
    a: "Complete growth milestones — sell out smaller digital venues, earn strong reviews, maintain high fill rates, and build your email list. LiveCircuit recommends upgrades when your data supports it.",
  },
  {
    q: "Who owns my content?",
    a: "You do. Artists retain full ownership of content, publishing rights, and master recording rights. There are no exclusivity contracts—you can perform elsewhere anytime.",
  },
  {
    q: "How do digital ticketing fees work?",
    a: "Transparent digital ticketing fees apply only to ticket sales and are disclosed before you publish. They cover streaming infrastructure, secure checkout, and event hosting—not merch, tips, or donations.",
  },
] as const;

export const ASC_STEPS = [
  { id: "creator-promise", label: "Creator Promise" },
  { id: "performer-type", label: "Performer Type" },
  { id: "audience-profile", label: "Audience Profile" },
  { id: "audience-fit", label: "Fit Scores" },
  { id: "venue-match", label: "Venue Match" },
  { id: "venue-comparison", label: "Compare Venues" },
  { id: "pricing-advisor", label: "Pricing" },
  { id: "show-simulator", label: "Simulator" },
  { id: "growth-roadmap", label: "Roadmap" },
  { id: "fee-guide", label: "Fees" },
  { id: "sell-more", label: "Sell More" },
  { id: "revenue-timeline", label: "Revenue" },
  { id: "faq", label: "FAQ" },
  { id: "artist-report", label: "Report" },
  { id: "dashboard-preview", label: "Dashboard" },
  { id: "ready-to-book", label: "Book" },
] as const;

import { ARTIST_BOOKING_PRICING, DEFAULT_BOOKING_FEES, STADIUM_BOOKING, formatBookingFee } from "@/lib/pricing/livecircuit-pricing";
import { formatPricingCurrency } from "@/lib/pricing/artist-booking-utils";

/** @deprecated Use ARTIST_BOOKING_PRICING.platformFeePercentage / 100 */
export const DEMO_PLATFORM_FEE_RATE = ARTIST_BOOKING_PRICING.platformFeePercentage / 100;
/** @deprecated Use ARTIST_BOOKING_PRICING.paymentProcessingFixedCents / 100 */
export const DEMO_PROCESSING_FEE = ARTIST_BOOKING_PRICING.paymentProcessingFixedCents / 100;
/** @deprecated Use ARTIST_BOOKING_PRICING.defaultTaxRatePercent / 100 */
export const DEMO_TAX_RATE = ARTIST_BOOKING_PRICING.defaultTaxRatePercent / 100;

export const FIT_SCORE_LABELS = {
  excellent: { min: 80, label: "Excellent", color: "emerald" as const },
  good: { min: 60, label: "Good", color: "yellow" as const },
  moderate: { min: 40, label: "Moderate", color: "orange" as const },
  needsGrowth: { min: 0, label: "Needs Growth", color: "red" as const },
};
