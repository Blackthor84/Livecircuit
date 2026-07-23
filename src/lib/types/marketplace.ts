export type CreatorPortfolioItem = {
  id: string;
  title: string;
  description: string;
  mediaUrl: string | null;
};

export type CreatorListing = {
  userId: string;
  slug: string;
  displayName: string;
  avatarUrl: string | null;
  headline: string;
  bio: string;
  primaryCategory: string;
  secondaryCategories: string[];
  rateCents: number;
  currency: string;
  averageRating: number;
  reviewCount: number;
};

export type MarketplaceReview = {
  id: string;
  rating: number;
  body: string | null;
  reviewerName: string;
  createdAt: string;
};

export type CreatorProfileDetail = CreatorListing & {
  portfolio: CreatorPortfolioItem[];
  reviews: MarketplaceReview[];
};

export type MarketplaceBookingSummary = {
  id: string;
  title: string;
  serviceCategory: string;
  status: string;
  agreedPriceCents: number | null;
  currency: string;
  counterpartyName: string;
  role: "artist" | "creator";
  createdAt: string;
  paidAt: string | null;
};

export type MarketplaceHubReport = {
  featured: CreatorListing[];
  byCategory: Record<string, CreatorListing[]>;
  categories: { value: string; label: string; count: number }[];
  computedAt: string;
};

export type BookingDetail = {
  id: string;
  title: string;
  brief: string;
  serviceCategory: string;
  status: string;
  agreedPriceCents: number | null;
  currency: string;
  artistUserId: string;
  creatorUserId: string;
  artistName: string;
  creatorName: string;
  creatorSlug: string;
  canPay: boolean;
  canReview: boolean;
  hasReview: boolean;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
};
