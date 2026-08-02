import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsIntelligencePanel } from "@/components/agency/os/agency-os-intelligence-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { computeAndGetAgencyIntelligence } from "@/lib/data/agency-business-os";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyIntelligencePage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const data =
    isSupabaseConfigured() && orgId
      ? await computeAndGetAgencyIntelligence(await createClient(), orgId)
      : null;

  return (
    <>
      <AgencyPageHeader
        title="Talent Intelligence"
        subtitle="Rising star scores, artist health, AI collaboration matches, and revenue forecasts."
      />
      {data ? (
        <AgencyOsIntelligencePanel data={data} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to view talent intelligence.</p>
      )}
    </>
  );
}
