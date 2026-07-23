export const COIN_REWARDS = {
  dailyLogin: 25,
  watchShow: 15,
  review: 20,
  achievement: 50,
  seasonBadge: 75,
  referralReferrer: 100,
  referralReferred: 50,
  friendConnected: 30,
} as const;

export const COIN_EARN_GUIDE: { key: string; label: string; amount: number; description: string }[] = [
  { key: "daily_login", label: "Daily login", amount: COIN_REWARDS.dailyLogin, description: "Claim once per day on the Coins page." },
  { key: "watching", label: "Watching live", amount: COIN_REWARDS.watchShow, description: "Check in at a show with your ticket QR." },
  { key: "review", label: "Venue reviews", amount: COIN_REWARDS.review, description: "Leave your first review on a venue community page." },
  { key: "achievement", label: "Passport achievements", amount: COIN_REWARDS.achievement, description: "Unlock Fan Passport achievements." },
  { key: "season", label: "Season badges", amount: COIN_REWARDS.seasonBadge, description: "Earn seasonal badges during active seasons." },
  { key: "referral", label: "Referrals", amount: COIN_REWARDS.referralReferrer, description: "Invite friends with your referral link." },
  { key: "friends", label: "Friend connections", amount: COIN_REWARDS.friendConnected, description: "Connect with a new friend on LiveCircuit." },
];

export function utcDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function referralCodeFromUserId(userId: string) {
  return userId.replace(/-/g, "").slice(0, 10).toUpperCase();
}
