import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminNotificationCategory =
  | "pricing_change"
  | "pricing_fail"
  | "coupon_expiration"
  | "promotion_expiration"
  | "rule_conflict"
  | "stripe_webhook_fail"
  | "payment_fail"
  | "refund_request"
  | "chargeback"
  | "feature_flag_change"
  | "sponsor_request"
  | "approval_request"
  | "revenue_alert"
  | "marketing_wallet"
  | "scheduled_pricing"
  | "scheduled_pricing_fail";

export type AdminNotificationInput = {
  category: AdminNotificationCategory | string;
  title: string;
  message: string;
  severity?: "info" | "warning" | "error" | "success";
  entityKey?: string;
  priority?: "low" | "normal" | "high" | "urgent";
};

export async function createAdminNotification(
  supabase: SupabaseClient,
  input: AdminNotificationInput
) {
  await supabase.from("monetization_admin_notifications").insert({
    category: input.category,
    title: input.title,
    message: input.message,
    severity: input.severity ?? "info",
    entity_key: input.entityKey ?? null,
    priority: input.priority ?? "normal",
  });
}

export async function listAdminNotifications(
  supabase: SupabaseClient,
  opts: {
    limit?: number;
    unreadOnly?: boolean;
    category?: string;
    includeArchived?: boolean;
    search?: string;
  } = {}
) {
  let query = supabase
    .from("monetization_admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.unreadOnly) query = query.eq("is_read", false);
  if (!opts.includeArchived) query = query.eq("is_archived", false);
  if (opts.category) query = query.eq("category", opts.category);
  if (opts.search) {
    query = query.or(`title.ilike.%${opts.search}%,message.ilike.%${opts.search}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapNotification);
}

function mapNotification(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    category: row.category as string,
    title: row.title as string,
    message: row.message as string,
    severity: row.severity as string,
    entityKey: (row.entity_key as string) ?? null,
    isRead: Boolean(row.is_read),
    isArchived: Boolean(row.is_archived),
    priority: (row.priority as string) ?? "normal",
    createdAt: row.created_at as string,
  };
}

export async function markNotificationRead(supabase: SupabaseClient, id: string) {
  await supabase.from("monetization_admin_notifications").update({ is_read: true }).eq("id", id);
}

export async function archiveNotification(supabase: SupabaseClient, id: string) {
  await supabase
    .from("monetization_admin_notifications")
    .update({ is_archived: true, is_read: true })
    .eq("id", id);
}

export async function getNotificationStats(supabase: SupabaseClient) {
  const { count: unread } = await supabase
    .from("monetization_admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false)
    .eq("is_archived", false);

  const { count: urgent } = await supabase
    .from("monetization_admin_notifications")
    .select("id", { count: "exact", head: true })
    .eq("priority", "urgent")
    .eq("is_read", false)
    .eq("is_archived", false);

  return { unread: unread ?? 0, urgent: urgent ?? 0 };
}
