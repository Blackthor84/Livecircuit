"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  claimDailyLoginCoins,
  equipCoinItem,
  processReferralForUser,
  purchaseShopItem,
} from "@/lib/services/coins.service";
import { z } from "zod";

export type CoinActionResult = { ok: true } | { ok: false; error: string };

const purchaseSchema = z.object({ itemId: z.string().uuid() });
const equipSchema = z.object({ itemId: z.string().uuid() });

export async function claimDailyCoinsAction(): Promise<CoinActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Coins require Supabase" };

  const admin = getSupabaseAdmin();
  const result = await claimDailyLoginCoins(admin, user.id);
  if (!result.ok) return result;

  revalidatePath("/coins");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function purchaseCoinShopItemAction(input: unknown): Promise<CoinActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid item" };

  const admin = getSupabaseAdmin();
  const result = await purchaseShopItem(admin, user.id, parsed.data.itemId);
  if (!result.ok) return result;

  revalidatePath("/coins");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function equipCoinShopItemAction(input: unknown): Promise<CoinActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const parsed = equipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid item" };

  const admin = getSupabaseAdmin();
  const result = await equipCoinItem(admin, user.id, parsed.data.itemId);
  if (!result.ok) return result;

  revalidatePath("/coins");
  return { ok: true };
}

const REFERRAL_COOKIE = "lc_ref";

export async function stashReferralCodeAction(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  const jar = await cookies();
  jar.set(REFERRAL_COOKIE, normalized, {
    maxAge: 60 * 60 * 24 * 14,
    path: "/",
    sameSite: "lax",
  });
}

export async function applyPendingReferralAction(userId: string) {
  if (!isSupabaseConfigured()) return;
  const jar = await cookies();
  const code = jar.get(REFERRAL_COOKIE)?.value;
  if (!code) return;

  const admin = getSupabaseAdmin();
  await processReferralForUser(admin, userId, code);
  jar.delete(REFERRAL_COOKIE);
}
