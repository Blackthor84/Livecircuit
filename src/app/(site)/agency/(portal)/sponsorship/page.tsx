import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencySponsorshipPanel } from "@/components/agency/agency-sponsorship-panel";
import { loadAgencySessionForUser } from "@/lib/agency/session.server";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { listAgencySponsorshipProposals } from "@/lib/data/agency-features";
import { browseSponsorshipMarketplace } from "@/lib/sponsorship/marketplace";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencySponsorshipPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";

  const [proposals, listings, roster] = orgId
    ? await Promise.all([
        listAgencySponsorshipProposals(orgId),
        browseSponsorshipMarketplace({ status: "available" }),
        listAgencyManagedArtists(orgId),
      ])
    : [[], [], []];

  return (
    <>
      <AgencyPageHeader
        title="Sponsorship"
        subtitle="Browse sponsors, submit proposals, manage contracts, and track campaign performance."
      />
      <AgencySponsorshipPanel orgId={orgId} proposals={proposals} listings={listings} roster={roster} />
    </>
  );
}
