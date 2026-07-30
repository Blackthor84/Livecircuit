"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import {
  closeStreamRehearsal,
  getStreamRehearsal,
  listRehearsalFeedback,
  openStreamRehearsal,
  submitRehearsalFeedback,
  updateRehearsalAccessMode,
  updateRehearsalChecklist,
} from "@/lib/data/rehearsal";
import {
  getGoLiveChecklist,
  listProductionHistory,
  openGreenRoom,
  saveProductionHistory,
  setSoundCheckActive,
  updateGoLiveChecklist,
} from "@/lib/data/production-history";
import { getEventLiveAccess } from "@/lib/live/access";
import { getEventPublicPath } from "@/lib/services/events.service";
import { goLiveAction } from "@/lib/actions/live-event";
import { parseStreamMetadata } from "@/lib/streaming/stream-metadata";
import { ensureLiveKitRoom } from "@/lib/streaming/livekit";
import type { GoLiveChecklist } from "@/lib/production/studio";
import type { RehearsalAccessMode, StudioChecklist } from "@/lib/streaming/studio/types";

export type StudioActionResult =
  | { ok: true; inviteUrl?: string; liveUrl?: string }
  | { ok: false; error: string };

const eventIdSchema = z.object({ eventId: z.string().uuid() });

const accessModeSchema = z.object({
  eventId: z.string().uuid(),
  accessMode: z.enum(["self_only", "admin", "moderator", "test_fan", "invite_link"]),
});

const checklistSchema = z.object({
  eventId: z.string().uuid(),
  checklist: z.record(z.string(), z.boolean()),
});

const feedbackSchema = z.object({
  eventId: z.string().uuid(),
  audioRating: z.number().int().min(1).max(5),
  videoRating: z.number().int().min(1).max(5),
  lightingRating: z.number().int().min(1).max(5),
  syncRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
  cameraRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(2000).optional(),
});

const goLiveChecklistSchema = z.object({
  eventId: z.string().uuid(),
  checklist: z.record(z.string(), z.boolean()),
});

async function requireProductionStaff(eventId: string, needHost = false) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Production studio requires Supabase" };

  const supabase = await createClient();
  const access = await getEventLiveAccess(supabase, user.id, eventId);

  if (needHost && access.mode !== "host") {
    return { ok: false as const, error: "Host access required" };
  }

  if (access.mode !== "host" && access.mode !== "producer") {
    return { ok: false as const, error: "Production access required" };
  }

  return { ok: true as const, user, supabase, access };
}

async function requireStudioHost(eventId: string) {
  return requireProductionStaff(eventId, true);
}

export async function openStudioAction(input: unknown): Promise<StudioActionResult> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireStudioHost(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    await ensureLiveKitRoom(parsed.data.eventId, true);
    await openStreamRehearsal(ctx.supabase, parsed.data.eventId, "self_only");

    const { data: stream } = await ctx.supabase
      .from("streams")
      .select("metadata")
      .eq("event_id", parsed.data.eventId)
      .maybeSingle();

    const metadata = parseStreamMetadata(stream?.metadata);
    await ctx.supabase
      .from("streams")
      .update({
        metadata: {
          ...metadata,
          studio_opened_at: new Date().toISOString(),
          rehearsal_active: true,
        },
      })
      .eq("event_id", parsed.data.eventId);

    revalidatePath(`/artist/events/${parsed.data.eventId}`);
    revalidatePath(`/artist/events/${parsed.data.eventId}/production`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to open studio",
    };
  }
}

export async function openGreenRoomAction(input: unknown): Promise<StudioActionResult> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireProductionStaff(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    await ensureLiveKitRoom(parsed.data.eventId, true);
    await openGreenRoom(ctx.supabase, parsed.data.eventId);
    await openStreamRehearsal(ctx.supabase, parsed.data.eventId, "self_only");
    revalidatePath(`/artist/events/${parsed.data.eventId}/production`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to open green room",
    };
  }
}

export async function startSoundCheckAction(input: unknown): Promise<StudioActionResult> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireProductionStaff(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    await setSoundCheckActive(ctx.supabase, parsed.data.eventId, true);
    await saveProductionHistory(ctx.supabase, {
      eventId: parsed.data.eventId,
      sessionType: "sound_check",
      summary: { started_by: ctx.user.id, at: new Date().toISOString() },
    });
    revalidatePath(`/artist/events/${parsed.data.eventId}/production`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to start sound check",
    };
  }
}

export async function updateGoLiveChecklistAction(input: unknown): Promise<StudioActionResult> {
  const parsed = goLiveChecklistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid checklist" };

  const ctx = await requireProductionStaff(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    await updateGoLiveChecklist(
      ctx.supabase,
      parsed.data.eventId,
      parsed.data.checklist as GoLiveChecklist
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save checklist",
    };
  }
}

