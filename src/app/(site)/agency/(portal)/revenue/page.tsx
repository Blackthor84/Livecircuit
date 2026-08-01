import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyRevenuePanel } from "@/components/agency/agency-revenue-panel";
import { loadAgencySessionForUser } from "@/lib/agency/session.server";
import { getAgencyRevenueReport } from "@/lib/data/agency-features";
import { getSessionUser } from "@/lib/auth/session";

export default async function AgencyRevenuePage() {
  const user = await getSessionUser();
  const sessionResult = user ? await loadAgencySessionForUser(user.id) : null;
  const orgId = sessionResult?.ok ? sessionResult.session.orgId : null;
  const report = user && orgId ? await getAgencyRevenueReport(orgId, user.id) : null;

  return (
    <>
      <AgencyPageHeader
        title="Revenue"
        subtitle="Tickets, subscriptions, tips, merch, sponsorship, payouts, refunds, and net revenue — exportable to CSV, Excel, and PDF."
      />
      {report ? (
        <AgencyRevenuePanel orgId={orgId!} report={report} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to view revenue.</p>
      )}
    </>
  );
}
