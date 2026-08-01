import { AgencyBookRosterPanel } from "@/components/agency/agency-book-roster-panel";
import { AgencyBulkJobsPanel } from "@/components/agency/agency-bulk-jobs-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listAgencyBackgroundJobs } from "@/lib/data/agency-features";
import {
  listAgencyBookingMatches,
  listAgencyBookingRequests,
  listAgencyManagedArtists,
} from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyBookRosterPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";

  const [roster, requests, matches, jobs] = orgId
    ? await Promise.all([
        listAgencyManagedArtists(orgId),
        listAgencyBookingRequests(orgId),
        listAgencyBookingMatches(orgId),
        listAgencyBackgroundJobs(orgId),
      ])
    : [[], [], [], []];

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
