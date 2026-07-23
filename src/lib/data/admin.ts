import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type VerificationQueueItem = {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  artist: {
    id: string;
    slug: string;
    stage_name: string;
    verified: boolean;
  };
};

export type ReportQueueItem = {
  id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: { display_name: string | null } | null;
  reported_user: { display_name: string | null } | null;
  message_id: string | null;
};

export type RefundableOrderItem = {
  id: string;
  order_type: string;
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  stripe_payment_intent_id: string | null;
  user_id: string;
  buyerLabel: string;
};

export async function getAdminDashboardData() {
  if (!isSupabaseConfigured()) {
    return {
      verifications: [] as VerificationQueueItem[],
      reports: [] as ReportQueueItem[],
      orders: [] as RefundableOrderItem[],
    };
  }

  const supabase = await createClient();

  const [verificationsRes, reportsRes, ordersRes] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id, message, status, created_at, artists(id, slug, stage_name, verified)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20),
    supabase
      .from("reports")
      .select(
        "id, reason, status, created_at, message_id, reporter:reporter_id(display_name), reported_user:reported_user_id(display_name)"
      )
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: true })
      .limit(20),
    supabase
      .from("orders")
      .select("id, order_type, status, total_cents, currency, created_at, stripe_payment_intent_id, user_id")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const verifications: VerificationQueueItem[] = [];
  for (const row of verificationsRes.data ?? []) {
    const artists = row.artists as VerificationQueueItem["artist"] | VerificationQueueItem["artist"][];
    const artist = Array.isArray(artists) ? artists[0] : artists;
    if (!artist) continue;
    verifications.push({
      id: row.id as string,
      message: row.message as string | null,
      status: row.status as string,
      created_at: row.created_at as string,
      artist,
    });
  }

  const reports = (reportsRes.data ?? []).map((row) => {
    const reporter = row.reporter as ReportQueueItem["reporter"] | ReportQueueItem["reporter"][];
    const reported = row.reported_user as ReportQueueItem["reported_user"] | ReportQueueItem["reported_user"][];
    return {
      id: row.id as string,
      reason: row.reason as string,
      status: row.status as string,
      created_at: row.created_at as string,
      message_id: row.message_id as string | null,
      reporter: Array.isArray(reporter) ? reporter[0] : reporter,
      reported_user: Array.isArray(reported) ? reported[0] : reported,
    };
  });

  const userIds = [...new Set((ordersRes.data ?? []).map((o) => o.user_id as string))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name, username").in("id", userIds)
    : { data: [] as { id: string; display_name: string | null; username: string | null }[] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p.display_name ?? p.username ?? "User"])
  );

  const orders: RefundableOrderItem[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id as string,
    order_type: o.order_type as string,
    status: o.status as string,
    total_cents: o.total_cents as number,
    currency: o.currency as string,
    created_at: o.created_at as string,
    stripe_payment_intent_id: o.stripe_payment_intent_id as string | null,
    user_id: o.user_id as string,
    buyerLabel: profileMap.get(o.user_id as string) ?? "User",
  }));

  return { verifications, reports, orders };
}
