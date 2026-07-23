import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  COIN_EARN_GUIDE,
  COIN_REWARDS,
  referralCodeFromUserId,
  utcDateKey,
} from "@/lib/services/coins-rewards";
import type { CoinShopItem, CoinsHubReport } from "@/lib/types/coins";

type EquipSlot = "avatar" | "theme" | "animation" | "badge" | "profile" | "reaction";

const EQUIP_SLOTS: EquipSlot[] = ["avatar", "theme", "animation", "badge", "profile", "reaction"];

function slotForCategory(category: string): EquipSlot | null {
  if (category === "reaction") return "reaction";
  if (EQUIP_SLOTS.includes(category as EquipSlot)) return category as EquipSlot;
  return null;
}

async function ensureWallet(admin: SupabaseClient, userId: string) {
  await admin.from("coin_wallets").upsert({ user_id: userId }, { onConflict: "user_id" });
}

export async function ensureReferralCode(admin: SupabaseClient, userId: string): Promise<string> {
  const { data: existing } = await admin
    .from("coin_referral_codes")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.code) return existing.code as string;

  let code = referralCodeFromUserId(userId);
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await admin.from("coin_referral_codes").select("user_id").eq("code", code).maybeSingle();
    if (!clash) break;
    code = `${code.slice(0, 6)}${Math.floor(Math.random() * 89 + 10)}`;
  }

  await admin.from("coin_referral_codes").upsert({ user_id: userId, code }, { onConflict: "user_id" });
  return code;
}

