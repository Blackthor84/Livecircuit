import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencySponsorshipPanel } from "@/components/agency/agency-sponsorship-panel";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { listAgencySponsorshipProposals } from "@/lib/data/agency-features";
import { browseSponsorshipMarketplace } from "@/lib/sponsorship/marketplace";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencySponsorshipPage({ params }: Props) {
  const { orgId } = await params;
  const [proposals, listings, roster] = await Promise.all([
    listAgencySponsorshipProposals(orgId),
    browseSponsorshipMarketplace({ status: "available" }),
    listAgencyManagedArtists(orgId),
  ]);

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
