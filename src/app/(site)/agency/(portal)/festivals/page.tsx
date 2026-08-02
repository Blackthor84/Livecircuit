import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsFestivalsPanel } from "@/components/agency/os/agency-os-festivals-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { listAgencyFestivals } from "@/lib/data/agency-business-os";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyFestivalsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const festivals =
    isSupabaseConfigured() && orgId
      ? await listAgencyFestivals(await createClient(), orgId)
      : [];

  return (
    <>
      <AgencyPageHeader
        title="Festival Builder"
        subtitle="Create multi-artist digital festivals with passes, sponsors, landing pages, and analytics."
      />
      {orgId ? (
        <AgencyOsFestivalsPanel orgId={orgId} festivals={festivals} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to build festivals.</p>
      )}
    </>
  );
}
