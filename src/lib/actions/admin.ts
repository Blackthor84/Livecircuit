"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createNotification } from "@/lib/services/notifications.service";
import { processOrderRefund } from "@/lib/services/refund.service";
import {
  refundOrderSchema,
  reviewVerificationSchema,
  updateReportSchema,
} from "@/lib/validations/admin";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const profile = await requireRole([...ADMIN_ROLES]);
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

  const result = await processOrderRefund(ctx.supabase, {
    orderId: parsed.data.orderId,
    createStripeRefund: true,
    reason: parsed.data.reason ?? null,
    adminId: ctx.adminId,
    notifyUser: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}
