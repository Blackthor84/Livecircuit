import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AgencyCrmBookingDetailPanel } from "@/components/agency/crm/agency-crm-booking-detail-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import {
  getCrmBooking,
  listCrmActivities,
  listCrmChecklist,
  listCrmContracts,
  listCrmPayments,
  listCrmTasksForBooking,
  listOrgArtistsForCrm,
  listOrgMembersForCrm,
  listOrgVenuesForCrm,
  seedCrmChecklistForBooking,
} from "@/lib/data/agency-crm";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ bookingId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookingId } = await params;
  return { title: `Booking ${bookingId.slice(0, 8)}…` };
}

export default async function AgencyCrmBookingDetailPage({ params }: Props) {
  const { bookingId } = await params;
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  if (!orgId || !isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  const booking = await getCrmBooking(supabase, orgId, bookingId);
  if (!booking) notFound();

  await seedCrmChecklistForBooking(supabase, bookingId);

  const [tasks, activities, payments, contracts, checklist, members, artists, venues] =
    await Promise.all([
      listCrmTasksForBooking(supabase, bookingId),
      listCrmActivities(supabase, orgId, bookingId),
      listCrmPayments(supabase, bookingId),
      listCrmContracts(supabase, bookingId),
      listCrmChecklist(supabase, bookingId),
      listOrgMembersForCrm(supabase, orgId),
      listOrgArtistsForCrm(supabase, orgId),
      listOrgVenuesForCrm(supabase),
    ]);

  return (
    <>
      <AgencyPageHeader
        title="Booking Record"
        orgName={sessionResult?.ok ? (sessionResult.session.organization.name as string) : undefined}
        verified={Boolean(sessionResult?.ok && sessionResult.session.organization.verified)}
      />
      <AgencyCrmBookingDetailPanel
        orgId={orgId}
        booking={booking}
        tasks={tasks}
        activities={activities}
        payments={payments}
        contracts={contracts}
        checklist={checklist}
        members={members}
        artists={artists}
        venues={venues}
      />
    </>
  );
}
