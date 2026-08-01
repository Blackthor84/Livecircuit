import type { Metadata } from "next";
import { AgencyDashboardPanel } from "@/components/agency/agency-dashboard-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/session.server";
import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardStats } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getSessionUser();
  if (!user) return { title: "Agency Dashboard" };
  const sessionResult = await loadAgencySessionForUser(user.id);
  if (!sessionResult.ok) return { title: "Agency Dashboard" };
  return {
    title: `${sessionResult.session.organization.name as string} · Agency`,
  };
}

export default async function AgencyDashboardPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  const stats =
    isSupabaseConfigured() && user && orgId
      ? await getAgencyDashboardStats(await createClient(), orgId)
      : {
          totalArtists: 0,
          activeArtists: 0,
          upcomingPerformances: 0,
          ticketsSold: 0,
          grossRevenueCents: 0,
          pendingBookingRequests: 0,
          upcomingSponsorships: 0,
          newFollowers: 0,
          monthlyRevenueCents: 0,
          trendingArtists: [],
          revenueByArtist: [],
          revenueByGenre: [],
          revenueTrend: [],
          ticketsTrend: [],
          attendanceTrend: [],
          geoAudience: [],
        };

  return (
    <>
      <AgencyPageHeader
        title="Dashboard"
        subtitle="Manage your roster, bookings, revenue, and sponsorship opportunities from one professional command center."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      <AgencyDashboardPanel stats={stats} />
    </>
  );
}
