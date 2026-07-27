export type FanJourneyStepId =
  | "discovery"
  | "event-page"
  | "ticket-purchase"
  | "email-confirmation"
  | "push-notification"
  | "entering-arena"
  | "pre-show"
  | "live-performance"
  | "fan-engagement"
  | "vip-experience"
  | "post-show"
  | "social-sharing"
  | "return-visit";

export const FAN_JOURNEY_STEPS_V4: {
  id: FanJourneyStepId;
  step: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  mockupLabels: string[];
  businessValue: string;
  narrationPlaceholder: string;
}[] = [
  {
    id: "discovery",
    step: 1,
    title: "Discovery",
    subtitle: "Fan discovers an event",
    description:
      "Your brand appears the moment a fan searches Google, browses LiveCircuit, or sees a trending event — before they ever click.",
    icon: "🔍",
    mockupLabels: ["Google Search", "LiveCircuit Home Page", "Trending Events", "Featured Carousel", "Search Results", "Social Media Ad"],
    businessValue: "Top-of-funnel reach — sponsor credit at the first moment of intent.",
    narrationPlaceholder: "Every journey begins with discovery. Your brand is there from the first search result.",
  },
  {
    id: "event-page",
    step: 2,
    title: "Event Page",
    subtitle: "Fan clicks the event",
    description: "Arena header, hero banner, sponsor logo, and event details frame the entire experience.",
    icon: "📄",
    mockupLabels: ["Arena Header", "Hero Banner", "Arena Name", "Sponsor Logo", "Event Information", "Upcoming Shows"],
    businessValue: "High-intent browsing — fans evaluating attendance see your brand throughout.",
    narrationPlaceholder: "On the event page, your logo and presenting sponsor credit build trust and recognition.",
  },
  {
    id: "ticket-purchase",
    step: 3,
    title: "Buying Tickets",
    subtitle: "Fan completes purchase",
    description: "Sponsor branding on checkout, seat selection, digital ticket, QR pass, and confirmation screen.",
    icon: "🎫",
    mockupLabels: ["Checkout Page", "Seat Selection", "Digital Ticket", "QR Code", "Confirmation Screen"],
    businessValue: "Conversion moment — your brand is associated with the purchase decision.",
    narrationPlaceholder: "At checkout, your brand accompanies every ticket — reinforcing the partnership at the point of sale.",
  },
  {
    id: "email-confirmation",
    step: 4,
    title: "Confirmation Email",
    subtitle: "Premium inbox experience",
    description: "Sponsor logo, arena name, event details, calendar button, and recommended events in one polished email.",
    icon: "✉️",
    mockupLabels: ["Sponsor Logo", "Arena Name", "Event Details", "Calendar Button", "Recommended Events"],
    businessValue: "Owned channel with 40%+ open rates — sustained brand exposure until showtime.",
    narrationPlaceholder: "The confirmation email keeps your brand top-of-mind until showtime.",
  },
  {
    id: "push-notification",
    step: 5,
    title: "Push Notification",
    subtitle: "Showtime reminder",
    description: "Mobile notification one hour before the show with your arena name and sponsor attribution.",
    icon: "🔔",
    mockupLabels: ["Lock Screen Alert", "Notification Center"],
    businessValue: "Timely, high-attention touchpoint driving attendance and brand recall.",
    narrationPlaceholder: "One hour before showtime, fans receive a reminder — with your name on it.",
  },
  {
    id: "entering-arena",
    step: 6,
    title: "Entering the Digital Arena",
    subtitle: "Cinematic welcome",
    description: "Animated doors open, the crowd enters, sponsor logo appears above the entrance, countdown begins.",
    icon: "🚪",
    mockupLabels: ["Arena Entrance", "Sponsor Logo", "Countdown Timer", "Welcome Animation"],
    businessValue: "The marquee moment — your brand welcomes every fan into the experience.",
    narrationPlaceholder: "The digital doors open. Your logo lights up above the entrance.",
  },
  {
    id: "pre-show",
    step: 7,
    title: "Pre-Show",
    subtitle: "Countdown and anticipation",
    description: "Countdown timer, sponsor animation, arena introduction, upcoming events, and featured sponsor video.",
    icon: "⏱️",
    mockupLabels: ["Countdown", "Sponsor Animation", "Arena Introduction", "Upcoming Events", "Sponsor Video"],
    businessValue: "Captive pre-show audience — full attention before the performance begins.",
    narrationPlaceholder: "During the countdown, your splash screen and featured content reach every waiting fan.",
  },
  {
    id: "live-performance",
    step: 8,
    title: "Live Event",
    subtitle: "The main event",
    description: "Stage LED screens, arena branding, livestream overlay, scoreboard, and lower-thirds with natural sponsor integration.",
    icon: "🎬",
    mockupLabels: ["Stage LEDs", "Arena Branding", "Livestream Overlay", "Scoreboard", "Lower Thirds"],
    businessValue: "Peak engagement — millions of concurrent impressions during the live stream.",
    narrationPlaceholder: "During the performance, your brand is on stage, on screen, and in every camera angle.",
  },
  {
    id: "fan-engagement",
    step: 9,
    title: "Fan Interaction",
    subtitle: "Interactive participation",
    description: "Live chat, emoji reactions, polls, trivia, virtual gifts, and pinned announcements — all with sponsor branding.",
    icon: "💬",
    mockupLabels: ["Live Chat", "Emoji Reactions", "Polls", "Trivia", "Virtual Gifts", "Pinned Announcements"],
    businessValue: "Active participation creates emotional association between your brand and the moment.",
    narrationPlaceholder: "Fans chat, react, and play along — with your brand woven into every interaction.",
  },
  {
    id: "vip-experience",
    step: 10,
    title: "VIP Experience",
    subtitle: "Premium fan tier",
    description: "VIP lounge, meet & greet, backstage access, exclusive sponsor offers, and premium lounge branding.",
    icon: "👑",
    mockupLabels: ["VIP Lounge", "Meet & Greet", "Backstage Access", "Exclusive Offers", "Lounge Branding"],
    businessValue: "Premium audience segment — high-value fans in a co-branded environment.",
    narrationPlaceholder: "VIP fans experience your brand in the lounge, backstage, and exclusive offers.",
  },
  {
    id: "post-show",
    step: 11,
    title: "Post Event",
    subtitle: "Thank you and next steps",
    description: "Thank you screen, rate event, upcoming events, recommended artists, and sponsor thank-you message.",
    icon: "🙏",
    mockupLabels: ["Thank You Screen", "Rate Event", "Upcoming Events", "Recommended Artists", "Sponsor Message"],
    businessValue: "Graceful close with lasting impression and pathways to the next event.",
    narrationPlaceholder: "After the show, fans see your thank-you message and recommendations for what's next.",
  },
  {
    id: "social-sharing",
    step: 12,
    title: "Social Sharing",
    subtitle: "Fan-generated content",
    description: "Instagram Story, TikTok, Facebook, LinkedIn, and X — each tagged with your arena and sponsor.",
    icon: "📱",
    mockupLabels: ["Instagram Story", "TikTok", "Facebook", "LinkedIn", "X"],
    businessValue: "Organic reach multiplier — fans become brand ambassadors on social platforms.",
    narrationPlaceholder: "Fans share clips and stories — each one credits your arena and your brand.",
  },
  {
    id: "return-visit",
    step: 13,
    title: "Return Visit",
    subtitle: "Cumulative exposure over time",
    description: "The same fan returns — comedy show, music festival, holiday event — and sponsor exposure compounds.",
    icon: "🔁",
    mockupLabels: ["One Week Later", "Next Month", "Music Festival", "Holiday Event"],
    businessValue: "Lifetime value — repeat attendance multiplies total brand impressions per fan.",
    narrationPlaceholder: "Weeks and months later, the same fan returns — and your cumulative exposure grows.",
  },
];

export const BRAND_IMPACT_METRICS = [
  { id: "fansReached", label: "Total Fans Reached" },
  { id: "digitalImpressions", label: "Digital Impressions" },
  { id: "livestreamViews", label: "Livestream Views" },
  { id: "emailOpens", label: "Email Opens" },
  { id: "pushNotifications", label: "Push Notifications" },
  { id: "ticketPurchases", label: "Ticket Purchases" },
  { id: "chatMessages", label: "Chat Messages" },
  { id: "socialShares", label: "Social Shares" },
  { id: "repeatVisitors", label: "Repeat Visitors" },
  { id: "brandRecall", label: "Brand Recall" },
] as const;

export const TRADITIONAL_ARENA_POINTS = [
  "Physical sign",
  "Local audience",
  "Limited analytics",
  "Passive exposure",
  "Difficult ROI tracking",
] as const;

export const LIVECIRCUIT_ARENA_POINTS = [
  "Discovery branding",
  "Event pages",
  "Ticket purchases",
  "Emails",
  "Push notifications",
  "Livestreams",
  "Interactive chat",
  "Social sharing",
  "Repeat visits",
  "Real-time analytics",
  "Measurable engagement",
] as const;
