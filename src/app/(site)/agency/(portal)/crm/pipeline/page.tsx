import type { Metadata } from "next";
import { AgencyCrmPipelinePanel } from "@/components/agency/crm/agency-crm-pipeline-panel";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listCrmBookings, listOrgArtistsForCrm } from "@/lib/data/agency-crm";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/config/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Booking Pipeline" };

export default async function AgencyCrmPipelinePage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : "";
  const org = sessionResult?.ok ? sessionResult.session.organization : null;

  const supabase = isSupabaseConfigured() ? await createClient() : null;
  const [bookings, artists] = supabase && orgId
    ? await Promise.all([
        listCrmBookings(supabase, orgId),
        listOrgArtistsForCrm(supabase, orgId),
      ])
    : [[], []];

  return (
    <>
      <AgencyPageHeader
        title="Booking Pipeline"
        subtitle="Drag bookings between stages as deals progress from inquiry to completed event."
        orgName={org?.name as string}
        verified={Boolean(org?.verified)}
      />
      {orgId ? (
        <AgencyCrmPipelinePanel orgId={orgId} bookings={bookings} artists={artists} />
      ) : null}
    </>
  );
}
