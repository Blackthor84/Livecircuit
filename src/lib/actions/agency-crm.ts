"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { hasAgencyPermission } from "@/lib/agency/permissions";
import { CRM_PIPELINE_STAGES, type CrmPipelineStageId } from "@/lib/agency/crm-constants";
import { crmStageLabel } from "@/lib/agency/crm-constants";
import type { AgencyPermissions } from "@/lib/agency/types";
import {
  getAgencyMembership,
  logAgencyAction,
} from "@/lib/data/agencies";
import {
  logCrmActivity,
  seedCrmChecklistForBooking,
} from "@/lib/data/agency-crm";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type CrmActionResult = { ok: true; id?: string } | { ok: false; error: string };

const CRM_PATHS = [
  "/agency/crm",
  "/agency/crm/pipeline",
  "/agency/crm/contacts",
  "/agency/crm/calendar",
  "/agency/crm/analytics",
  "/agency/crm/search",
];

function revalidateCrm() {
  for (const path of CRM_PATHS) revalidatePath(path);
}

async function requireCrmStaff(orgId: string, permission?: keyof AgencyPermissions) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };

  const role = await getAgencyMembership(orgId, user.id);
  if (!role) return { ok: false as const, error: "Agency access required" };

  if (permission && !hasAgencyPermission(role, permission)) {
    return { ok: false as const, error: "Permission denied" };
  }

  const supabase = await createClient();
  return { ok: true as const, user, supabase, role };
}

const createBookingSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(2).max(200),
  artistId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  eventType: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  projectedRevenueCents: z.number().int().nonnegative().optional(),
  startsAt: z.string().datetime().optional(),
  timezone: z.string().optional(),
});

export async function createCrmBookingAction(input: unknown): Promise<CrmActionResult> {
  const parsed = createBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking details" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_crm_bookings")
    .insert({
      organization_id: parsed.data.orgId,
      created_by: ctx.user.id,
      title: parsed.data.title,
      artist_id: parsed.data.artistId ?? null,
      venue_id: parsed.data.venueId ?? null,
      event_type: parsed.data.eventType ?? "virtual_concert",
      contact_name: parsed.data.contactName ?? null,
      contact_email: parsed.data.contactEmail || null,
      contact_phone: parsed.data.contactPhone ?? null,
      projected_revenue_cents: parsed.data.projectedRevenueCents ?? 0,
      starts_at: parsed.data.startsAt ?? null,
      timezone: parsed.data.timezone ?? "America/New_York",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create booking" };

  const bookingId = data.id as string;
  await seedCrmChecklistForBooking(ctx.supabase, bookingId);
  await logCrmActivity(ctx.supabase, {
    orgId: parsed.data.orgId,
    bookingId,
    actorUserId: ctx.user.id,
    activityType: "booking_created",
    title: "Booking created",
    body: parsed.data.title,
  });
  await logAgencyAction(ctx.supabase, {
    organizationId: parsed.data.orgId,
    actorUserId: ctx.user.id,
    action: "crm_booking_created",
    metadata: {
      bookingId,
      title: parsed.data.title,
    },
  });

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${bookingId}`);
  return { ok: true, id: bookingId };
}

const updateStageSchema = z.object({
  orgId: z.string().uuid(),
  bookingId: z.string().uuid(),
  stage: z.enum(CRM_PIPELINE_STAGES.map((s) => s.id) as [CrmPipelineStageId, ...CrmPipelineStageId[]]),
});

export async function updateCrmBookingStageAction(input: unknown): Promise<CrmActionResult> {
  const parsed = updateStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid stage update" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data: existing } = await ctx.supabase
    .from("agency_crm_bookings")
    .select("stage, title")
    .eq("id", parsed.data.bookingId)
    .eq("organization_id", parsed.data.orgId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Booking not found" };

  const { error } = await ctx.supabase
    .from("agency_crm_bookings")
    .update({
      stage: parsed.data.stage,
      stage_changed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.bookingId);

  if (error) return { ok: false, error: error.message };

  await logCrmActivity(ctx.supabase, {
    orgId: parsed.data.orgId,
    bookingId: parsed.data.bookingId,
    actorUserId: ctx.user.id,
    activityType: "stage_changed",
    title: "Stage changed",
    body: `${crmStageLabel(existing.stage as string)} → ${crmStageLabel(parsed.data.stage)}`,
    metadata: { from: existing.stage, to: parsed.data.stage },
  });

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

const updateBookingSchema = z.object({
  orgId: z.string().uuid(),
  bookingId: z.string().uuid(),
  title: z.string().min(2).max(200).optional(),
  artistId: z.string().uuid().nullable().optional(),
  venueId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  eventType: z.string().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  timezone: z.string().optional(),
  expectedAttendance: z.number().int().nullable().optional(),
  ticketPriceCents: z.number().int().nullable().optional(),
  projectedRevenueCents: z.number().int().optional(),
  actualRevenueCents: z.number().int().optional(),
  contactName: z.string().nullable().optional(),
  contactEmail: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactWebsite: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
  recordingStatus: z.string().optional(),
  replayStatus: z.string().optional(),
  priority: z.string().optional(),
});

export async function updateCrmBookingAction(input: unknown): Promise<CrmActionResult> {
  const parsed = updateBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking update" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const d = parsed.data;
  if (d.title !== undefined) patch.title = d.title;
  if (d.artistId !== undefined) patch.artist_id = d.artistId;
  if (d.venueId !== undefined) patch.venue_id = d.venueId;
  if (d.assignedTo !== undefined) patch.assigned_to = d.assignedTo;
  if (d.eventType !== undefined) patch.event_type = d.eventType;
  if (d.startsAt !== undefined) patch.starts_at = d.startsAt;
  if (d.endsAt !== undefined) patch.ends_at = d.endsAt;
  if (d.timezone !== undefined) patch.timezone = d.timezone;
  if (d.expectedAttendance !== undefined) patch.expected_attendance = d.expectedAttendance;
  if (d.ticketPriceCents !== undefined) patch.ticket_price_cents = d.ticketPriceCents;
  if (d.projectedRevenueCents !== undefined) patch.projected_revenue_cents = d.projectedRevenueCents;
  if (d.actualRevenueCents !== undefined) patch.actual_revenue_cents = d.actualRevenueCents;
  if (d.contactName !== undefined) patch.contact_name = d.contactName;
  if (d.contactEmail !== undefined) patch.contact_email = d.contactEmail;
  if (d.contactPhone !== undefined) patch.contact_phone = d.contactPhone;
  if (d.contactWebsite !== undefined) patch.contact_website = d.contactWebsite;
  if (d.notes !== undefined) patch.notes = d.notes;
  if (d.internalNotes !== undefined) patch.internal_notes = d.internalNotes;
  if (d.recordingStatus !== undefined) patch.recording_status = d.recordingStatus;
  if (d.replayStatus !== undefined) patch.replay_status = d.replayStatus;
  if (d.priority !== undefined) patch.priority = d.priority;

  const { error } = await ctx.supabase
    .from("agency_crm_bookings")
    .update(patch)
    .eq("id", d.bookingId)
    .eq("organization_id", d.orgId);

  if (error) return { ok: false, error: error.message };

  await logCrmActivity(ctx.supabase, {
    orgId: d.orgId,
    bookingId: d.bookingId,
    actorUserId: ctx.user.id,
    activityType: "booking_updated",
    title: "Booking updated",
  });

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${d.bookingId}`);
  return { ok: true };
}

const createContactSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(200),
  contactType: z.string().optional(),
  company: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createCrmContactAction(input: unknown): Promise<CrmActionResult> {
  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid contact details" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_crm_contacts")
    .insert({
      organization_id: parsed.data.orgId,
      name: parsed.data.name,
      contact_type: parsed.data.contactType ?? "other",
      company: parsed.data.company ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      notes: parsed.data.notes ?? null,
      tags: parsed.data.tags ?? [],
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create contact" };

  revalidateCrm();
  return { ok: true, id: data.id as string };
}

const createTaskSchema = z.object({
  orgId: z.string().uuid(),
  bookingId: z.string().uuid(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  priority: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
});

export async function createCrmTaskAction(input: unknown): Promise<CrmActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid task" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_crm_tasks")
    .insert({
      organization_id: parsed.data.orgId,
      booking_id: parsed.data.bookingId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority ?? "medium",
      owner_id: parsed.data.ownerId ?? ctx.user.id,
      due_at: parsed.data.dueAt ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create task" };

  await logCrmActivity(ctx.supabase, {
    orgId: parsed.data.orgId,
    bookingId: parsed.data.bookingId,
    actorUserId: ctx.user.id,
    activityType: "task_created",
    title: "Task created",
    body: parsed.data.title,
  });

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true, id: data.id as string };
}

const updateTaskSchema = z.object({
  orgId: z.string().uuid(),
  taskId: z.string().uuid(),
  bookingId: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]).optional(),
  title: z.string().optional(),
  priority: z.string().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});

export async function updateCrmTaskAction(input: unknown): Promise<CrmActionResult> {
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid task update" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status !== undefined) {
    patch.status = parsed.data.status;
    if (parsed.data.status === "done") patch.completed_at = new Date().toISOString();
  }
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.priority !== undefined) patch.priority = parsed.data.priority;
  if (parsed.data.dueAt !== undefined) patch.due_at = parsed.data.dueAt;

  const { error } = await ctx.supabase
    .from("agency_crm_tasks")
    .update(patch)
    .eq("id", parsed.data.taskId);

  if (error) return { ok: false, error: error.message };

  if (parsed.data.status === "done") {
    await logCrmActivity(ctx.supabase, {
      orgId: parsed.data.orgId,
      bookingId: parsed.data.bookingId,
      actorUserId: ctx.user.id,
      activityType: "task_completed",
      title: "Task completed",
    });
  }

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

const createPaymentSchema = z.object({
  orgId: z.string().uuid(),
  bookingId: z.string().uuid(),
  paymentType: z.string(),
  amountCents: z.number().int().positive(),
  dueAt: z.string().datetime().optional(),
  description: z.string().optional(),
});

