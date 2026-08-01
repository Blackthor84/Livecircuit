import { AgencyCalendarPanel } from "@/components/agency/agency-calendar-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/session.server";
import { listAgencyCalendarEvents } from "@/lib/data/agency-features";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyCalendarPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";

  const [events, roster] = orgId
    ? await Promise.all([listAgencyCalendarEvents(orgId), listAgencyManagedArtists(orgId)])
    : [[], []];

  return (
    <>
      <AgencyPageHeader
        title="Calendar"
        subtitle="Day, week, and month views with drag-and-drop scheduling and conflict detection."
      />
      <AgencyCalendarPanel orgId={orgId} events={events} roster={roster} />
    </>
  );
}
