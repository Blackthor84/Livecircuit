import { AgencyArtistsPanel } from "@/components/agency/agency-artists-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyArtistsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const roster = orgId ? await listAgencyManagedArtists(orgId) : [];

  return (
    <>
      <AgencyPageHeader
        title="Artist management"
        subtitle="Add, approve, suspend, and manage your full roster — biographies, riders, schedules, and contracts."
      />
      <AgencyArtistsPanel orgId={orgId} roster={roster} />
    </>
  );
}