export async function createCrmPaymentAction(input: unknown): Promise<CrmActionResult> {
  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "view_revenue");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_crm_payments")
    .insert({
      organization_id: parsed.data.orgId,
      booking_id: parsed.data.bookingId,
      payment_type: parsed.data.paymentType,
      amount_cents: parsed.data.amountCents,
      due_at: parsed.data.dueAt ?? null,
      description: parsed.data.description ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create payment" };

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true, id: data.id as string };
}

const markPaymentPaidSchema = z.object({
  orgId: z.string().uuid(),
  paymentId: z.string().uuid(),
  bookingId: z.string().uuid(),
});

export async function markCrmPaymentPaidAction(input: unknown): Promise<CrmActionResult> {
  const parsed = markPaymentPaidSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment update" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "view_revenue");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_crm_payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.paymentId);

  if (error) return { ok: false, error: error.message };

  await logCrmActivity(ctx.supabase, {
    orgId: parsed.data.orgId,
    bookingId: parsed.data.bookingId,
    actorUserId: ctx.user.id,
    activityType: "payment_received",
    title: "Payment received",
  });

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

const createContractSchema = z.object({
  orgId: z.string().uuid(),
  bookingId: z.string().uuid(),
  title: z.string().min(1).max(200),
  expiresAt: z.string().datetime().optional(),
});

export async function createCrmContractAction(input: unknown): Promise<CrmActionResult> {
  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid contract" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_crm_contracts")
    .insert({
      organization_id: parsed.data.orgId,
      booking_id: parsed.data.bookingId,
      title: parsed.data.title,
      expires_at: parsed.data.expiresAt ?? null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create contract" };

  await logCrmActivity(ctx.supabase, {
    orgId: parsed.data.orgId,
    bookingId: parsed.data.bookingId,
    actorUserId: ctx.user.id,
    activityType: "contract_uploaded",
    title: "Contract created",
    body: parsed.data.title,
  });

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true, id: data.id as string };
}

const updateContractSchema = z.object({
  orgId: z.string().uuid(),
  contractId: z.string().uuid(),
  bookingId: z.string().uuid(),
  status: z.string(),
});

export async function updateCrmContractStatusAction(input: unknown): Promise<CrmActionResult> {
  const parsed = updateContractSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid contract update" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const patch: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.status === "signed") patch.signed_at = new Date().toISOString();

  const { error } = await ctx.supabase
    .from("agency_crm_contracts")
    .update(patch)
    .eq("id", parsed.data.contractId);

  if (error) return { ok: false, error: error.message };

  if (parsed.data.status === "signed") {
    await logCrmActivity(ctx.supabase, {
      orgId: parsed.data.orgId,
      bookingId: parsed.data.bookingId,
      actorUserId: ctx.user.id,
      activityType: "contract_signed",
      title: "Contract signed",
    });
  }

  revalidateCrm();
  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

const checklistSchema = z.object({
  orgId: z.string().uuid(),
  itemId: z.string().uuid(),
  bookingId: z.string().uuid(),
  completed: z.boolean(),
});

export async function toggleCrmChecklistItemAction(input: unknown): Promise<CrmActionResult> {
  const parsed = checklistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid checklist update" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_crm_checklist_items")
    .update({
      completed: parsed.data.completed,
      completed_at: parsed.data.completed ? new Date().toISOString() : null,
      completed_by: parsed.data.completed ? ctx.user.id : null,
    })
    .eq("id", parsed.data.itemId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

const addNoteSchema = z.object({
  orgId: z.string().uuid(),
  bookingId: z.string().uuid(),
  body: z.string().min(1),
  internal: z.boolean().optional(),
});

export async function addCrmNoteAction(input: unknown): Promise<CrmActionResult> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid note" };

  const ctx = await requireCrmStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const field = parsed.data.internal ? "internal_notes" : "notes";
  const { data: booking } = await ctx.supabase
    .from("agency_crm_bookings")
    .select(field)
    .eq("id", parsed.data.bookingId)
    .maybeSingle();

  const existing = (booking as Record<string, string | null> | null)?.[field] ?? "";
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${parsed.data.body}`;
  const updated = existing ? `${existing}\n\n${entry}` : entry;

  const { error } = await ctx.supabase
    .from("agency_crm_bookings")
    .update({ [field]: updated, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.bookingId);

  if (error) return { ok: false, error: error.message };

  await logCrmActivity(ctx.supabase, {
    orgId: parsed.data.orgId,
    bookingId: parsed.data.bookingId,
    actorUserId: ctx.user.id,
    activityType: "note_added",
    title: parsed.data.internal ? "Internal note added" : "Note added",
    body: parsed.data.body,
  });

  revalidatePath(`/agency/crm/bookings/${parsed.data.bookingId}`);
  return { ok: true };
}

export async function searchCrmAction(orgId: string, query: string) {
  const ctx = await requireCrmStaff(orgId);
  if (!ctx.ok) return [];
  const { searchCrm } = await import("@/lib/data/agency-crm");
  return searchCrm(ctx.supabase, orgId, query);
}
