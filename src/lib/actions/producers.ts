"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import { isAdminRole } from "@/lib/auth/roles";
import {
  acceptProducerInvite,
  addProducerNote,
  generateProducerLinkInvite,
  getEventProducerForUser,
  getProducerByInviteToken,
  getProducerChecklist,
  inviteProducerByEmail,
  inviteProducerByUserId,
  listEventProducers,
  listProducerNotes,
  removeEventProducer,
  updateProducerChecklist,
  updateProducerPermissions,
} from "@/lib/data/producers";
import { getEventLiveAccess } from "@/lib/live/access";
import { hasProducerPermission } from "@/lib/production/permissions";
import { getEventPublicPath } from "@/lib/services/events.service";
import { resolveProfileByUsername } from "@/lib/services/event-hosts.service";
import { createNotification } from "@/lib/services/notifications.service";
import { broadcastLiveFromStudioAction, submitRehearsalFeedbackAction } from "@/lib/actions/studio";
import { endLiveAction } from "@/lib/actions/live-event";
import { listProductionHistory } from "@/lib/data/production-history";
import type {
  ProducerChecklist,
  ProducerLabel,
  ProducerPermissions,
  ProducerStaffRole,
} from "@/lib/production/types";

export type ProducerActionResult = { ok: true; inviteUrl?: string } | { ok: false; error: string };

const inviteUserSchema = z.object({
  eventId: z.string().uuid(),
  username: z.string().min(2).max(40),
  staffRole: z.enum(["lead_producer", "assistant_producer", "moderator", "sound_engineer", "lighting_engineer"]),
  producerLabel: z.enum([
    "manager", "band_member", "friend", "family_member", "tour_manager",
    "moderator", "sound_engineer", "lighting_operator", "custom",
  ]),
  customLabel: z.string().max(80).optional(),
  permanent: z.boolean().optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

const inviteEmailSchema = inviteUserSchema.omit({ username: true }).extend({
  email: z.string().email(),
});

async function requireEventOwner(eventId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, scheduled_at, ended_at, artist_id, artists(user_id, slug)")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return { ok: false as const, error: "Event not found" };

  const artists = event.artists as { user_id: string; slug: string } | { user_id: string; slug: string }[] | null;
  const artist = Array.isArray(artists) ? artists[0] : artists;
  if (!artist || artist.user_id !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!isAdminRole(profile?.role)) {
      return { ok: false as const, error: "Only the event owner can manage producers" };
    }
  }

  return {
    ok: true as const,
    user,
    supabase,
    event,
    artistSlug: artist?.slug ?? "",
    eventEndsAt: (event.ended_at as string | null) ?? (event.scheduled_at as string),
  };
}

async function requireProducerAccess(eventId: string, permission?: keyof ProducerPermissions) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };

  const supabase = await createClient();
  const access = await getEventLiveAccess(supabase, user.id, eventId);

  if (access.mode === "host") {
    return { ok: true as const, user, supabase, access, producer: null };
  }

  const producer = await getEventProducerForUser(supabase, eventId, user.id);
  if (!producer) return { ok: false as const, error: "Producer access required" };

  if (permission && !hasProducerPermission(producer.permissions as ProducerPermissions, permission)) {
    return { ok: false as const, error: "Permission denied" };
  }

  return { ok: true as const, user, supabase, access, producer };
}

