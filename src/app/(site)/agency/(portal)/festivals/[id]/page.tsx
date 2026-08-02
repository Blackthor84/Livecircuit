import { notFound } from "next/navigation";
import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsFestivalDetailPanel } from "@/components/agency/os/agency-os-festivals-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getAgencyFestivalDetail } from "@/lib/data/agency-business-os";
import { listAgencyManagedArtists } from "@/lib/data/agencies";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyFestivalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  if (!isSupabaseConfigured() || !user || !orgId) {
    return (
      <>
        <AgencyPageHeader title="Festival" subtitle="Sign in to manage festivals." />
        <p className="text-sm text-muted-foreground">Agency access required.</p>
      </>
    );
  }

  const supabase = await createClient();
  const [festival, roster] = await Promise.all([
    getAgencyFestivalDetail(supabase, orgId, id),
    listAgencyManagedArtists(orgId, user.id),
  ]);

  if (!festival) notFound();

  const rosterArtistIds = roster.map((a) => ({ id: a.artist_id, stage_name: a.artists?.stage_name ?? "Artist" }));

  return (
    <>
      <AgencyPageHeader title="Festival Builder" subtitle="Lineup, passes, sponsors, and marketing." />
      <AgencyOsFestivalDetailPanel orgId={orgId} festival={festival} rosterArtistIds={rosterArtistIds} />
    </>
  );
}
