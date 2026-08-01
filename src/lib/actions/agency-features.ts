"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { agencyPortalPath } from "@/lib/agency/sections";
import {
  agencyRevenueToCsv,
  agencyRevenueToExcel,
  agencyRevenueToPdfHtml,
} from "@/lib/agency/revenue-export";
import { computeBulkBookingSteps, processBulkBookingJob, type BulkBookingPayload } from "@/lib/agency/bulk-jobs";
import { detectCalendarConflicts } from "@/lib/agency/calendar";
import { getAgencyRevenueReport, listAgencyCalendarEvents } from "@/lib/data/agency-features";
import { getAgencyMembership, logAgencyAction } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { hasAgencyPermission } from "@/lib/agency/permissions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";
import type { AgencyPermissions } from "@/lib/agency/types";

export type AgencyFeatureActionResult = { ok: true } | { ok: false; error: string };

async function requireAgencyStaff(orgId: string, permission?: keyof AgencyPermissions) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const role = await getAgencyMembership(orgId, user.id);
  if (!role) return { ok: false as const, error: "Agency access required" };
  if (permission && !hasAgencyPermission(role, permission)) {
    return { ok: false as const, error: "Permission denied" };
  }

  return { ok: true as const, user, supabase: await createClient(), role };
}

const calendarEventSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  artistId: z.string().uuid().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
});

