"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createNotification } from "@/lib/services/notifications.service";
import { syncSponsorAchievements } from "@/lib/sponsorship/sponsor-achievements";
import { generateContractDocument } from "@/lib/sponsorship/digital-contracts";
import type { PipelineStageId } from "@/lib/sponsorship/program-constants";

export type ProgramActionResult = { ok: true; id?: string } | { ok: false; error: string };

const applicationSchema = z.object({
  organizationName: z.string().min(2).max(160),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(40).optional(),
  companyWebsite: z.string().url().optional().or(z.literal("")),
  message: z.string().max(2000).optional(),
});

async function requireAdmin() {
  const profile = await requireRole([...ADMIN_ROLES]);
  if (!profile) return { ok: false as const, error: "Admin required" };
  if (!isSupabaseConfigured()) return { ok: false as const, error: "Supabase required" };
  return { ok: true as const, adminId: profile.id as string };
}

export async function submitFoundingPartnerApplicationAction(input: unknown): Promise<ProgramActionResult> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Unavailable" };

  const admin = getSupabaseAdmin();

  const { data: settings } = await admin
    .from("founding_partner_program_settings")
    .select("max_slots, program_active")
    .eq("id", true)
    .maybeSingle();

  if (settings?.program_active === false) {
    return { ok: false, error: "Founding Partner Program is not accepting applications" };
  }

  const { count: approved } = await admin
    .from("founding_partners")
    .select("id", { count: "exact", head: true });

  if ((approved ?? 0) >= ((settings?.max_slots as number) ?? 50)) {
    return { ok: false, error: "All Founding Partner slots are filled — join the waiting list via marketplace" };
  }

  const { data, error } = await admin
    .from("founding_partner_applications")
    .insert({
      organization_name: parsed.data.organizationName,
      contact_name: parsed.data.contactName ?? null,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone ?? null,
      company_website: parsed.data.companyWebsite || null,
      message: parsed.data.message ?? null,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  await admin.from("sponsorship_pipeline_deals").insert({
    title: `Founding Partner — ${parsed.data.organizationName}`,
    organization_name: parsed.data.organizationName,
    contact_name: parsed.data.contactName ?? null,
    contact_email: parsed.data.contactEmail,
    contact_phone: parsed.data.contactPhone ?? null,
    stage: "lead",
    estimated_value_cents: 0,
    application_id: data?.id,
    notes: parsed.data.message ?? null,
  });

  const { data: admins } = await admin.from("admins").select("user_id");
  for (const row of admins ?? []) {
    await createNotification({
      userId: row.user_id as string,
      type: "system",
      title: "Founding Partner application",
      body: `${parsed.data.organizationName} applied for the Founding Partner Program`,
      link: "/admin/founding-partners",
    });
  }

  revalidatePath("/admin/founding-partners");
  revalidatePath("/sponsor/partners");
  return { ok: true, id: data?.id as string };
}

export async function approveFoundingPartnerAction(input: {
  applicationId: string;
  organizationId: string;
  displayName: string;
}): Promise<ProgramActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();

  const { data: app } = await admin
    .from("founding_partner_applications")
    .select("*")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (!app) return { ok: false, error: "Application not found" };

  const { data: org } = await admin
    .from("sponsor_organizations")
    .select("logo_url, website_url")
    .eq("id", input.organizationId)
    .maybeSingle();

  const { data: partner, error } = await admin
    .from("founding_partners")
    .insert({
      organization_id: input.organizationId,
      application_id: input.applicationId,
      display_name: input.displayName,
      logo_url: org?.logo_url ?? null,
      website_url: org?.website_url ?? null,
      approved_by: ctx.adminId,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "Organization is already a Founding Partner" };
    return { ok: false, error: error.message };
  }

  await admin
    .from("founding_partner_applications")
    .update({ status: "approved", reviewed_by: ctx.adminId, reviewed_at: new Date().toISOString() })
    .eq("id", input.applicationId);

  await syncSponsorAchievements(input.organizationId);

  revalidatePath("/admin/founding-partners");
  revalidatePath("/sponsor/partners");
  return { ok: true, id: partner?.id as string };
}

export async function updateFoundingPartnerMaxSlotsAction(maxSlots: number): Promise<ProgramActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("founding_partner_program_settings")
    .update({ max_slots: maxSlots })
    .eq("id", true);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/founding-partners");
  return { ok: true };
}

export async function createPipelineDealAction(input: {
  title: string;
  organizationName?: string;
  contactEmail?: string;
  stage?: PipelineStageId;
  estimatedValueCents?: number;
}): Promise<ProgramActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sponsorship_pipeline_deals")
    .insert({
      title: input.title,
      organization_name: input.organizationName ?? null,
      contact_email: input.contactEmail ?? null,
      stage: input.stage ?? "lead",
      estimated_value_cents: input.estimatedValueCents ?? 0,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true, id: data?.id as string };
}

export async function updatePipelineStageAction(dealId: string, stage: PipelineStageId): Promise<ProgramActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("sponsorship_pipeline_deals")
    .update({ stage, stage_changed_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true };
}

export async function addPipelineInteractionAction(input: {
  dealId: string;
  interactionType: string;
  subject?: string;
  body: string;
}): Promise<ProgramActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin.from("sponsorship_pipeline_interactions").insert({
    deal_id: input.dealId,
    interaction_type: input.interactionType,
    subject: input.subject ?? null,
    body: input.body,
    created_by: ctx.adminId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true };
}

export async function generateDigitalContractAction(contractId: string): Promise<ProgramActionResult & { documentId?: string }> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const doc = await generateContractDocument(contractId, ctx.adminId);
  if (!doc) return { ok: false, error: "Could not generate contract" };

  revalidatePath("/admin/sponsorships");
  return { ok: true, id: doc.id, documentId: doc.id };
}

export async function signContractDocumentAction(input: {
  documentId: string;
  signedByName: string;
  signedByEmail: string;
}): Promise<ProgramActionResult> {
  const ctx = await requireAdmin();
  if (!ctx.ok) return ctx;

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("sponsorship_contract_documents")
    .update({
      signed_at: new Date().toISOString(),
      signed_by_name: input.signedByName,
      signed_by_email: input.signedByEmail,
      status: "signed",
    })
    .eq("id", input.documentId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/sponsorships");
  return { ok: true };
}
