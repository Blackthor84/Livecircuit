import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyTeamPanel } from "@/components/agency/agency-team-panel";
import { getAgencyOrganization, listAgencyMembers } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyTeamPage({ params }: Props) {
  const { orgId } = await params;
  const user = await getSessionUser();
  const ctx = user ? await getAgencyOrganization(orgId, user.id) : null;
  const members = await listAgencyMembers(orgId);

  return (
    <>
      <AgencyPageHeader
        title="Team management"
        subtitle="Role-based access for owners, booking managers, artist managers, marketing, finance, and assistants."
      />
      <AgencyTeamPanel members={members} plan={(ctx?.organization.plan as string) ?? "starter"} />
    </>
  );
}
