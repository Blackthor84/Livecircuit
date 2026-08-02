import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsMarketingPanel } from "@/components/agency/os/agency-os-marketing-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getAgencyMarketingPayload } from "@/lib/data/agency-business-os";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyMarketingPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const data =
    isSupabaseConfigured() && orgId
      ? await getAgencyMarketingPayload(await createClient(), orgId)
      : null;

  return (
    <>
      <AgencyPageHeader
        title="Marketing Center"
        subtitle="One-click campaigns, countdown schedules, referral tracking, and AI-branded graphics for every channel."
      />
      {data && orgId ? (
        <AgencyOsMarketingPanel orgId={orgId} data={data} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to open the marketing center.</p>
      )}
    </>
  );
}
