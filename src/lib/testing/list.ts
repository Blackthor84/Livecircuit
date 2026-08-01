import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AGENCY_MEMBER_ROLE_LABELS } from "@/lib/agency/permissions";
import type { AgencyMemberRole } from "@/lib/agency/types";

export type TestAccountRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  role: string;
  test_scenario: string | null;
  test_created_at: string | null;
  avatar_url: string | null;
  primary_agency_id: string | null;
  agency_member_role: string | null;
  artist?: { stage_name: string; slug: string } | null;
  agency?: { name: string; plan: string } | null;
};

export async function listTestAccounts(limit = 100): Promise<TestAccountRow[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("profiles")
    .select(
      "id, username, display_name, role, test_scenario, test_created_at, avatar_url, primary_agency_id, agency_member_role, artists(stage_name, slug), agency_organizations:primary_agency_id(name, plan)"
    )
    .eq("is_test_account", true)
    .order("test_created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const artists = row.artists as { stage_name: string; slug: string } | { stage_name: string; slug: string }[] | null;
    const agencyOrg = row.agency_organizations as { name: string; plan: string } | { name: string; plan: string }[] | null;
    const agency = Array.isArray(agencyOrg) ? agencyOrg[0] ?? null : agencyOrg;
    return {
      id: row.id as string,
      username: row.username as string | null,
      display_name: row.display_name as string | null,
      role: row.role as string,
      test_scenario: row.test_scenario as string | null,
      test_created_at: row.test_created_at as string | null,
      avatar_url: row.avatar_url as string | null,
      primary_agency_id: row.primary_agency_id as string | null,
      agency_member_role: row.agency_member_role as string | null,
      artist: Array.isArray(artists) ? artists[0] ?? null : artists,
      agency: agency ?? null,
    };
  });
}

export function formatTestAccountRoleLabel(account: TestAccountRow): string {
  if (account.role === "agency") {
    const role = account.agency_member_role as AgencyMemberRole | null;
    if (role) return AGENCY_MEMBER_ROLE_LABELS[role] ?? "Agency";
    return "Agency";
  }
  return account.role.toUpperCase();
}

export async function countTestAccounts() {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_test_account", true);
  return count ?? 0;
}
