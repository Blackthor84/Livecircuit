export const ACHIEVEMENT_CATEGORIES = [
  { value: "attendance", label: "Attendance", blurb: "Shows attended across the circuit." },
  { value: "vip", label: "VIP", blurb: "Premium experiences and backstage access." },
  { value: "friends", label: "Friends", blurb: "Your social graph on LiveCircuit." },
  { value: "reviews", label: "Reviews", blurb: "Feedback you share with artists and fans." },
  { value: "tips", label: "Tips", blurb: "Support for performers you love." },
  { value: "merch", label: "Merch", blurb: "Tour gear and artist drops." },
  { value: "festivals", label: "Festivals", blurb: "Multi-venue festival passes." },
  { value: "venues", label: "Venues", blurb: "Venues explored on the map." },
  { value: "countries", label: "Countries", blurb: "Global passport stamps." },
  { value: "genres", label: "Genres", blurb: "Music, comedy, podcasts, and more." },
  { value: "seasons", label: "Seasons", blurb: "Seasonal leaderboard progress." },
  { value: "marketplace", label: "Creator Marketplace", blurb: "Hiring creators for your show." },
  { value: "sponsors", label: "Sponsors & Venues", blurb: "Concourse check-ins and venue loyalty." },
  { value: "passport", label: "Passport", blurb: "Fan Passport milestone crossovers." },
  { value: "coins", label: "LiveCircuit Coins", blurb: "Virtual currency earned on the circuit." },
] as const;

export type LivecircuitAchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]["value"];

export function achievementCategoryLabel(category: string): string {
  return ACHIEVEMENT_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export function achievementCategoryBlurb(category: string): string {
  return ACHIEVEMENT_CATEGORIES.find((c) => c.value === category)?.blurb ?? "";
}