export async function inviteProducerUserAction(input: unknown): Promise<ProducerActionResult> {
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite" };

  const ctx = await requireEventOwner(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  const profile = await resolveProfileByUsername(ctx.supabase, parsed.data.username);
  if (!profile) return { ok: false, error: "User not found" };

  try {
    await inviteProducerByUserId(ctx.supabase, {
      eventId: parsed.data.eventId,
      userId: profile.id,
      invitedBy: ctx.user.id,
      staffRole: parsed.data.staffRole as ProducerStaffRole,
      producerLabel: parsed.data.producerLabel as ProducerLabel,
      customLabel: parsed.data.customLabel,
      permissions: parsed.data.permissions as ProducerPermissions,
      permanent: parsed.data.permanent,
      eventEndsAt: ctx.eventEndsAt,
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invite failed" };
  }

  const boothUrl = `/artist/events/${parsed.data.eventId}/production?view=studio`;
  await createNotification({
    userId: profile.id,
    type: "system",
    title: "Producer invitation",
    body: `You've been invited to run production for "${ctx.event.title as string}".`,
    link: boothUrl,
    metadata: { event_id: parsed.data.eventId },
  });

  revalidatePath(`/artist/events/${parsed.data.eventId}`);
  return { ok: true };
}

export async function inviteProducerEmailAction(input: unknown): Promise<ProducerActionResult> {
  const parsed = inviteEmailSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite" };

  const ctx = await requireEventOwner(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  try {
    const row = await inviteProducerByEmail(ctx.supabase, {
      eventId: parsed.data.eventId,
      email: parsed.data.email,
      invitedBy: ctx.user.id,
      staffRole: parsed.data.staffRole as ProducerStaffRole,
      producerLabel: parsed.data.producerLabel as ProducerLabel,
      customLabel: parsed.data.customLabel,
      permissions: parsed.data.permissions as ProducerPermissions,
      permanent: parsed.data.permanent,
      eventEndsAt: ctx.eventEndsAt,
    });

    const publicPath = await getEventPublicPath(ctx.supabase, parsed.data.eventId);
    const inviteUrl = publicPath
      ? `${publicPath}/production/join?token=${row.invite_token}`
      : `/production/join?token=${row.invite_token}`;

    revalidatePath(`/artist/events/${parsed.data.eventId}`);
    return { ok: true, inviteUrl };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invite failed" };
  }
}

export async function generateProducerLinkAction(input: unknown): Promise<ProducerActionResult> {
  const parsed = inviteUserSchema.omit({ username: true }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const ctx = await requireEventOwner(parsed.data.eventId);
  if (!ctx.ok) return ctx;

  try {
    const row = await generateProducerLinkInvite(ctx.supabase, {
      eventId: parsed.data.eventId,
      invitedBy: ctx.user.id,
      staffRole: parsed.data.staffRole as ProducerStaffRole,
      producerLabel: parsed.data.producerLabel as ProducerLabel,
      customLabel: parsed.data.customLabel,
      permissions: parsed.data.permissions as ProducerPermissions,
      permanent: parsed.data.permanent,
      eventEndsAt: ctx.eventEndsAt,
    });

    const publicPath = await getEventPublicPath(ctx.supabase, parsed.data.eventId);
    const inviteUrl = publicPath
      ? `${publicPath}/production/join?token=${row.invite_token}`
      : `/production/join?token=${row.invite_token}`;

    revalidatePath(`/artist/events/${parsed.data.eventId}`);
    return { ok: true, inviteUrl };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not generate link" };
  }
}

export async function acceptProducerInviteAction(token: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };

  const supabase = await createClient();
  try {
    const row = await acceptProducerInvite(supabase, token, user.id);
    revalidatePath(`/artist/events/${row.event_id}/production`);
    return { ok: true as const, eventId: row.event_id };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Invalid invite" };
  }
}

export async function removeProducerAction(producerId: string, eventId: string): Promise<ProducerActionResult> {
  const ctx = await requireEventOwner(eventId);
  if (!ctx.ok) return ctx;
  try {
    await removeEventProducer(ctx.supabase, producerId);
    revalidatePath(`/artist/events/${eventId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Remove failed" };
  }
}

export async function updateProducerPermissionsAction(input: {
  producerId: string;
  eventId: string;
  permissions: ProducerPermissions;
}): Promise<ProducerActionResult> {
  const ctx = await requireEventOwner(input.eventId);
  if (!ctx.ok) return ctx;
  try {
    await updateProducerPermissions(ctx.supabase, input.producerId, input.permissions);
    revalidatePath(`/artist/events/${input.eventId}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Update failed" };
  }
}

export async function sendBackstageChatAction(input: {
  eventId: string;
  body: string;
}): Promise<ProducerActionResult> {
  const ctx = await requireProducerAccess(input.eventId);
  if (!ctx.ok) return ctx;
  if (!ctx.access.canBackstageChat && ctx.access.mode !== "host") {
    return { ok: false, error: "Backstage chat unavailable" };
  }

  const { error } = await ctx.supabase.from("backstage_chat_messages").insert({
    event_id: input.eventId,
    user_id: ctx.user.id,
    body: input.body.trim(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateProducerChecklistAction(input: {
  eventId: string;
  checklist: ProducerChecklist;
}): Promise<ProducerActionResult> {
  const ctx = await requireProducerAccess(input.eventId);
  if (!ctx.ok) return ctx;
  try {
    await updateProducerChecklist(ctx.supabase, input.eventId, input.checklist);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Checklist update failed" };
  }
}

export async function addProducerNoteAction(input: {
  eventId: string;
  body: string;
  timestampMs?: number;
}): Promise<ProducerActionResult> {
  const ctx = await requireProducerAccess(input.eventId);
  if (!ctx.ok) return ctx;
  try {
    await addProducerNote(ctx.supabase, {
      eventId: input.eventId,
      producerId: ctx.user.id,
      body: input.body,
      timestampMs: input.timestampMs,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Note failed" };
  }
}

export async function producerStartStreamAction(eventId: string): Promise<ProducerActionResult> {
  const ctx = await requireProducerAccess(eventId, "start_stream");
  if (!ctx.ok) return ctx;
  return broadcastLiveFromStudioAction({ eventId });
}

export async function producerStopStreamAction(eventId: string): Promise<ProducerActionResult> {
  const ctx = await requireProducerAccess(eventId, "stop_stream");
  if (!ctx.ok) return ctx;
  const result = await endLiveAction({ eventId });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function getProductionBoothStateAction(eventId: string) {
  const ctx = await requireProducerAccess(eventId);
  if (!ctx.ok) return { ok: false as const, error: ctx.error };

  const [producers, checklist, notes, feedback] = await Promise.all([
    listEventProducers(ctx.supabase, eventId),
    getProducerChecklist(ctx.supabase, eventId),
    listProducerNotes(ctx.supabase, eventId),
    ctx.supabase
      .from("rehearsal_feedback")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const { data: eventStats } = await ctx.supabase
    .from("events")
    .select("viewer_count, peak_viewers, status, started_at, ended_at")
    .eq("id", eventId)
    .maybeSingle();

  const { count: chatCount } = await ctx.supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("is_deleted", false);

  return {
    ok: true as const,
    access: ctx.access,
    producers,
    checklist,
    notes,
    feedback: feedback.data ?? [],
    stats: {
      viewerCount: eventStats?.viewer_count ?? 0,
      peakViewers: eventStats?.peak_viewers ?? 0,
      chatMessages: chatCount ?? 0,
      status: eventStats?.status ?? "scheduled",
    },
  };
}

export async function getPostShowReportAction(eventId: string) {
  const ctx = await requireProducerAccess(eventId, "export_reports");
  if (!ctx.ok) return { ok: false as const, error: ctx.error };

  const state = await getProductionBoothStateAction(eventId);
  if (!state.ok) return state;

  const [
    { count: ticketCount },
    { data: tips },
    { count: reactionCount },
    history,
    { data: eventRow },
    { data: streamRow },
  ] = await Promise.all([
    ctx.supabase.from("tickets").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ctx.supabase.from("tips").select("amount_cents").eq("event_id", eventId),
    ctx.supabase.from("reactions").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    listProductionHistory(ctx.supabase, eventId),
    ctx.supabase
      .from("events")
      .select("title, started_at, ended_at, viewer_count, peak_viewers")
      .eq("id", eventId)
      .maybeSingle(),
    ctx.supabase.from("streams").select("metadata").eq("event_id", eventId).maybeSingle(),
  ]);

  const tipTotalCents = (tips ?? []).reduce((sum, tip) => sum + (tip.amount_cents ?? 0), 0);
  const streamMetadata = (streamRow?.metadata ?? {}) as Record<string, unknown>;
  const startedAt = eventRow?.started_at ? new Date(eventRow.started_at as string) : null;
  const endedAt = eventRow?.ended_at ? new Date(eventRow.ended_at as string) : null;
  const watchMinutes =
    startedAt && endedAt
      ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
      : null;

  const fanRatings = state.feedback as Array<{
    audio_rating: number | null;
    video_rating: number | null;
    lighting_rating: number | null;
    camera_rating: number | null;
    sync_rating: number | null;
    overall_rating: number | null;
    comment: string | null;
  }>;

  const avgRating = (key: keyof (typeof fanRatings)[number]) => {
    const values = fanRatings.map((r) => r[key]).filter((v): v is number => typeof v === "number");
    if (!values.length) return null;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
  };

  return {
    ok: true as const,
    report: {
      eventTitle: eventRow?.title ?? "Live event",
      ...state.stats,
      ticketHolders: ticketCount ?? 0,
      tipTotalCents,
      reactionCount: reactionCount ?? 0,
      watchMinutes,
      producerNotes: state.notes,
      fanFeedback: state.feedback,
      fanRatingsSummary: {
        audio: avgRating("audio_rating"),
        video: avgRating("video_rating"),
        lighting: avgRating("lighting_rating"),
        camera: avgRating("camera_rating"),
        sync: avgRating("sync_rating"),
        overall: avgRating("overall_rating"),
      },
      productionHistory: history,
      technical: {
        droppedFrames: streamMetadata.dropped_frames ?? null,
        networkQuality: streamMetadata.network_quality ?? null,
        reconnectAttempts: streamMetadata.reconnect_attempts ?? null,
      },
      generatedAt: new Date().toISOString(),
    },
  };
}

export { submitRehearsalFeedbackAction, listEventProducers, getProducerByInviteToken };
