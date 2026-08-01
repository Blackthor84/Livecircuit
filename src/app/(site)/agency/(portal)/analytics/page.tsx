import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyDashboardPanel } from "@/components/agency/agency-dashboard-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardStats } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyAnalyticsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const stats =
    isSupabaseConfigured() && orgId && user
      ? await getAgencyDashboardStats(await createClient(), orgId, user.id)
      : null;

  return (
    <>
      <AgencyPageHeader
        title="Analytics"
        subtitle="Attendance, watch time, conversion, demographics, geographic heat maps, and top-performing shows."
      />
      {stats ? <AgencyDashboardPanel stats={stats} /> : null}
    </>
  );
}
