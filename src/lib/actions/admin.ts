"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured, isSupabaseConfigured } from "@/lib/config/env";
import { createNotification } from "@/lib/services/notifications.service";
import { getStripe } from "@/lib/stripe/server";
import {
  refundOrderSchema,
  reviewVerificationSchema,
  updateReportSchema,
} from "@/lib/validations/admin";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await requireRole(["admin"]);
  if (!profile) return { ok: false as const, error: "Admin access required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };
  const supabase = await createClient();
  return { ok: true as const, supabase, adminId: profile.id };
}

export async function reviewVerificationAction(input: unknown): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = reviewVerificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: request } = await ctx.supabase
    .from("verification_requests")
    .select("id, artist_id, status, artists(user_id, stage_name, slug)")
    .eq("id", parsed.data.requestId)
    .maybeSingle();

  if (!request || request.status !== "pending") {
    return { ok: false, error: "Request not found or already reviewed" };
  }

  const { error: updateError } = await ctx.supabase
    .from("verification_requests")
    .update({
      status: parsed.data.decision,
      admin_notes: parsed.data.adminNotes?.trim() || null,
    })
    .eq("id", parsed.data.requestId);

  if (updateError) return { ok: false, error: updateError.message };

  const artistUpdate: Record<string, unknown> = {
    verified: parsed.data.decision === "approved",
  };
  if (parsed.data.featureOnDiscover != null) {
    artistUpdate.featured = parsed.data.featureOnDiscover;
  }

  await ctx.supabase.from("artists").update(artistUpdate).eq("id", request.artist_id);

  const artists = request.artists as
    | { user_id: string; stage_name: string; slug: string }
    | { user_id: string; stage_name: string; slug: string }[];
  const artistMeta = Array.isArray(artists) ? artists[0] : artists;
  if (artistMeta?.user_id) {
    await createNotification({
      userId: artistMeta.user_id,
      type: "system",
      title:
        parsed.data.decision === "approved"
          ? "Verification approved"
          : "Verification not approved",
      body:
        parsed.data.decision === "approved"
          ? "Your artist badge is now visible on LiveCircuit."
          : parsed.data.adminNotes ?? "See admin notes in artist settings.",
      link: "/artist/settings",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/discover");
  if (artistMeta?.slug) revalidatePath(`/artists/${artistMeta.slug}`);
  return { ok: true };
}

export async function updateReportAction(input: unknown): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = updateReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { error } = await ctx.supabase
    .from("reports")
    .update({
      status: parsed.data.status,
      admin_notes: parsed.data.adminNotes?.trim() || null,
    })
    .eq("id", parsed.data.reportId);

  if (error) return { ok: false, error: error.message };

  if (parsed.data.status === "resolved") {
    const { data: report } = await ctx.supabase
      .from("reports")
      .select("message_id")
      .eq("id", parsed.data.reportId)
      .maybeSingle();

    if (report?.message_id) {
      await ctx.supabase
        .from("chat_messages")
        .update({ is_deleted: true })
        .eq("id", report.message_id);

      await ctx.supabase.from("moderation_logs").insert({
        admin_id: ctx.adminId,
        message_id: report.message_id,
        action: "delete_message",
        reason: parsed.data.adminNotes ?? "Resolved report",
      });
    }
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function refundOrderAction(input: unknown): Promise<AdminActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = refundOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { data: order } = await ctx.supabase
    .from("orders")
    .select("id, user_id, status, stripe_payment_intent_id, order_type, metadata")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order) return { ok: false, error: "Order not found" };
  if (order.status !== "paid") return { ok: false, error: "Only paid orders can be refunded" };

  const paymentIntent = order.stripe_payment_intent_id as string | null;
  if (!paymentIntent) {
    return { ok: false, error: "No Stripe payment on this order" };
  }

  if (!isStripeConfigured()) {
    return { ok: false, error: "Stripe is not configured" };
  }

  try {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: paymentIntent,
      reason: "requested_by_customer",
      metadata: {
        order_id: order.id as string,
        admin_id: ctx.adminId,
        note: parsed.data.reason ?? "",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe refund failed";
    return { ok: false, error: message };
  }

  const existingMeta = (order.metadata as Record<string, unknown>) ?? {};
  await ctx.supabase
    .from("orders")
    .update({
      status: "refunded",
      metadata: {
        ...existingMeta,
        refunded_at: new Date().toISOString(),
        refund_reason: parsed.data.reason ?? null,
        refunded_by: ctx.adminId,
      },
    })
    .eq("id", order.id);

  if (order.order_type === "ticket") {
    await ctx.supabase.from("tickets").delete().eq("order_id", order.id);
  }

  await createNotification({
    userId: order.user_id as string,
    type: "system",
    title: "Refund processed",
    body: "Your payment has been refunded. It may take several days to appear on your statement.",
    link: "/dashboard",
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}
