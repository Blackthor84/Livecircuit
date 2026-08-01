import type { SupabaseClient } from "@supabase/supabase-js";
import { runAgencyAutoMatch } from "@/lib/data/agencies";

export type AgencyJobType = "bulk_booking" | "bulk_auto_match" | "bulk_calendar_sync";
export type AgencyJobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export type BulkBookingPayload = {
  title: string;
  artistIds: string[];
  preferredStates?: string[];
  preferredGenres?: string[];
  runAutoMatch?: boolean;
  bookingMode?: "single" | "recurring" | "tour" | "weekly" | "monthly" | "seasonal";
};

export type AgencyBackgroundJob = {
  id: string;
  organization_id: string;
  job_type: AgencyJobType;
  status: AgencyJobStatus;
  payload: BulkBookingPayload;
  result: Record<string, unknown>;
  progress: number;
  total_steps: number;
  error_message: string | null;
};

export function computeBulkBookingSteps(payload: BulkBookingPayload): number {
  const artistCount = payload.artistIds.length;
  const matchMultiplier = payload.runAutoMatch ? 2 : 1;
  const modeMultiplier =
    payload.bookingMode === "tour" ? 3 : payload.bookingMode === "recurring" ? 2 : 1;
  return Math.max(1, artistCount * matchMultiplier * modeMultiplier);
}

export async function processBulkBookingJob(
  supabase: SupabaseClient,
  job: AgencyBackgroundJob,
  actorUserId: string
): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  const payload = job.payload;
  const requestIds: string[] = [];
  const matchCounts: number[] = [];
  let progress = 0;

  await supabase
    .from("agency_background_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      total_steps: computeBulkBookingSteps(payload),
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  try {
    for (const artistId of payload.artistIds) {
      const title = `${payload.title} — ${artistId.slice(0, 8)}`;
      const { data: request, error } = await supabase
        .from("agency_booking_requests")
        .insert({
          organization_id: job.organization_id,
          created_by: actorUserId,
          title,
          artist_ids: [artistId],
          preferred_states: payload.preferredStates ?? [],
          preferred_genres: payload.preferredGenres ?? [],
          is_bulk: true,
          is_recurring: payload.bookingMode === "recurring" || payload.bookingMode === "weekly",
          recurrence_rule: payload.bookingMode ?? "single",
          status: "pending",
          metadata: { jobId: job.id, bookingMode: payload.bookingMode ?? "single" },
        })
        .select("id")
        .single();

      if (error || !request) throw new Error(error?.message ?? "Failed to create booking request");
      requestIds.push(request.id as string);
      progress += 1;

      await supabase
        .from("agency_background_jobs")
        .update({ progress, updated_at: new Date().toISOString() })
        .eq("id", job.id);

      if (payload.runAutoMatch) {
        const matches = await runAgencyAutoMatch(supabase, job.organization_id, request.id as string);
        matchCounts.push(matches.length);
        progress += 1;
        await supabase
          .from("agency_background_jobs")
          .update({ progress, updated_at: new Date().toISOString() })
          .eq("id", job.id);
      }
    }

    const result = {
      requestIds,
      matchCounts,
      artistsProcessed: payload.artistIds.length,
      bookingMode: payload.bookingMode ?? "single",
    };

    await supabase
      .from("agency_background_jobs")
      .update({
        status: "completed",
        progress: computeBulkBookingSteps(payload),
        result,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return { ok: true, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bulk booking failed";
    await supabase
      .from("agency_background_jobs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { ok: false, error: message };
  }
}
