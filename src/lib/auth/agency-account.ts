import type { SupabaseClient } from "@supabase/supabase-js";
import { agencyPath } from "@/lib/agency/sections";
import type { AgencyMemberRole } from "@/lib/agency/types";

export type AgencyAccountProfile = {
  role: "agency";
  primary_agency_id: string;
  agency_member_role: AgencyMemberRole;
};

/** Promote a profile to a first-class agency account (service role / trusted writer). */
export async function syncAgencyAccountProfile(
  admin: SupabaseClient,
  input: {
    userId: string;
    organizationId: string;
    memberRole: AgencyMemberRole;
  }
) {
  const { error } = await admin
    .from("profiles")
    .update({
      role: "agency",
      primary_agency_id: input.organizationId,
      agency_member_role: input.memberRole,
    })
    .eq("id", input.userId);

  if (error) throw error;
}

export function agencyDashboardPath(orgId: string): string {
  return agencyPath(orgId, "dashboard");
}

export function resolveAgencyRedirect(profile: {
  role: string;
  primary_agency_id?: string | null;
}): string | null {
  if (profile.role === "agency" && profile.primary_agency_id) {
    return agencyDashboardPath(profile.primary_agency_id);
  }
  return null;
}

export function isAgencyAccount(profile: { role: string } | null | undefined): boolean {
  return profile?.role === "agency";
}
