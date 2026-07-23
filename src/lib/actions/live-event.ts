"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { getEventLiveAccess, isUserMutedInEvent } from "@/lib/live/access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStreamingProvider } from "@/lib/streaming/provider";
import {
  eventControlSchema,
  moderateChatSchema,
  reportChatSchema,
  sendChatMessageSchema,
} from "@/lib/validations/live";

export type LiveActionResult = { ok: true } | { ok: false; error: string };

async function requireAccess(eventId: string, needModerate = false) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Live rooms require Supabase" };

  const supabase = await createClient();
  const access = await getEventLiveAccess(supabase, user.id, eventId);
  if (needModerate && !access.canModerate) {
    return { ok: false as const, error: "Not allowed" };
  }
  if (!needModerate && !access.canChat) {
    return { ok: false as const, error: access.message ?? "Chat is not available" };
  }
  return { ok: true as const, user, supabase, access };
}

export async function sendChatMessageAction(input: unknown): Promise<LiveActionResult> {
  const parsed = sendChatMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message" };
  }

  const ctx = await requireAccess(parsed.data.eventId);
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

  const now = new Date().toISOString();
  const { error: eventError } = await ctx.supabase
    .from("events")
    .update({ status: "live", started_at: now })
    .eq("id", parsed.data.eventId);

  if (eventError) return { ok: false, error: eventError.message };

  const provider = getStreamingProvider();
  const { externalStreamId } = await provider.createStream(parsed.data.eventId);

  await ctx.supabase
    .from("streams")
    .update({ status: "live", external_stream_id: externalStreamId })
    .eq("event_id", parsed.data.eventId);

  revalidatePath("/");
  return { ok: true };
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

  await getStreamingProvider().endStream(parsed.data.eventId);

  await ctx.supabase
    .from("streams")
    .update({ status: "ended" })
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
  return getEventLiveAccess(supabase, user?.id, eventId);
}

export async function recordViewerJoin(eventId: string) {
  if (!isSupabaseConfigured()) return;
  try {
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
  } catch {
    /* optional */
  }
}
