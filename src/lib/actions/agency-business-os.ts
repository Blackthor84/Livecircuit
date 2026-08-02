"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { hasAgencyPermission } from "@/lib/agency/permissions";
import { getAgencyMembership } from "@/lib/data/agencies";
import { COUNTDOWN_MILESTONES } from "@/lib/agency/business-os-constants";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type OsActionResult = { ok: true; id?: string } | { ok: false; error: string };

const OS_PATHS = ["/agency/finance", "/agency/marketing", "/agency/operations", "/agency/intelligence", "/agency/assets", "/agency/festivals"];

function revalidateOs() {
  for (const p of OS_PATHS) revalidatePath(p);
}

async function requireStaff(orgId: string, permission?: "book_events" | "view_revenue" | "manage_sponsorship") {
  const user = await getSessionUser();
  if (!user || !isSupabaseConfigured()) return { ok: false as const, error: "Sign in required" };
  const role = await getAgencyMembership(orgId, user.id);
  if (!role) return { ok: false as const, error: "Agency access required" };
  if (permission && !hasAgencyPermission(role, permission)) return { ok: false as const, error: "Permission denied" };
  return { ok: true as const, user, supabase: await createClient() };
}

export async function createAgencyPayoutRuleAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({
    orgId: z.string().uuid(),
    name: z.string().min(1),
    splits: z.array(z.object({ role: z.string(), percent: z.number() })),
    isDefault: z.boolean().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid split rule" };
  const ctx = await requireStaff(parsed.data.orgId, "view_revenue");
  if (!ctx.ok) return ctx;
  const { data, error } = await ctx.supabase.from("agency_payout_rules").insert({
    organization_id: parsed.data.orgId, name: parsed.data.name, splits: parsed.data.splits,
    is_default: parsed.data.isDefault ?? false, created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidateOs(); revalidatePath("/agency/finance");
  return { ok: true, id: data.id as string };
}

export async function createAgencyInvoiceAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({
    orgId: z.string().uuid(), recipientName: z.string(), amountCents: z.number().int().positive(),
    invoiceType: z.string().optional(), recipientEmail: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invoice" };
  const ctx = await requireStaff(parsed.data.orgId, "view_revenue");
  if (!ctx.ok) return ctx;
  const num = `INV-${Date.now().toString(36).toUpperCase()}`;
  const { data, error } = await ctx.supabase.from("agency_invoices").insert({
    organization_id: parsed.data.orgId, invoice_number: num, recipient_name: parsed.data.recipientName,
    recipient_email: parsed.data.recipientEmail ?? null, amount_cents: parsed.data.amountCents,
    invoice_type: parsed.data.invoiceType ?? "invoice", created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/finance");
  return { ok: true, id: data.id as string };
}

export async function createMarketingCampaignAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({
    orgId: z.string().uuid(), name: z.string(), channel: z.string(), content: z.string(),
    artistId: z.string().uuid().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid campaign" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { data, error } = await ctx.supabase.from("agency_marketing_campaigns").insert({
    organization_id: parsed.data.orgId, name: parsed.data.name, channel: parsed.data.channel,
    content: parsed.data.content, artist_id: parsed.data.artistId ?? null, created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/marketing");
  return { ok: true, id: data.id as string };
}

export async function createReferralLinkAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({ orgId: z.string().uuid(), label: z.string().optional(), artistId: z.string().uuid().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid referral" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const code = `ref-${Math.random().toString(36).slice(2, 10)}`;
  const { data, error } = await ctx.supabase.from("agency_referral_links").insert({
    organization_id: parsed.data.orgId, code, label: parsed.data.label ?? null,
    artist_id: parsed.data.artistId ?? null, created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/marketing");
  return { ok: true, id: data.id as string };
}

export async function createCountdownScheduleAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({ orgId: z.string().uuid(), eventStartsAt: z.string().datetime(), bookingId: z.string().uuid().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid countdown" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { data, error } = await ctx.supabase.from("agency_countdown_schedules").insert({
    organization_id: parsed.data.orgId, event_starts_at: parsed.data.eventStartsAt,
    booking_id: parsed.data.bookingId ?? null, milestones: COUNTDOWN_MILESTONES,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/marketing");
  return { ok: true, id: data.id as string };
}

export async function updateApprovalStatusAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({ orgId: z.string().uuid(), requestId: z.string().uuid(), status: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid approval update" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("agency_approval_requests").update({ status: parsed.data.status, updated_at: new Date().toISOString() }).eq("id", parsed.data.requestId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/operations");
  return { ok: true };
}

export async function createAgencyAssetAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({
    orgId: z.string().uuid(), name: z.string(), category: z.string(), storagePath: z.string(), tags: z.array(z.string()).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid asset" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { data, error } = await ctx.supabase.from("agency_assets").insert({
    organization_id: parsed.data.orgId, name: parsed.data.name, category: parsed.data.category,
    storage_path: parsed.data.storagePath, tags: parsed.data.tags ?? [], uploaded_by: ctx.user.id,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/assets");
  return { ok: true, id: data.id as string };
}

export async function createAgencyFestivalAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({
    orgId: z.string().uuid(), name: z.string().min(2), slug: z.string().min(2),
    startsAt: z.string().datetime(), endsAt: z.string().datetime(), description: z.string().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid festival" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { data, error } = await ctx.supabase.from("agency_festivals").insert({
    organization_id: parsed.data.orgId, name: parsed.data.name, slug: parsed.data.slug,
    starts_at: parsed.data.startsAt, ends_at: parsed.data.endsAt, description: parsed.data.description ?? null,
    created_by: ctx.user.id,
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/agency/festivals");
  return { ok: true, id: data.id as string };
}

export async function addFestivalArtistAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({ orgId: z.string().uuid(), festivalId: z.string().uuid(), artistId: z.string().uuid(), venueId: z.string().uuid().optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid lineup entry" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("agency_festival_artists").insert({
    festival_id: parsed.data.festivalId, artist_id: parsed.data.artistId, venue_id: parsed.data.venueId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/agency/festivals/${parsed.data.festivalId}`);
  return { ok: true };
}

export async function addFestivalPassAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({
    orgId: z.string().uuid(), festivalId: z.string().uuid(), name: z.string(), passType: z.string(), priceCents: z.number().int().positive(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid pass" };
  const ctx = await requireStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;
  const { error } = await ctx.supabase.from("agency_festival_passes").insert({
    festival_id: parsed.data.festivalId, name: parsed.data.name, pass_type: parsed.data.passType, price_cents: parsed.data.priceCents,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/agency/festivals/${parsed.data.festivalId}`);
  return { ok: true };
}

export async function generateCampaignFromTemplateAction(input: unknown): Promise<OsActionResult> {
  const parsed = z.object({ orgId: z.string().uuid(), channel: z.string(), templatePreview: z.string(), name: z.string() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid template" };
  return createMarketingCampaignAction({
    orgId: parsed.data.orgId, name: parsed.data.name, channel: parsed.data.channel, content: parsed.data.templatePreview,
  });
}
