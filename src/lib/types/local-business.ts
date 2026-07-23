export type LocalBusinessSummary = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  websiteUrl: string | null;
  city: string | null;
  logoUrl: string | null;
  isFeatured?: boolean;
};

export type LocalBusinessCoupon = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountLabel: string;
  expiresAt: string | null;
  remaining: number | null;
  redeemedByUser: boolean;
};

export type LocalBusinessDetail = LocalBusinessSummary & {
  addressLine: string | null;
  phone: string | null;
  venues: { slug: string; name: string; isFeatured: boolean }[];
  coupons: LocalBusinessCoupon[];
  activeCampaigns: { type: string; label: string }[];
};

export type LocalBusinessHubReport = {
  featured: LocalBusinessSummary[];
  byCategory: Record<string, LocalBusinessSummary[]>;
  categories: { value: string; label: string; count: number }[];
  computedAt: string;
};

export type LocalBusinessDashboardReport = {
  business: LocalBusinessDetail | null;
  analytics: {
    impressions: number;
    clicks: number;
    couponRedemptions: number;
    activeCampaigns: number;
  };
  campaigns: {
    id: string;
    type: string;
    status: string;
    priceCents: number;
    impressionCount: number;
    clickCount: number;
    startsAt: string | null;
    endsAt: string | null;
  }[];
  redemptions: {
    couponTitle: string;
    userDisplay: string;
    redeemedAt: string;
  }[];
};

export type VenueLocalBusinessReport = {
  venueSlug: string;
  venueName: string;
  businesses: LocalBusinessSummary[];
};
