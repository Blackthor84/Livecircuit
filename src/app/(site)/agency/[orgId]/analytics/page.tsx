import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyDashboardPanel } from "@/components/agency/agency-dashboard-panel";
import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardStats } from "@/lib/data/agencies";
import { isSupabaseConfigured } from "@/lib/config/env";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyAnalyticsPage({ params }: Props) {
  const { orgId } = await params;
  const stats = isSupabaseConfigured()
    ? await getAgencyDashboardStats(await createClient(), orgId)
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
