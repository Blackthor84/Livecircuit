"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getProfile } from "@/lib/auth/session";
import { isObserverUser } from "@/lib/auth/observer";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getEventLiveAccess, isUserMutedInEvent } from "@/lib/live/access";
import { canAccessRehearsal } from "@/lib/live/rehearsal-access";
import { applyVirtualTouringAccess } from "@/lib/virtual-touring/live-access-bridge";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStreamingProvider } from "@/lib/streaming/provider";
import { getEventPublicPath } from "@/lib/services/events.service";
import { markRecordingProcessing } from "@/lib/services/recordings.service";
import {
  startLiveKitRecording,
  stopLiveKitRecording,
} from "@/lib/streaming/livekit-egress";
import { parseStreamMetadata } from "@/lib/streaming/stream-metadata";
import {
  eventControlSchema,
  moderateChatSchema,
  reportChatSchema,
  sendChatMessageSchema,
} from "@/lib/validations/live";

export type LiveActionResult =
  | { ok: true; liveUrl?: string }
  | { ok: false; error: string };

async function requireAccess(
  eventId: string,
  needModerate = false,
  channel: "global" | "local" = "global",
  rehearsalToken?: string
) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Live rooms require Supabase" };

  const supabase = await createClient();
  let access = await getEventLiveAccess(supabase, user.id, eventId);
  access = await applyVirtualTouringAccess(supabase, user.id, eventId, access);

  if (needModerate && !access.canModerate) {
    return { ok: false as const, error: "Not allowed" };
  }
  if (!needModerate && !access.canChat) {
    const rehearsal = await canAccessRehearsal(supabase, user.id, eventId, rehearsalToken);
    if (!rehearsal.allowed) {
      return { ok: false as const, error: access.message ?? "Chat is not available" };
    }
  }
  if (channel === "local" && !access.canAccessLocalChat && !access.canModerate) {
    return { ok: false as const, error: "Local chat is for home crowd fans only" };
  }
  return { ok: true as const, user, supabase, access };
}