export async function updateRehearsalAccessAction(input: unknown): Promise<StudioActionResult> {
  const parsed = accessModeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };

  const ctx = await requireStudioHost(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    const token = await updateRehearsalAccessMode(
      ctx.supabase,
      parsed.data.eventId,
      parsed.data.accessMode as RehearsalAccessMode
    );

    const liveUrl = await getEventPublicPath(ctx.supabase, parsed.data.eventId);
    const inviteUrl =
      token && liveUrl
        ? `${liveUrl}/rehearsal?token=${token}`
        : undefined;

    revalidatePath(`/artist/events/${parsed.data.eventId}/production`);
    return { ok: true, inviteUrl };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update access",
    };
  }
}

export async function updateStudioChecklistAction(input: unknown): Promise<StudioActionResult> {
  const parsed = checklistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid checklist" };

  const ctx = await requireStudioHost(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    await updateRehearsalChecklist(
      ctx.supabase,
      parsed.data.eventId,
      parsed.data.checklist as StudioChecklist
    );
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save checklist",
    };
  }
}

export async function submitRehearsalFeedbackAction(input: unknown): Promise<StudioActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid feedback" };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .maybeSingle();

  try {
    await submitRehearsalFeedback(supabase, {
      eventId: parsed.data.eventId,
      reviewerId: user.id,
      reviewerLabel: profile?.display_name ?? profile?.username ?? "Test fan",
      audioRating: parsed.data.audioRating,
      videoRating: parsed.data.videoRating,
      lightingRating: parsed.data.lightingRating,
      syncRating: parsed.data.syncRating,
      overallRating: parsed.data.overallRating,
      cameraRating: parsed.data.cameraRating,
      comment: parsed.data.comment,
    });
    revalidatePath(`/artist/events/${parsed.data.eventId}/production`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to submit feedback",
    };
  }
}

export async function getProductionStudioStateAction(eventId: string) {
  const ctx = await requireProductionStaff(eventId);
  if (!ctx.ok) return { ok: false as const, error: ctx.error };

  const [rehearsal, feedback, history, goLiveChecklist] = await Promise.all([
    getStreamRehearsal(ctx.supabase, eventId),
    listRehearsalFeedback(ctx.supabase, eventId),
    listProductionHistory(ctx.supabase, eventId),
    getGoLiveChecklist(ctx.supabase, eventId),
  ]);

  const liveUrl = await getEventPublicPath(ctx.supabase, eventId);
  const inviteUrl =
    rehearsal?.invite_token && liveUrl
      ? `${liveUrl}/rehearsal?token=${rehearsal.invite_token}`
      : null;

  const { data: eventStats } = await ctx.supabase
    .from("events")
    .select("viewer_count, peak_viewers, status, scheduled_at, started_at")
    .eq("id", eventId)
    .maybeSingle();

  return {
    ok: true as const,
    access: ctx.access,
    rehearsal,
    feedback,
    history,
    goLiveChecklist,
    inviteUrl,
    scheduledAt: eventStats?.scheduled_at ?? new Date().toISOString(),
    stats: {
      viewerCount: eventStats?.viewer_count ?? 0,
      peakViewers: eventStats?.peak_viewers ?? 0,
      status: eventStats?.status ?? "scheduled",
    },
  };
}

export async function getStudioStateAction(eventId: string) {
  return getProductionStudioStateAction(eventId);
}

export async function broadcastLiveFromStudioAction(input: unknown): Promise<StudioActionResult> {
  const parsed = eventIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireStudioHost(parsed.data.eventId);
  if (!ctx.ok) return { ok: false, error: ctx.error };

  try {
    await closeStreamRehearsal(ctx.supabase, parsed.data.eventId);
    await setSoundCheckActive(ctx.supabase, parsed.data.eventId, false);

    const feedback = await listRehearsalFeedback(ctx.supabase, parsed.data.eventId);
    const checklist = await getGoLiveChecklist(ctx.supabase, parsed.data.eventId);

    await saveProductionHistory(ctx.supabase, {
      eventId: parsed.data.eventId,
      sessionType: "go_live",
      summary: { checklist, went_live_at: new Date().toISOString() },
      fanRatings: feedback,
    });

    const { data: stream } = await ctx.supabase
      .from("streams")
      .select("metadata")
      .eq("event_id", parsed.data.eventId)
      .maybeSingle();
    const metadata = parseStreamMetadata(stream?.metadata);

    await ctx.supabase
      .from("streams")
      .update({
        metadata: { ...metadata, rehearsal_active: false },
      })
      .eq("event_id", parsed.data.eventId);
  } catch {
    /* non-blocking */
  }

  const result = await goLiveAction({ eventId: parsed.data.eventId });
  if (!result.ok) return result;
  return { ok: true, liveUrl: result.liveUrl };
}
