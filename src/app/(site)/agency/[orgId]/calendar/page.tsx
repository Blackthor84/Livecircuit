import { AgencyCalendarPanel } from "@/components/agency/agency-calendar-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { listAgencyCalendarEvents } from "@/lib/data/agency-features";
import { listAgencyManagedArtists } from "@/lib/data/agencies";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyCalendarPage({ params }: Props) {
  const { orgId } = await params;
  const [events, roster] = await Promise.all([
    listAgencyCalendarEvents(orgId),
    listAgencyManagedArtists(orgId),
  ]);

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
