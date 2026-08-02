import type { Metadata } from "next";
import { AgencyCalendarPanel } from "@/components/agency/agency-calendar-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { Button } from "@/components/ui/button";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listAgencyCalendarEvents } from "@/lib/data/agency-features";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "CRM Calendar" };

export default async function AgencyCrmCalendarPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  const [events, roster] = orgId && user
    ? await Promise.all([
        listAgencyCalendarEvents(orgId, user.id),
        listAgencyManagedArtists(orgId, user.id),
      ])
    : [[], []];

  return (
    <>
      <AgencyPageHeader
        title="Booking Calendar"
        subtitle="Monthly, weekly, and daily views with drag-and-drop scheduling, conflict detection, and artist availability. Google Calendar and Outlook sync ready."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled>
          Google Calendar sync (coming soon)
        </Button>
        <Button size="sm" variant="outline" disabled>
          Outlook sync (coming soon)
        </Button>
        <Button size="sm" variant="ghost" href="/agency/calendar">
          Legacy calendar
        </Button>
      </div>
      {orgId ? (
        <AgencyCalendarPanel orgId={orgId} events={events} roster={roster} />
      ) : null}
    </>
  );
}
