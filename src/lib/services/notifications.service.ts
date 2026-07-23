import type { NotificationType } from "@/types/notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    await admin.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (e) {
    console.error("[createNotification]", e);
  }
}

export async function notifyFollowers(input: {
  artistId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  limit?: number;
}) {
  if (!isSupabaseConfigured()) return;

  try {
    const admin = getSupabaseAdmin();
    const { data: followers } = await admin
      .from("followers")
      .select("fan_id")
      .eq("artist_id", input.artistId)
      .limit(input.limit ?? 5000);

    if (!followers?.length) return;

    const rows = followers.map((f) => ({
      user_id: f.fan_id,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      metadata: { artist_id: input.artistId },
    }));

    await admin.from("notifications").insert(rows);
  } catch (e) {
    console.error("[notifyFollowers]", e);
  }
}
