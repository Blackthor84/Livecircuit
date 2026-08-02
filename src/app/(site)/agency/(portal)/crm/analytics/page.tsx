import type { Metadata } from "next";
import { AgencyCrmAnalyticsPanel } from "@/components/agency/crm/agency-crm-analytics-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getCrmAnalyticsPayload } from "@/lib/data/agency-crm";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "CRM Analytics" };

const EMPTY_ANALYTICS = {
  agencyRevenueCents: 0,
  revenueByArtist: [],
  revenueByEvent: [],
  ticketSales: [],
  attendance: [],
  conversionRate: 0,
  avgTicketPriceCents: 0,
  repeatCustomers: 0,
  sponsorRevenueCents: 0,
  growthTrend: [],
};

export default async function AgencyCrmAnalyticsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  const data =
    isSupabaseConfigured() && orgId
      ? await getCrmAnalyticsPayload(await createClient(), orgId)
      : EMPTY_ANALYTICS;

  return (
    <>
      <AgencyPageHeader
        title="CRM Analytics"
        subtitle="Agency revenue, artist performance, ticket sales, conversion rates, and growth trends across your booking portfolio."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      <AgencyCrmAnalyticsPanel data={data} />
    </>
  );
}
