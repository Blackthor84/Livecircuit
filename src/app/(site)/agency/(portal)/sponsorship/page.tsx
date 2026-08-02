import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsSponsorMatchingPanel } from "@/components/agency/os/agency-os-sponsor-matching-panel";
import { AgencySponsorshipPanel } from "@/components/agency/agency-sponsorship-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { listAgencySponsorshipProposals } from "@/lib/data/agency-features";
import { listAgencySponsorMatches } from "@/lib/data/agency-business-os";
import { browseSponsorshipMarketplace } from "@/lib/sponsorship/marketplace";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencySponsorshipPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";

  const [proposals, listings, roster, matches] = orgId && user
    ? await Promise.all([
        listAgencySponsorshipProposals(orgId),
        browseSponsorshipMarketplace({ status: "available" }),
        listAgencyManagedArtists(orgId, user.id),
        isSupabaseConfigured() ? listAgencySponsorMatches(await createClient(), orgId) : Promise.resolve([]),
      ])
    : [[], [], [], []];

  return (
    <>
      <AgencyPageHeader
        title="Sponsorship"
        subtitle="AI sponsor matching, marketplace browse, proposals, contracts, and campaign analytics."
      />
      <div className="mb-8">
        <AgencyOsSponsorMatchingPanel matches={matches} />
      </div>
      <AgencySponsorshipPanel orgId={orgId} proposals={proposals} listings={listings} roster={roster} />
    </>
  );
}
