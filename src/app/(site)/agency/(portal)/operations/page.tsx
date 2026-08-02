import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsOperationsPanel } from "@/components/agency/os/agency-os-operations-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getAgencyOperationsPayload } from "@/lib/data/agency-business-os";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyOperationsPage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const data =
    isSupabaseConfigured() && orgId
      ? await getAgencyOperationsPayload(await createClient(), orgId)
      : null;

  return (
    <>
      <AgencyPageHeader
        title="Operations"
        subtitle="Today's tasks, approvals, staff workload, contract reminders, and payment deadlines."
      />
      {data && orgId ? (
        <AgencyOsOperationsPanel orgId={orgId} data={data} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to view operations.</p>
      )}
    </>
  );
}
