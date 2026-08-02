"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export type PricingActionResult = { ok: true } | { ok: false; error: string };

const tierSchema = z.object({
  community: z.number().min(0),
  club: z.number().min(0),
  theater: z.number().min(0),
  arena: z.number().min(0),
});

export async function updatePlatformPricingAction(input: unknown): Promise<PricingActionResult> {
  await requireAdmin("/admin/pricing");

  const parsed = z.object({
    bookingFees: tierSchema,
    platformFeePercent: z.number().min(0).max(100),
    paymentProcessingRatePercent: z.number().min(0).max(100),
    paymentProcessingFixedCents: z.number().int().min(0),
    stadiumRequiresApproval: z.boolean(),
  }).safeParse(input);

  if (!parsed.success) return { ok: false, error: "Invalid pricing configuration" };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  const { error } = await supabase.from("platform_pricing_config").update({
    booking_fees: parsed.data.bookingFees,
    platform_fee_percent: parsed.data.platformFeePercent,
    payment_processing_rate_percent: parsed.data.paymentProcessingRatePercent,
    payment_processing_fixed_cents: parsed.data.paymentProcessingFixedCents,
    stadium_requires_approval: parsed.data.stadiumRequiresApproval,
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null,
  }).eq("id", "default");

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/pricing");
  revalidatePath("/creator-promise");
  revalidatePath("/");
  return { ok: true };
}
