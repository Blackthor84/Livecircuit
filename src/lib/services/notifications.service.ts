import type { NotificationType } from "@/types/notifications";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { filterOutTestUserIds } from "@/lib/testing/permissions";

async function shouldNotifyUser(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("profiles").select("is_test_account").eq("id", userId).maybeSingle();
  return !data?.is_test_account;
}

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isSupabaseConfigured()) return;
  if (!(await shouldNotifyUser(input.userId))) return;

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

    const fanIds = await filterOutTestUserIds(followers.map((f) => f.fan_id as string));
    if (!fanIds.length) return;

    const rows = fanIds.map((user_id) => ({
      user_id,
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

/** Alert followers when an artist starts broadcasting. */
export async function notifyEventLive(input: {
  artistId: string;
  stageName: string;
  eventTitle: string;
  liveUrl: string;
}) {
  const copy = buildGoLiveNotification({
    stageName: input.stageName,
    eventTitle: input.eventTitle,
  });

  await notifyFollowers({
    artistId: input.artistId,
    type: "artist_live",
    title: copy.title,
    body: copy.body,
    link: input.liveUrl,
  });
}

export function buildGoLiveNotification(input: {
  stageName: string;
  eventTitle: string;
}) {
  return {
    title: `${input.stageName} is live now`,
    body: `Join "${input.eventTitle}" before it ends.`,
  };
}
