import type { Metadata } from "next";
import { AgencyCrmDashboardPanel } from "@/components/agency/crm/agency-crm-dashboard-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { Button } from "@/components/ui/button";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getCrmDashboardPayload } from "@/lib/data/agency-crm";
import { getSessionUser } from "@/lib/auth/session";
import { requireMonetizationFeature } from "@/lib/features/guard";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Booking CRM" };

const EMPTY_DASHBOARD = {
  upcomingEvents: [],
  todaysTasks: [],
  pendingContracts: [],
  pendingPayments: [],
  recentActivity: [],
  recentMessages: [],
  upcomingDeadlines: [],
  bookingsByStage: [],
  monthlyRevenueCents: 0,
  expectedRevenueCents: 0,
  ticketSalesCount: 0,
  topArtists: [],
  recentSponsorships: [],
  calendarPreview: [],
  performanceMetrics: {
    conversionRate: 0,
    avgTicketPriceCents: 0,
    repeatCustomers: 0,
    activeBookings: 0,
    completedBookings: 0,
  },
};

export default async function AgencyCrmDashboardPage() {
  await requireMonetizationFeature("agency_crm", "/agency");
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  const data =
    isSupabaseConfigured() && orgId
      ? await getCrmDashboardPayload(await createClient(), orgId)
      : EMPTY_DASHBOARD;

  return (
    <>
      <AgencyPageHeader
        title="Booking CRM"
        subtitle="Manage every digital entertainment booking from first inquiry to completed event — pipeline, contacts, contracts, payments, and marketing in one place."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" href="/agency/crm/pipeline">Pipeline</Button>
        <Button size="sm" variant="outline" href="/agency/crm/contacts">Contacts</Button>
        <Button size="sm" variant="outline" href="/agency/crm/calendar">Calendar</Button>
        <Button size="sm" variant="outline" href="/agency/crm/analytics">Analytics</Button>
      </div>
      <AgencyCrmDashboardPanel data={data} />
    </>
  );
}