export async function applyCoinCredit(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  category: string,
  sourceKey: string,
  description: string
): Promise<boolean> {
  if (amount <= 0) return false;
  await ensureWallet(admin, userId);

  const { error: txError } = await admin.from("coin_transactions").insert({
    user_id: userId,
    amount,
    category,
    source_key: sourceKey,
    description,
  });

  if (txError?.code === "23505") return false;
  if (txError) return false;

  const { data: wallet } = await admin.from("coin_wallets").select("balance, lifetime_earned").eq("user_id", userId).single();
  await admin
    .from("coin_wallets")
    .update({
      balance: (wallet?.balance as number) + amount,
      lifetime_earned: (wallet?.lifetime_earned as number) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return true;
}

export async function applyCoinDebit(
  admin: SupabaseClient,
  userId: string,
  amount: number,
  category: string,
  sourceKey: string,
  description: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: "Invalid amount" };
  await ensureWallet(admin, userId);

  const { data: wallet } = await admin.from("coin_wallets").select("balance, lifetime_spent").eq("user_id", userId).single();
  const balance = (wallet?.balance as number) ?? 0;
  if (balance < amount) return { ok: false, error: "Not enough coins" };

  const { error: txError } = await admin.from("coin_transactions").insert({
    user_id: userId,
    amount: -amount,
    category,
    source_key: sourceKey,
    description,
  });

  if (txError?.code === "23505") return { ok: false, error: "Already purchased" };
  if (txError) return { ok: false, error: txError.message };

  await admin
    .from("coin_wallets")
    .update({
      balance: balance - amount,
      lifetime_spent: ((wallet?.lifetime_spent as number) ?? 0) + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { ok: true };
}

export async function syncPassiveCoinEarnings(admin: SupabaseClient, userId: string) {
  const [{ data: achievements }, { data: seasonBadges }, { data: friendships }] = await Promise.all([
    admin.from("fan_passport_user_achievements").select("achievement_slug, earned_at").eq("user_id", userId),
    admin.from("user_season_badges").select("badge_id, earned_at").eq("user_id", userId),
    admin
      .from("friendships")
      .select("id, requester_id, addressee_id, status, responded_at")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);

  for (const row of achievements ?? []) {
    await applyCoinCredit(
      admin,
      userId,
      COIN_REWARDS.achievement,
      "achievement",
      `achievement:${row.achievement_slug as string}`,
      `Passport achievement: ${row.achievement_slug as string}`
    );
  }

  for (const row of seasonBadges ?? []) {
    await applyCoinCredit(
      admin,
      userId,
      COIN_REWARDS.seasonBadge,
      "season_reward",
      `season_badge:${row.badge_id as string}`,
      "Season badge reward"
    );
  }

  for (const row of friendships ?? []) {
    const other =
      row.requester_id === userId ? (row.addressee_id as string) : (row.requester_id as string);
    const pairKey = [userId, other].sort().join(":");
    await applyCoinCredit(
      admin,
      userId,
      COIN_REWARDS.friendConnected,
      "friend_invite",
      `friend_link:${pairKey}`,
      "Connected with a friend"
    );
  }
}

export async function creditCoinsForWatch(admin: SupabaseClient, userId: string, ticketId: string) {
  return applyCoinCredit(
    admin,
    userId,
    COIN_REWARDS.watchShow,
    "watching",
    `watch:ticket:${ticketId}`,
    "Checked in to a live show"
  );
}

export async function creditCoinsForReview(admin: SupabaseClient, userId: string, venueId: string) {
  return applyCoinCredit(
    admin,
    userId,
    COIN_REWARDS.review,
    "review",
    `review:venue:${venueId}`,
    "Left a venue review"
  );
}

export async function processReferralForUser(admin: SupabaseClient, referredUserId: string, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;

  const { data: existing } = await admin
    .from("coin_referral_redemptions")
    .select("referred_user_id")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();
  if (existing) return;

  const { data: refRow } = await admin
    .from("coin_referral_codes")
    .select("user_id, code")
    .eq("code", normalized)
    .maybeSingle();
  if (!refRow || refRow.user_id === referredUserId) return;

  await admin.from("coin_referral_redemptions").insert({
    referred_user_id: referredUserId,
    referrer_id: refRow.user_id,
    code: normalized,
  });

  await applyCoinCredit(
    admin,
    refRow.user_id as string,
    COIN_REWARDS.referralReferrer,
    "referral",
    `referral:referred:${referredUserId}`,
    "Friend joined via your invite"
  );
  await applyCoinCredit(
    admin,
    referredUserId,
    COIN_REWARDS.referralReferred,
    "referral",
    `referral:signup:${normalized}`,
    "Welcome bonus from referral"
  );
}

export async function claimDailyLoginCoins(admin: SupabaseClient, userId: string) {
  const today = utcDateKey();
  const { error } = await admin.from("coin_daily_claims").insert({ user_id: userId, claim_date: today });
  if (error?.code === "23505") return { ok: false as const, error: "Already claimed today" };
  if (error) return { ok: false as const, error: error.message };

  const applied = await applyCoinCredit(
    admin,
    userId,
    COIN_REWARDS.dailyLogin,
    "daily_login",
    `daily:${today}`,
    "Daily login bonus"
  );
  if (!applied) {
    await admin.from("coin_daily_claims").delete().eq("user_id", userId).eq("claim_date", today);
    return { ok: false as const, error: "Could not grant coins" };
  }
  return { ok: true as const };
}

export async function buildCoinsHubReport(
  supabase: SupabaseClient,
  userId: string
): Promise<CoinsHubReport> {
  const admin = getSupabaseAdmin();
  await ensureWallet(admin, userId);
  await syncPassiveCoinEarnings(admin, userId);

  const referralCode = await ensureReferralCode(admin, userId);
  const appUrl = getAppUrl();

  const today = utcDateKey();
  const [{ data: wallet }, { data: daily }, { data: txRows }, { data: catalog }, { data: inventory }, { data: equipment }] =
    await Promise.all([
      supabase.from("coin_wallets").select("balance, lifetime_earned, lifetime_spent").eq("user_id", userId).maybeSingle(),
      supabase.from("coin_daily_claims").select("claim_date").eq("user_id", userId).eq("claim_date", today).maybeSingle(),
      supabase
        .from("coin_transactions")
        .select("id, amount, category, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("coin_shop_items").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("user_coin_inventory").select("item_id").eq("user_id", userId),
      supabase.from("user_coin_equipment").select("slot, item_id").eq("user_id", userId),
    ]);

  const owned = new Set((inventory ?? []).map((r) => r.item_id as string));
  const equippedByItem = new Map((equipment ?? []).map((r) => [r.item_id as string, r.slot as string]));
  const equipped: CoinsHubReport["equipped"] = {};
  for (const row of equipment ?? []) {
    const slot = row.slot as EquipSlot;
    const item = (catalog ?? []).find((c) => c.id === row.item_id);
    if (item) equipped[slot] = item.name as string;
  }

  const shop: CoinShopItem[] = (catalog ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    category: row.category as CoinShopItem["category"],
    name: row.name as string,
    description: row.description as string,
    priceCoins: row.price_coins as number,
    imageUrl: (row.image_url as string | null) ?? null,
    owned: owned.has(row.id as string),
    equipped: equippedByItem.has(row.id as string),
  }));

  return {
    balance: (wallet?.balance as number) ?? 0,
    lifetimeEarned: (wallet?.lifetime_earned as number) ?? 0,
    lifetimeSpent: (wallet?.lifetime_spent as number) ?? 0,
    dailyClaimAvailable: !daily,
    referralCode,
    referralLink: `${appUrl}/register?ref=${referralCode}`,
    recentTransactions: (txRows ?? []).map((r) => ({
      id: r.id as string,
      amount: r.amount as number,
      category: r.category as string,
      description: r.description as string,
      createdAt: r.created_at as string,
    })),
    shop,
    equipped,
    earnGuide: COIN_EARN_GUIDE,
    computedAt: new Date().toISOString(),
  };
}

export async function purchaseShopItem(admin: SupabaseClient, userId: string, itemId: string) {
  const { data: item } = await admin
    .from("coin_shop_items")
    .select("id, name, price_coins, category, is_active")
    .eq("id", itemId)
    .maybeSingle();
  if (!item?.is_active) return { ok: false as const, error: "Item not available" };

  const { data: owned } = await admin
    .from("user_coin_inventory")
    .select("id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (owned) return { ok: false as const, error: "Already owned" };

  const price = item.price_coins as number;
  const debit = await applyCoinDebit(
    admin,
    userId,
    price,
    "shop_purchase",
    `purchase:${itemId}`,
    `Purchased ${item.name as string}`
  );
  if (!debit.ok) return debit;

  const { error: invError } = await admin.from("user_coin_inventory").insert({
    user_id: userId,
    item_id: itemId,
  });
  if (invError) return { ok: false as const, error: invError.message };

  const slot = slotForCategory(item.category as string);
  if (slot) {
    await admin.from("user_coin_equipment").upsert(
      { user_id: userId, slot, item_id: itemId },
      { onConflict: "user_id,slot" }
    );
  }

  return { ok: true as const };
}

export async function equipCoinItem(admin: SupabaseClient, userId: string, itemId: string) {
  const { data: inv } = await admin
    .from("user_coin_inventory")
    .select("item_id")
    .eq("user_id", userId)
    .eq("item_id", itemId)
    .maybeSingle();
  if (!inv) return { ok: false as const, error: "Not in inventory" };

  const { data: item } = await admin.from("coin_shop_items").select("category").eq("id", itemId).maybeSingle();
  const slot = slotForCategory((item?.category as string) ?? "");
  if (!slot) return { ok: false as const, error: "This item is not equippable" };

  await admin.from("user_coin_equipment").upsert(
    { user_id: userId, slot, item_id: itemId },
    { onConflict: "user_id,slot" }
  );
  return { ok: true as const };
}
