import type { Metadata } from "next";
import { AgencyDashboardPanel } from "@/components/agency/agency-dashboard-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { createClient } from "@/lib/supabase/server";
import { getAgencyDashboardStats, getAgencyOrganization } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";

type Props = { params: Promise<{ orgId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orgId } = await params;
  const user = await getSessionUser();
  if (!user) return { title: "Agency Dashboard" };
  const ctx = await getAgencyOrganization(orgId, user.id);
  return { title: ctx ? `${ctx.organization.name} · Agency` : "Agency Dashboard" };
}

export default async function AgencyDashboardPage({ params }: Props) {
  const user = await getSessionUser();
  const { orgId } = await params;
  const ctx = user ? await getAgencyOrganization(orgId, user.id) : null;

  const stats =
    isSupabaseConfigured() && user
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
        orgName={ctx?.organization.name as string}
        verified={Boolean(ctx?.organization.verified)}
      />
      <AgencyDashboardPanel stats={stats} />
    </>
  );
}