export async function sendChatMessageAction(input: unknown): Promise<LiveActionResult> {
  const parsed = sendChatMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };
  }

  const ctx = await requireAccess(parsed.data.eventId, false, parsed.data.channel, parsed.data.rehearsalToken);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  if (await isUserMutedInEvent(ctx.supabase, parsed.data.eventId, ctx.user.id)) {
    return { ok: false, error: "You are muted in this room" };
  }

  if (parsed.data.isVipOnly && !ctx.access.isVip && !ctx.access.canModerate) {
    return { ok: false, error: "VIP only message" };
  }

  const { error } = await ctx.supabase.from("chat_messages").insert({
    event_id: parsed.data.eventId,
    user_id: ctx.user.id,
    body: parsed.data.body.trim(),
    is_vip_only: parsed.data.isVipOnly ?? false,
    channel: parsed.data.channel,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteChatMessageAction(input: unknown): Promise<LiveActionResult> {
  const base = moderateChatSchema.safeParse(input);
  if (!base.success) return { ok: false, error: "Invalid request" };

  const parsed = { ...base.data, action: "delete_message" as const };
  const ctx = await requireAccess(parsed.eventId, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { error: updateError } = await ctx.supabase
    .from("chat_messages")
    .update({ is_deleted: true })
    .eq("id", parsed.messageId)
    .eq("event_id", parsed.eventId);

  if (updateError) return { ok: false, error: updateError.message };

  await ctx.supabase.from("moderation_logs").insert({
    admin_id: ctx.user.id,
    message_id: parsed.messageId,
    action: "delete_message",
    reason: parsed.reason ?? null,
  });

  return { ok: true };
}

export async function muteChatUserAction(input: unknown): Promise<LiveActionResult> {
  const parsed = moderateChatSchema.safeParse(input);
  if (!parsed.success || parsed.data.action !== "mute") {
    return { ok: false, error: "Invalid mute request" };
  }

  const ctx = await requireAccess(parsed.data.eventId, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: message } = await ctx.supabase
    .from("chat_messages")
    .select("user_id")
    .eq("id", parsed.data.messageId)
    .eq("event_id", parsed.data.eventId)
    .maybeSingle();

  if (!message?.user_id) return { ok: false, error: "Message not found" };

  const minutes = parsed.data.muteMinutes ?? 30;
  const expires_at = new Date(Date.now() + minutes * 60_000).toISOString();

  const { error } = await ctx.supabase.from("event_chat_mutes").upsert(
    {
      event_id: parsed.data.eventId,
      user_id: message.user_id,
      muted_by: ctx.user.id,
      reason: parsed.data.reason ?? null,
      expires_at,
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };

  await ctx.supabase.from("moderation_logs").insert({
    admin_id: ctx.user.id,
    target_user_id: message.user_id,
    message_id: parsed.data.messageId,
    action: "mute",
    reason: parsed.data.reason ?? null,
  });

  return { ok: true };
}

export async function banChatUserAction(input: unknown): Promise<LiveActionResult> {
  const parsed = moderateChatSchema.safeParse(input);
  if (!parsed.success || parsed.data.action !== "ban") {
    return { ok: false, error: "Invalid ban request" };
  }

  const ctx = await requireAccess(parsed.data.eventId, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  let targetUserId = parsed.data.targetUserId;
  if (!targetUserId && parsed.data.messageId) {
    const { data: message } = await ctx.supabase
      .from("chat_messages")
      .select("user_id")
      .eq("id", parsed.data.messageId)
      .eq("event_id", parsed.data.eventId)
      .maybeSingle();
    targetUserId = message?.user_id ?? undefined;
  }

  if (!targetUserId) return { ok: false, error: "User not found" };

  const { error } = await ctx.supabase.from("event_chat_bans").upsert(
    {
      event_id: parsed.data.eventId,
      user_id: targetUserId,
      banned_by: ctx.user.id,
      reason: parsed.data.reason ?? null,
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };

  await ctx.supabase.from("moderation_logs").insert({
    admin_id: ctx.user.id,
    target_user_id: targetUserId,
    message_id: parsed.data.messageId ?? null,
    action: "ban",
    reason: parsed.data.reason ?? null,
  });

  return { ok: true };
}

export async function pinChatMessageAction(input: unknown): Promise<LiveActionResult> {
  const parsed = moderateChatSchema.safeParse(input);
  if (!parsed.success || !parsed.data.messageId) {
    return { ok: false, error: "Invalid pin request" };
  }

  const ctx = await requireAccess(parsed.data.eventId, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const pin = parsed.data.action === "pin";

  const { error: clearError } = await ctx.supabase
    .from("chat_messages")
    .update({ is_pinned: false })
    .eq("event_id", parsed.data.eventId)
    .eq("is_pinned", true);
  if (clearError) return { ok: false, error: clearError.message };

  if (pin) {
    const { error } = await ctx.supabase
      .from("chat_messages")
      .update({ is_pinned: true })
      .eq("id", parsed.data.messageId)
      .eq("event_id", parsed.data.eventId);
    if (error) return { ok: false, error: error.message };
  }

  await ctx.supabase.from("moderation_logs").insert({
    admin_id: ctx.user.id,
    message_id: parsed.data.messageId,
    action: pin ? "pin" : "delete_message",
    reason: parsed.data.reason ?? null,
  });

  return { ok: true };
}

export async function reportChatMessageAction(input: unknown): Promise<LiveActionResult> {
  const parsed = reportChatSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid report" };
  }

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured" };

  const supabase = await createClient();
  const { data: message } = await supabase
    .from("chat_messages")
    .select("user_id")
    .eq("id", parsed.data.messageId)
    .eq("event_id", parsed.data.eventId)
    .maybeSingle();

  if (!message) return { ok: false, error: "Message not found" };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    reported_user_id: message.user_id,
    message_id: parsed.data.messageId,
    reason: parsed.data.reason.trim(),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function goLiveAction(input: unknown): Promise<LiveActionResult> {
  const parsed = eventControlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireAccess(parsed.data.eventId, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const { data: eventMeta } = await ctx.supabase
    .from("events")
    .select("title, artist_id, artists(stage_name, slug)")
    .eq("id", parsed.data.eventId)
    .maybeSingle();

  const provider = getStreamingProvider();
  let externalStreamId: string;
  try {
    ({ externalStreamId } = await provider.createStream(parsed.data.eventId));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to start stream",
    };
  }

  const now = new Date().toISOString();
  const { error: streamError } = await ctx.supabase
    .from("streams")
    .update({
      status: "live",
      provider: provider.name,
      external_stream_id: externalStreamId,
      playback_url: `/api/stream/${parsed.data.eventId}`,
    })
    .eq("event_id", parsed.data.eventId);

  if (streamError) {
    await provider.endStream(parsed.data.eventId).catch(() => undefined);
    return { ok: false, error: streamError.message };
  }

  const { error: eventError } = await ctx.supabase
    .from("events")
    .update({ status: "live", started_at: now })
    .eq("id", parsed.data.eventId);

  if (eventError) {
    await ctx.supabase
      .from("streams")
      .update({ status: "idle", external_stream_id: null })
      .eq("event_id", parsed.data.eventId);
    await provider.endStream(parsed.data.eventId).catch(() => undefined);
    return { ok: false, error: eventError.message };
  }

  let egressId: string | null = null;
  try {
    egressId = await startLiveKitRecording(parsed.data.eventId);
    await markRecordingProcessing(ctx.supabase, parsed.data.eventId, egressId);
  } catch {
    /* recording is optional */
  }

  const liveUrl = await getEventPublicPath(ctx.supabase, parsed.data.eventId);

  if (eventMeta && liveUrl) {
    const artists = eventMeta.artists as { stage_name: string; slug: string } | { stage_name: string; slug: string }[] | null;
    const artist = Array.isArray(artists) ? artists[0] : artists;
    const { notifyEventLive } = await import("@/lib/services/notifications.service");
    await notifyEventLive({
      artistId: eventMeta.artist_id as string,
      stageName: artist?.stage_name ?? "Your artist",
      eventTitle: eventMeta.title as string,
      liveUrl,
    });
  }

  revalidatePath("/");
  revalidatePath("/artist/dashboard");
  revalidatePath("/notifications");
  if (liveUrl) revalidatePath(liveUrl);

  return { ok: true, liveUrl: liveUrl ?? undefined };
}

export async function endLiveAction(input: unknown): Promise<LiveActionResult> {
  const parsed = eventControlSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireAccess(parsed.data.eventId, true);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const now = new Date().toISOString();
  const { error: eventError } = await ctx.supabase
    .from("events")
    .update({ status: "ended", ended_at: now })
    .eq("id", parsed.data.eventId);

  if (eventError) return { ok: false, error: eventError.message };

  const { data: streamRow } = await ctx.supabase
    .from("streams")
    .select("metadata")
    .eq("event_id", parsed.data.eventId)
    .maybeSingle();
  const metadata = parseStreamMetadata(streamRow?.metadata);
  await stopLiveKitRecording(metadata.egress_id ?? null);

  await getStreamingProvider().endStream(parsed.data.eventId);

  await ctx.supabase
    .from("streams")
    .update({
      status: "ended",
      provider: getStreamingProvider().name,
      metadata: {
        ...metadata,
        recording_status:
          metadata.recording_status === "ready"
            ? "ready"
            : metadata.egress_id
              ? "processing"
              : metadata.recording_status ?? "none",
      },
    })
    .eq("event_id", parsed.data.eventId);

  revalidatePath("/");
  return { ok: true };
}

export async function getLiveAccessForEvent(eventId: string, demo?: { status: string; scheduled_at: string }) {
  if (!isSupabaseConfigured()) {
    return getEventLiveAccess({} as never, null, eventId, {
      status: (demo?.status ?? "scheduled") as "scheduled",
      scheduled_at: demo?.scheduled_at ?? new Date().toISOString(),
    });
  }
  const supabase = await createClient();
  const user = await getSessionUser();
  const access = await getEventLiveAccess(supabase, user?.id, eventId);
  if (!user?.id) return access;
  return applyVirtualTouringAccess(supabase, user.id, eventId, access);
}

export async function recordViewerJoin(eventId: string) {
  if (!isSupabaseConfigured()) return;
  try {
    const { getSessionUser } = await import("@/lib/auth/session");
    const user = await getSessionUser();
    if (!user) return;

    if (await isObserverUser(user.id)) {
      const { logObserverPresence } = await import("@/lib/auth/observer");
      await logObserverPresence({ observerId: user.id, eventId });
      return;
    }

    const admin = getSupabaseAdmin();
    const { data: event } = await admin
      .from("events")
      .select("viewer_count, peak_viewers")
      .eq("id", eventId)
      .maybeSingle();
    if (!event) return;
    const viewer_count = (event.viewer_count as number) + 1;
    const peak_viewers = Math.max(event.peak_viewers as number, viewer_count);
    await admin.from("events").update({ viewer_count, peak_viewers }).eq("id", eventId);

    const { recordVirtualTouringViewerJoin } = await import(
      "@/lib/virtual-touring/record-analytics"
    );
    await recordVirtualTouringViewerJoin(admin, user.id, eventId);
  } catch {
    /* optional */
  }
}
