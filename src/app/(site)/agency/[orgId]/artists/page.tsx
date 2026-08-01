import { AgencyArtistsPanel } from "@/components/agency/agency-artists-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { listAgencyManagedArtists } from "@/lib/data/agencies";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyArtistsPage({ params }: Props) {
  const { orgId } = await params;
  const roster = await listAgencyManagedArtists(orgId);

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
