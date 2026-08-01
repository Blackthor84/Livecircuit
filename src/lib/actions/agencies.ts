"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { hasAgencyPermission } from "@/lib/agency/permissions";
import { agencyDashboardPath, agencyPortalPath, revalidateAgencyPortalPaths } from "@/lib/agency/sections";
import type { AgencyMemberRole, AgencyPermissions } from "@/lib/agency/types";
import {
  canAgencyAddArtist,
  getAgencyMembership,
  getAgencyOrganization,
  listAgencyManagedArtists,
  logAgencyAction,
  runAgencyAutoMatch,
} from "@/lib/data/agencies";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { syncAgencyAccountProfile } from "@/lib/auth/agency-account";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export type AgencyActionResult = { ok: true } | { ok: false; error: string };

const createAgencySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
  billingEmail: z.string().email().optional(),
});

const inviteArtistSchema = z.object({
  orgId: z.string().uuid(),
  artistId: z.string().uuid(),
});

const bookRosterSchema = z.object({
  orgId: z.string().uuid(),
  title: z.string().min(2).max(200),
  artistIds: z.array(z.string().uuid()).min(1),
  preferredStates: z.array(z.string()).optional(),
  preferredGenres: z.array(z.string()).optional(),
  preferredTicketPriceCents: z.number().int().positive().optional(),
  isBulk: z.boolean().optional(),
});

async function requireAgencyStaff(orgId: string, permission?: keyof AgencyPermissions) {
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

export async function createAgencyOrganizationAction(input: unknown): Promise<AgencyActionResult & { orgId?: string }> {
  const parsed = createAgencySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid agency details" };

  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sign in required" };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase required" };

  const supabase = await createClient();

  const { data: org, error } = await supabase
    .from("agency_organizations")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      billing_email: parsed.data.billingEmail ?? user.email,
      plan: "starter",
    })
    .select("id")
    .single();

  if (error || !org) return { ok: false, error: error?.message ?? "Failed to create agency" };

  await supabase.from("agency_organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  const admin = getSupabaseAdmin();
  await syncAgencyAccountProfile(admin, {
    userId: user.id,
    organizationId: org.id as string,
    memberRole: "owner",
  });

  revalidatePath("/agency");
  return { ok: true, orgId: org.id as string };
}

export async function inviteAgencyArtistAction(input: unknown): Promise<AgencyActionResult> {
  const parsed = inviteArtistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid invite" };

  const ctx = await requireAgencyStaff(parsed.data.orgId, "manage_roster");
  if (!ctx.ok) return ctx;

  const orgCtx = await getAgencyOrganization(parsed.data.orgId, ctx.user.id);
  if (!orgCtx) return { ok: false, error: "Agency not found" };

  const roster = await listAgencyManagedArtists(parsed.data.orgId);
  const canAdd = await canAgencyAddArtist(
    parsed.data.orgId,
    orgCtx.organization.plan as string,
    roster.length
  );
  if (!canAdd) return { ok: false, error: "Artist limit reached for your plan" };

  const { error } = await ctx.supabase.from("agency_managed_artists").insert({
    organization_id: parsed.data.orgId,
    artist_id: parsed.data.artistId,
    status: "pending",
    invited_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  await logAgencyAction(ctx.supabase, {
    organizationId: parsed.data.orgId,
    actorUserId: ctx.user.id,
    artistId: parsed.data.artistId,
    action: "artist_invited",
  });

  revalidatePath(agencyPortalPath("artists"));
  return { ok: true };
}

export async function updateAgencyArtistStatusAction(input: {
  orgId: string;
  rosterId: string;
  status: "active" | "suspended" | "ended";
}): Promise<AgencyActionResult> {
  const ctx = await requireAgencyStaff(input.orgId, "manage_roster");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_managed_artists")
    .update({
      status: input.status,
      approved_at: input.status === "active" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.rosterId)
    .eq("organization_id", input.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(agencyPortalPath("artists"));
  return { ok: true };
}

export async function createBookRosterRequestAction(input: unknown): Promise<AgencyActionResult & { requestId?: string }> {
  const parsed = bookRosterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking request" };

  const ctx = await requireAgencyStaff(parsed.data.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { data, error } = await ctx.supabase
    .from("agency_booking_requests")
    .insert({
      organization_id: parsed.data.orgId,
      created_by: ctx.user.id,
      title: parsed.data.title,
      artist_ids: parsed.data.artistIds,
      preferred_states: parsed.data.preferredStates ?? [],
      preferred_genres: parsed.data.preferredGenres ?? [],
      preferred_ticket_price_cents: parsed.data.preferredTicketPriceCents ?? null,
      is_bulk: parsed.data.isBulk ?? parsed.data.artistIds.length > 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create request" };

  await logAgencyAction(ctx.supabase, {
    organizationId: parsed.data.orgId,
    actorUserId: ctx.user.id,
    action: "booking_request_created",
    metadata: { requestId: data.id },
  });

  revalidatePath(agencyPortalPath("book-roster"));
  return { ok: true, requestId: data.id as string };
}

export async function runAutoMatchAction(orgId: string, requestId: string): Promise<AgencyActionResult & { matchCount?: number }> {
  const ctx = await requireAgencyStaff(orgId, "book_events");
  if (!ctx.ok) return ctx;

  const matches = await runAgencyAutoMatch(ctx.supabase, orgId, requestId);
  revalidatePath(agencyPortalPath("book-roster"));
  return { ok: true, matchCount: matches.length };
}

export async function updateBookingMatchStatusAction(input: {
  orgId: string;
  matchId: string;
  status: "accepted" | "rejected";
}): Promise<AgencyActionResult> {
  const ctx = await requireAgencyStaff(input.orgId, "book_events");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase
    .from("agency_booking_matches")
    .update({ status: input.status, updated_at: new Date().toISOString() })
    .eq("id", input.matchId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(agencyPortalPath("book-roster"));
  return { ok: true };
}

export async function inviteAgencyMemberAction(input: {
  orgId: string;
  userId: string;
  role: AgencyMemberRole;
}): Promise<AgencyActionResult> {
  const ctx = await requireAgencyStaff(input.orgId, "manage_team");
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.from("agency_organization_members").insert({
    organization_id: input.orgId,
    user_id: input.userId,
    role: input.role,
    invited_by: ctx.user.id,
    invited_at: new Date().toISOString(),
    accepted_at: new Date().toISOString(),
  });

  if (error) return { ok: false, error: error.message };

  const admin = getSupabaseAdmin();
  await syncAgencyAccountProfile(admin, {
    userId: input.userId,
    organizationId: input.orgId,
    memberRole: input.role,
  });

  revalidatePath(agencyPortalPath("team"));
  return { ok: true };
}

export async function updateAgencyProfileAction(input: {
  orgId: string;
  name?: string;
  biography?: string;
  websiteUrl?: string;
  genres?: string[];
}): Promise<AgencyActionResult> {
  const ctx = await requireAgencyStaff(input.orgId);
  if (!ctx.ok) return ctx;
  if (!hasAgencyPermission(ctx.role, "manage_team") && ctx.role !== "owner" && ctx.role !== "admin") {
    return { ok: false, error: "Permission denied" };
  }

  const { error } = await ctx.supabase
    .from("agency_organizations")
    .update({
      ...(input.name ? { name: input.name } : {}),
      ...(input.biography !== undefined ? { biography: input.biography } : {}),
      ...(input.websiteUrl !== undefined ? { website_url: input.websiteUrl } : {}),
      ...(input.genres ? { genres: input.genres } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orgId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(agencyPortalPath("profile"));
  return { ok: true };
}
