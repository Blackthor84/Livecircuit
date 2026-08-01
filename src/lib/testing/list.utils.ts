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

export function formatTestAccountRoleLabel(account: TestAccountRow): string {
  if (account.role === "agency") {
    const role = account.agency_member_role as AgencyMemberRole | null;
    if (role) return AGENCY_MEMBER_ROLE_LABELS[role] ?? "Agency";
    return "Agency";
  }
  return account.role.toUpperCase();
}
