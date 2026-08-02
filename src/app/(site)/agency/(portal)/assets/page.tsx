import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsAssetsPanel } from "@/components/agency/os/agency-os-assets-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getAgencyAssetsPayload } from "@/lib/data/agency-business-os";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyAssetsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const data =
    isSupabaseConfigured() && orgId
      ? await getAgencyAssetsPayload(await createClient(), orgId)
      : null;

  return (
    <>
      <AgencyPageHeader
        title="Asset Library"
        subtitle="Digital assets, press kits, brand guidelines, contracts, and internal knowledge base."
      />
      {data && orgId ? (
        <AgencyOsAssetsPanel orgId={orgId} data={data} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to manage assets.</p>
      )}
    </>
  );
}
