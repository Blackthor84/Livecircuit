export const LOCAL_BUSINESS_CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "coffee", label: "Coffee shop" },
  { value: "parking", label: "Parking" },
  { value: "museum", label: "Museum" },
  { value: "tourism", label: "Tourism" },
  { value: "attraction", label: "Local attraction" },
] as const;

export type LocalBusinessCategory = (typeof LOCAL_BUSINESS_CATEGORIES)[number]["value"];

export const LOCAL_BUSINESS_CAMPAIGNS = [
  {
    type: "featured_listing",
    label: "Featured listing",
    description: "Priority placement in venue and city guides.",
    priceCents: 9900,
  },
  {
    type: "coupon_boost",
    label: "Coupon boost",
    description: "Highlight your offers to fans checking in nearby.",
    priceCents: 4900,
  },
  {
    type: "venue_ad",
    label: "Venue ad",
    description: "Banner placement on a venue concourse and local page.",
    priceCents: 14900,
  },
  {
    type: "festival_sponsor",
    label: "Festival sponsorship",
    description: "Associate your brand with a virtual festival weekend.",
    priceCents: 29900,
  },
  {
    type: "homepage_promo",
    label: "Homepage promotion",
    description: "Rotating spotlight on LiveCircuit discover surfaces.",
    priceCents: 19900,
  },
] as const;

export type LocalBusinessCampaignType = (typeof LOCAL_BUSINESS_CAMPAIGNS)[number]["type"];

export function localBusinessCategoryLabel(value: string) {
  return LOCAL_BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function localCampaignLabel(type: string) {
  return LOCAL_BUSINESS_CAMPAIGNS.find((c) => c.type === type)?.label ?? type;
}

export function localCampaignPrice(type: string) {
  return LOCAL_BUSINESS_CAMPAIGNS.find((c) => c.type === type)?.priceCents ?? 0;
}