export async function createAgencyCalendarEventAction(input: unknown): Promise<AgencyFeatureActionResult & { eventId?: string }> {
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid event" };

  const ctx = await requireAgencyStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const events = await listAgencyCalendarEvents(parsed.data.orgId);
  const candidate = {
    id: "new",
    title: parsed.data.title,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    color: parsed.data.color ?? null,
    artist_id: parsed.data.artistId ?? null,
  };
  const conflicts = detectCalendarConflicts([...events, candidate]);
  if (conflicts.length) {
    return { ok: false, error: `Schedule conflict detected (${conflicts[0]!.overlapMinutes} min overlap)` };
  }

  const { data, error } = await ctx.supabase
    .from("agency_calendar_events")
    .insert({
      organization_id: parsed.data.orgId,
      title: parsed.data.title,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      artist_id: parsed.data.artistId ?? null,
      color: parsed.data.color ?? "#6366f1",
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create event" };
  revalidatePath(agencyPortalPath("calendar"));
  return { ok: true, eventId: data.id as string };
}

export async function updateAgencyCalendarEventAction(input: {
  orgId: string;
  eventId: string;
  startsAt: string;
  endsAt: string;
}): Promise<AgencyFeatureActionResult> {
  const ctx = await requireAgencyStaff(input.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const events = await listAgencyCalendarEvents(input.orgId);
  const current = events.find((e) => e.id === input.eventId);
  if (!current) return { ok: false, error: "Event not found" };

  const updated = { ...current, starts_at: input.startsAt, ends_at: input.endsAt };
  const others = events.filter((e) => e.id !== input.eventId);
  const conflicts = detectCalendarConflicts([...others, updated]);
  if (conflicts.length) {
    return { ok: false, error: `Schedule conflict detected (${conflicts[0]!.overlapMinutes} min overlap)` };
  }

  const { error } = await ctx.supabase
    .from("agency_calendar_events")
    .update({
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.eventId)
    .eq("organization_id", input.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(agencyPortalPath("calendar"));
  return { ok: true };
}

export async function deleteAgencyCalendarEventAction(input: {
  orgId: string;
  eventId: string;
}): Promise<AgencyFeatureActionResult> {
  const ctx = await requireAgencyStaff(input.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_calendar_events")
    .delete()
    .eq("id", input.eventId)
    .eq("organization_id", input.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(agencyPortalPath("calendar"));
  return { ok: true };
}

export async function exportAgencyRevenueAction(input: {
  orgId: string;
  format: "csv" | "excel" | "pdf";
  periodDays?: number;
}): Promise<
  | { ok: true; content: string; filename: string; mimeType: string }
  | { ok: false; error: string }
> {
  const ctx = await requireAgencyStaff(input.orgId, "export_data");
  if (!ctx.ok) return ctx;

  const report = await getAgencyRevenueReport(input.orgId, ctx.user.id, input.periodDays ?? 90);
  if (!report) return { ok: false, error: "No revenue data" };

  const date = new Date().toISOString().slice(0, 10);
  const slug = report.orgName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  if (input.format === "csv") {
    return {
      ok: true,
      content: agencyRevenueToCsv(report),
      filename: `${slug}-revenue-${date}.csv`,
      mimeType: "text/csv;charset=utf-8",
    };
  }
  if (input.format === "excel") {
    return {
      ok: true,
      content: agencyRevenueToExcel(report),
      filename: `${slug}-revenue-${date}.xls`,
      mimeType: "application/vnd.ms-excel;charset=utf-8",
    };
  }
  return {
    ok: true,
    content: agencyRevenueToPdfHtml(report),
    filename: `${slug}-revenue-${date}.html`,
    mimeType: "text/html;charset=utf-8",
  };
}

const conversationSchema = z.object({
  orgId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  participantType: z.enum(["artist", "fan", "sponsor", "team", "venue", "support"]),
});

export async function createAgencyConversationAction(input: unknown): Promise<AgencyFeatureActionResult & { conversationId?: string }> {
  const parsed = conversationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid conversation" };

  const ctx = await requireAgencyStaff(parsed.data.orgId);
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_conversations")
    .insert({
      organization_id: parsed.data.orgId,
      subject: parsed.data.subject,
      participant_type: parsed.data.participantType,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create conversation" };
  revalidatePath(agencyPortalPath("communications"));
  return { ok: true, conversationId: data.id as string };
}

const messageSchema = z.object({
  orgId: z.string().uuid(),
  conversationId: z.string().uuid(),
  body: z.string().max(5000).optional(),
  attachments: z
    .array(z.object({ url: z.string().url(), name: z.string(), type: z.string(), size: z.number().optional() }))
    .optional(),
});

export async function sendAgencyMessageAction(input: unknown): Promise<AgencyFeatureActionResult> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid message" };
  if (!parsed.data.body?.trim() && !parsed.data.attachments?.length) {
    return { ok: false, error: "Message or attachment required" };
  }

  const ctx = await requireAgencyStaff(parsed.data.orgId);
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.from("agency_messages").insert({
    conversation_id: parsed.data.conversationId,
    sender_id: ctx.user.id,
    body: parsed.data.body?.trim() ?? "",
    attachments: parsed.data.attachments ?? [],
  });

  if (error) return { ok: false, error: error.message };

  await ctx.supabase
    .from("agency_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", parsed.data.conversationId);

  revalidatePath(agencyPortalPath("communications"));
  return { ok: true };
}

export async function markAgencyMessagesReadAction(input: {
  orgId: string;
  conversationId: string;
}): Promise<AgencyFeatureActionResult> {
  const ctx = await requireAgencyStaff(input.orgId);
  if (!ctx.ok) return ctx;

  await ctx.supabase
    .from("agency_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", input.conversationId)
    .neq("sender_id", ctx.user.id)
    .is("read_at", null);

  return { ok: true };
}

const proposalSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  artistId: z.string().uuid().optional(),
  slotTypeSlug: z.string().optional(),
  venueId: z.string().uuid().optional(),
  budgetCents: z.number().int().positive().optional(),
  submit: z.boolean().optional(),
});

export async function createAgencySponsorshipProposalAction(input: unknown): Promise<AgencyFeatureActionResult & { proposalId?: string }> {
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid proposal" };

  const ctx = await requireAgencyStaff(parsed.data.orgId, "manage_sponsorship");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_sponsorship_proposals")
    .insert({
      organization_id: parsed.data.orgId,
      created_by: ctx.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      artist_id: parsed.data.artistId ?? null,
      slot_type_slug: parsed.data.slotTypeSlug ?? null,
      venue_id: parsed.data.venueId ?? null,
      budget_cents: parsed.data.budgetCents ?? null,
      status: parsed.data.submit ? "submitted" : "draft",
      submitted_at: parsed.data.submit ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create proposal" };

  await logAgencyAction(ctx.supabase, {
    organizationId: parsed.data.orgId,
    actorUserId: ctx.user.id,
    action: parsed.data.submit ? "sponsorship_proposal_submitted" : "sponsorship_proposal_created",
    metadata: { proposalId: data.id },
  });

  revalidatePath(agencyPortalPath("sponsorship"));
  return { ok: true, proposalId: data.id as string };
}

export async function updateAgencyProposalStatusAction(input: {
  orgId: string;
  proposalId: string;
  status: "submitted" | "withdrawn" | "accepted" | "rejected";
}): Promise<AgencyFeatureActionResult> {
  const ctx = await requireAgencyStaff(input.orgId, "manage_sponsorship");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_sponsorship_proposals")
    .update({
      status: input.status,
      submitted_at: input.status === "submitted" ? new Date().toISOString() : undefined,
      reviewed_at: ["accepted", "rejected"].includes(input.status) ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.proposalId)
    .eq("organization_id", input.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(agencyPortalPath("sponsorship"));
  return { ok: true };
}

const bulkJobSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(2).max(200),
  artistIds: z.array(z.string().uuid()).min(1),
  preferredStates: z.array(z.string()).optional(),
  preferredGenres: z.array(z.string()).optional(),
  runAutoMatch: z.boolean().optional(),
  bookingMode: z.enum(["single", "recurring", "tour", "weekly", "monthly", "seasonal"]).optional(),
});

export async function enqueueBulkBookingJobAction(input: unknown): Promise<AgencyFeatureActionResult & { jobId?: string }> {
  const parsed = bulkJobSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid bulk booking job" };

  const ctx = await requireAgencyStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const payload: BulkBookingPayload = {
    title: parsed.data.title,
    artistIds: parsed.data.artistIds,
    preferredStates: parsed.data.preferredStates,
    preferredGenres: parsed.data.preferredGenres,
    runAutoMatch: parsed.data.runAutoMatch ?? true,
    bookingMode: parsed.data.bookingMode ?? "single",
  };

  const { data: org } = await ctx.supabase
    .from("agency_organizations")
    .select("is_test")
    .eq("id", parsed.data.orgId)
    .maybeSingle();

  const { data: job, error } = await ctx.supabase
    .from("agency_background_jobs")
    .insert({
      organization_id: parsed.data.orgId,
      created_by: ctx.user.id,
      job_type: "bulk_booking",
      status: "pending",
      payload,
      total_steps: computeBulkBookingSteps(payload),
      is_test: Boolean(org?.is_test),
    })
    .select("id")
    .single();

  if (error || !job) return { ok: false, error: error?.message ?? "Failed to enqueue job" };

  await logAgencyAction(ctx.supabase, {
    organizationId: parsed.data.orgId,
    actorUserId: ctx.user.id,
    action: "bulk_booking_job_enqueued",
    metadata: { jobId: job.id, artistCount: parsed.data.artistIds.length },
  });

  revalidatePath(agencyPortalPath("book-roster"));
  return { ok: true, jobId: job.id as string };
}

export async function processAgencyJobAction(orgId: string, jobId: string): Promise<AgencyFeatureActionResult & { status?: string }> {
  const ctx = await requireAgencyStaff(orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data: job } = await ctx.supabase
    .from("agency_background_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!job) return { ok: false, error: "Job not found" };
  if (job.status === "completed") return { ok: true, status: "completed" };
  if (job.status === "running") return { ok: true, status: "running" };

  const result = await processBulkBookingJob(
    ctx.supabase,
    {
      id: job.id as string,
      organization_id: orgId,
      job_type: job.job_type as "bulk_booking",
      status: job.status as "pending",
      payload: job.payload as BulkBookingPayload,
      result: (job.result as Record<string, unknown>) ?? {},
      progress: job.progress as number,
      total_steps: job.total_steps as number,
      error_message: job.error_message as string | null,
    },
    ctx.user.id
  );

  revalidatePath(agencyPortalPath("book-roster"));
  if (!result.ok) return result;
  return { ok: true, status: "completed" };
}

export async function getAgencyJobStatusAction(orgId: string, jobId: string) {
  const ctx = await requireAgencyStaff(orgId);
  if (!ctx.ok) return ctx;

  const { data } = await ctx.supabase
    .from("agency_background_jobs")
    .select("id, status, progress, total_steps, error_message, result, completed_at")
    .eq("id", jobId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!data) return { ok: false as const, error: "Job not found" };
  return { ok: true as const, job: data };
}

export async function getAgencyAttachmentUploadPathAction(orgId: string, filename: string) {
  const ctx = await requireAgencyStaff(orgId);
  if (!ctx.ok) return ctx;

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${orgId}/${ctx.user.id}/${Date.now()}-${safeName}`;
  return { ok: true as const, path, bucket: "agency-attachments" };
}
