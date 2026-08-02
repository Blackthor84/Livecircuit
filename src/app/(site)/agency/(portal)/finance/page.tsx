import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyOsFinancePanel } from "@/components/agency/os/agency-os-finance-panel";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getAgencyFinancePayload } from "@/lib/data/agency-business-os";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config/env";

export default async function AgencyFinancePage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;

  const data =
    isSupabaseConfigured() && user && orgId
      ? await getAgencyFinancePayload(await createClient(), orgId, user.id)
      : null;

  return (
    <>
      <AgencyPageHeader
        title="Finance"
        subtitle="Revenue overview, payouts, commissions, P&L, invoices, and royalty statements — exportable and Stripe-ready."
      />
      {data && orgId ? (
        <AgencyOsFinancePanel orgId={orgId} data={data} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to view financial dashboards.</p>
      )}
    </>
  );
}
