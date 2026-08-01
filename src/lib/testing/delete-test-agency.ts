import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createTestCreationLog, logTestStep } from "@/lib/testing/step-errors";

export async function deleteTestAgencyOrganization(input: {
  orgId: string;
  deletedBy: string;
  deleteAuthUsers?: boolean;
}): Promise<{ ok: true; message: string; deletedUsers: number } | { ok: false; error: string }> {
  const admin = getSupabaseAdmin();
  const log = createTestCreationLog();
  const deleteAuthUsers = input.deleteAuthUsers ?? false;

  const { data: org, error: orgError } = await admin
    .from("agency_organizations")
    .select("id, name, slug, is_test")
    .eq("id", input.orgId)
    .maybeSingle();

  if (orgError) return { ok: false, error: orgError.message };
  if (!org) return { ok: false, error: "Agency organization not found." };
  if (!org.is_test) {
    return { ok: false, error: "Only test organizations can be deleted from Testing Center." };
  }

  logTestStep(log, `Deleting test organization ${org.name as string} (${org.slug as string})...`);

  const { data: members } = await admin
    .from("agency_organization_members")
    .select("user_id")
    .eq("organization_id", input.orgId);

  const { data: linkedProfiles } = await admin
    .from("profiles")
    .select("id, is_test_account")
    .eq("primary_agency_id", input.orgId);

  const userIds = new Set<string>();
  for (const member of members ?? []) userIds.add(member.user_id as string);
  for (const profile of linkedProfiles ?? []) userIds.add(profile.id as string);

  await admin.from("profiles").update({ primary_agency_id: null }).eq("primary_agency_id", input.orgId);

  const { error: deleteOrgError } = await admin.from("agency_organizations").delete().eq("id", input.orgId);
  if (deleteOrgError) return { ok: false, error: deleteOrgError.message };

  logTestStep(log, "Organization record and cascaded agency data removed.");

  let deletedUsers = 0;
  if (deleteAuthUsers) {
    for (const userId of userIds) {
      const { data: profile } = await admin
        .from("profiles")
        .select("is_test_account")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.is_test_account) continue;

      const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
      if (!authDeleteError) {
        deletedUsers += 1;
        logTestStep(log, `Deleted test Auth user ${userId}.`);
      }
    }
  }

  return {
    ok: true,
    message: deleteAuthUsers
      ? `Deleted test organization "${org.name as string}" and ${deletedUsers} Auth user(s).`
      : `Deleted test organization "${org.name as string}". Auth users were kept.`,
    deletedUsers,
  };
}
