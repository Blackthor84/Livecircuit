import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listAgencyMembershipsForUserAdmin } from "@/lib/agency/membership.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

function logAgencyData(step: string, data?: Record<string, unknown>) {
  console.info(`[Agency Data] ${step}`, data ?? {});
}

export type AgencyDataClientResult = {
  client: SupabaseClient;
  source: "user" | "admin_fallback";
};

/**
 * Resolve the Supabase client for org-scoped agency reads.
 * Falls back to service role when the user client returns no rows but membership + data exist (RLS mismatch).
 */
export async function getAgencyDataClient(
  orgId: string,
  userId: string
): Promise<AgencyDataClientResult | null> {
  if (!isSupabaseConfigured()) return null;

  const userClient = await createClient();
  const admin = getSupabaseAdmin();

  const { data: userProbe, error: userProbeError } = await userClient
    .from("agency_managed_artists")
    .select("id")
    .eq("organization_id", orgId)
    .limit(1);

  if (!userProbeError && (userProbe?.length ?? 0) > 0) {
    return { client: userClient, source: "user" };
  }

  const memberships = await listAgencyMembershipsForUserAdmin(admin, userId);
  const isMember = memberships.some((row) => row.organization_id === orgId);
  if (!isMember) {
    return { client: userClient, source: "user" };
  }

  const { count: adminRosterCount } = await admin
    .from("agency_managed_artists")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);

  if ((adminRosterCount ?? 0) > 0) {
    logAgencyData("Using admin fallback for agency data reads", {
      orgId,
      userId,
      reason: userProbeError?.message ?? "User-scoped roster query returned no rows",
      adminRosterCount,
    });
    return { client: admin, source: "admin_fallback" };
  }

  return { client: userClient, source: "user" };
}

/** Probe org-scoped table counts via service role (health / auto-seed decisions). */
export async function countAgencyOrgRows(
  admin: SupabaseClient,
  orgId: string
): Promise<{ roster: number; bookings: number; calendar: number }> {
  const countFor = async (table: string) => {
    const { count } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId);
    return count ?? 0;
  };

  return {
    roster: await countFor("agency_managed_artists"),
    bookings: await countFor("agency_booking_requests"),
    calendar: await countFor("agency_calendar_events"),
  };
}
