"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { recordFestivalPassPurchase } from "@/lib/services/virtual-festivals.service";

export async function purchaseFestivalPassAction(tierId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };

  if (!isSupabaseConfigured()) {
    return { ok: true as const, checkoutUrl: null as string | null };
  }

  const supabase = await createClient();
  const { data: tier } = await supabase
    .from("festival_pass_tiers")
    .select("id, price_cents, virtual_festivals(slug)")
    .eq("id", tierId)
    .maybeSingle();

  if (!tier) return { ok: false as const, error: "Pass not found" };

  const price = tier.price_cents as number;
  const festivalRaw = tier.virtual_festivals as { slug: string } | { slug: string }[];
  const festivalSlug = Array.isArray(festivalRaw) ? festivalRaw[0]?.slug : festivalRaw?.slug;

  if (price <= 0) {
    const result = await recordFestivalPassPurchase(supabase, user.id, tierId, null);
    if (!result.ok) return result;
    revalidatePath("/festivals");
    if (festivalSlug) revalidatePath(`/festivals/${festivalSlug}`);
    return { ok: true as const, checkoutUrl: null };
  }

  return {
    ok: true as const,
    checkoutUrl: `/checkout?type=festival&festivalTier=${tierId}`,
  };
}
