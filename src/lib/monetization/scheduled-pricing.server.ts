import "server-only";

import { revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MONETIZATION_CACHE_TAG } from "@/lib/monetization/pricing-resolver.server";
import { BUSINESS_RULES_CACHE_TAG } from "@/lib/business-rules/rules-resolver.server";

export type ScheduledPricingPublishResult = {
  published: number;
  expired: number;
  errors: string[];
};

async function notifyAdmin(category: string, title: string, message: string, entityKey?: string) {
  const admin = getSupabaseAdmin();
  await admin.from("monetization_admin_notifications").insert({
    category,
    title,
    message,
    entity_key: entityKey ?? null,
    severity: category.includes("fail") ? "error" : "info",
  });
}

export async function publishScheduledPricing(): Promise<ScheduledPricingPublishResult> {
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const result: ScheduledPricingPublishResult = { published: 0, expired: 0, errors: [] };

  const { data: due } = await admin
    .from("monetization_scheduled_pricing")
    .select("*")
    .eq("status", "scheduled")
    .lte("effective_at", now);

  for (const row of due ?? []) {
    try {
      const changes = row.changes as Record<string, unknown>;
      const category = row.category as string;
      const entityKey = row.entity_key as string;

      if (category === "venue") {
        await admin.from("monetization_venue_tiers").update({
          ...changes,
          scheduled_fee_cents: null,
          scheduled_effective_at: null,
          updated_at: now,
        }).eq("tier_id", entityKey);
      } else if (category === "agency") {
        await admin.from("monetization_agency_plans").update({
          ...changes,
          scheduled_price_cents: null,
          scheduled_effective_at: null,
          updated_at: now,
        }).eq("plan_id", entityKey);
      } else if (category === "ticket") {
        await admin.from("monetization_ticket_config").update({ ...changes, updated_at: now }).eq("id", "default");
      }

      await admin.from("monetization_scheduled_pricing").update({ status: "published" }).eq("id", row.id);

      await admin.from("monetization_pricing_history").insert({
        category,
        entity_key: entityKey,
        field_name: "scheduled_publish",
        old_value: null,
        new_value: changes,
        reason: "Automatic scheduled pricing activation",
      });

      result.published++;
      await notifyAdmin(
        "scheduled_pricing",
        "Scheduled pricing activated",
        `${category}/${entityKey} pricing updated automatically`,
        entityKey
      );
    } catch (e) {
      result.errors.push(String(e));
      await notifyAdmin("scheduled_pricing_fail", "Scheduled pricing failed", String(e), row.id as string);
    }
  }

  // Deactivate expired coupons
  const { data: expiredCoupons } = await admin
    .from("monetization_coupons")
    .select("id, code")
    .eq("is_active", true)
    .lt("expires_at", now);

  for (const c of expiredCoupons ?? []) {
    await admin.from("monetization_coupons").update({ is_active: false }).eq("id", c.id);
    result.expired++;
    await notifyAdmin("coupon_expired", "Coupon expired", `Coupon ${c.code} has been deactivated`, c.id as string);
  }

  if (result.published > 0 || result.expired > 0) {
    revalidateTag(MONETIZATION_CACHE_TAG, "max");
    revalidateTag(BUSINESS_RULES_CACHE_TAG, "max");
  }

  return result;
}
