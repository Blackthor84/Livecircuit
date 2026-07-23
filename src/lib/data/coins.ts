import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getAppUrl } from "@/lib/config/env";
import { buildCoinsHubReport } from "@/lib/services/coins.service";
import { COIN_EARN_GUIDE } from "@/lib/services/coins-rewards";
import type { CoinsHubReport } from "@/lib/types/coins";

function demoReport(userId: string): CoinsHubReport {
  const appUrl = getAppUrl();
  return {
    balance: 420,
    lifetimeEarned: 680,
    lifetimeSpent: 260,
    dailyClaimAvailable: true,
    referralCode: "DEMOFAN001",
    referralLink: `${appUrl}/register?ref=DEMOFAN001`,
    recentTransactions: [
      {
        id: "tx-1",
        amount: 25,
        category: "daily_login",
        description: "Daily login bonus",
        createdAt: new Date().toISOString(),
      },
      {
        id: "tx-2",
        amount: 50,
        category: "achievement",
        description: "Passport achievement: first_concert",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    shop: [
      {
        id: "shop-1",
        slug: "avatar-neon-ring",
        category: "avatar",
        name: "Neon ring",
        description: "Pulsing ring around your avatar.",
        priceCoins: 250,
        imageUrl: null,
        owned: true,
        equipped: true,
      },
      {
        id: "shop-2",
        slug: "theme-aurora",
        category: "theme",
        name: "Aurora theme",
        description: "Northern-lights gradient profile styling.",
        priceCoins: 550,
        imageUrl: null,
        owned: false,
        equipped: false,
      },
    ],
    equipped: { avatar: "Neon ring" },
    earnGuide: COIN_EARN_GUIDE,
    computedAt: new Date().toISOString(),
  };
}

export async function getCoinsHubReport(userId: string): Promise<CoinsHubReport> {
  if (!isSupabaseConfigured()) return demoReport(userId);
  const supabase = await createClient();
  return buildCoinsHubReport(supabase, userId);
}

export async function getCoinBalance(userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return demoReport(userId).balance;
  const supabase = await createClient();
  const { data } = await supabase.from("coin_wallets").select("balance").eq("user_id", userId).maybeSingle();
  return (data?.balance as number) ?? 0;
}
