export type CoinShopCategory =
  | "avatar"
  | "theme"
  | "animation"
  | "badge"
  | "profile"
  | "venue_collectible"
  | "digital_merch"
  | "reaction";

export type CoinTransactionItem = {
  id: string;
  amount: number;
  category: string;
  description: string;
  createdAt: string;
};

export type CoinShopItem = {
  id: string;
  slug: string;
  category: CoinShopCategory;
  name: string;
  description: string;
  priceCoins: number;
  imageUrl: string | null;
  owned: boolean;
  equipped: boolean;
};

export type CoinEarnSource = {
  key: string;
  label: string;
  amount: number;
  description: string;
};

export type CoinsHubReport = {
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  dailyClaimAvailable: boolean;
  referralCode: string;
  referralLink: string;
  recentTransactions: CoinTransactionItem[];
  shop: CoinShopItem[];
  equipped: Partial<Record<"avatar" | "theme" | "animation" | "badge" | "profile" | "reaction", string>>;
  earnGuide: CoinEarnSource[];
  computedAt: string;
};
