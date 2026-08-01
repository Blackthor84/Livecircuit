import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyTeamPanel } from "@/components/agency/agency-team-panel";
import { loadAgencySessionForUser } from "@/lib/agency/session";
import { listAgencyMembers } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyTeamPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const members = orgId ? await listAgencyMembers(orgId) : [];

  return (
    <>
      <AgencyPageHeader
        title="Team management"
        subtitle="Role-based access for owners, booking managers, artist managers, marketing, finance, and assistants."
      />
      <AgencyTeamPanel
        members={members}
        plan={(sessionResult?.ok ? (sessionResult.session.organization.plan as string) : null) ?? "starter"}
      />
    </>
  );
}
