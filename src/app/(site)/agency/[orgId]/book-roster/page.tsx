import { AgencyBookRosterPanel } from "@/components/agency/agency-book-roster-panel";
import { AgencyBulkJobsPanel } from "@/components/agency/agency-bulk-jobs-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import {
  listAgencyBackgroundJobs,
} from "@/lib/data/agency-features";
import {
  listAgencyBookingMatches,
  listAgencyBookingRequests,
  listAgencyManagedArtists,
} from "@/lib/data/agencies";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyBookRosterPage({ params }: Props) {
  const { orgId } = await params;
  const [roster, requests, matches, jobs] = await Promise.all([
    listAgencyManagedArtists(orgId),
    listAgencyBookingRequests(orgId),
    listAgencyBookingMatches(orgId),
    listAgencyBackgroundJobs(orgId),
  ]);

  return (
    <>
      <AgencyPageHeader
        title="Book Entire Roster"
        subtitle="Select artists, dates, and markets — then Auto Match to find the best digital arenas for your roster."
      />
      <div className="space-y-8">
        <AgencyBookRosterPanel orgId={orgId} roster={roster} requests={requests} matches={matches} />
        <AgencyBulkJobsPanel orgId={orgId} jobs={jobs as never} />
      </div>
    </>
  );
}
