import { AgencyPageHeader } from "@/components/agency/agency-dashboard-layout";
import { AgencyRevenuePanel } from "@/components/agency/agency-revenue-panel";
import { getAgencyRevenueReport } from "@/lib/data/agency-features";
import { getSessionUser } from "@/lib/auth/session";

type Props = { params: Promise<{ orgId: string }> };

export default async function AgencyRevenuePage({ params }: Props) {
  const { orgId } = await params;
  const user = await getSessionUser();
  const report = user
    ? await getAgencyRevenueReport(orgId, user.id)
    : null;

  return (
    <>
      <AgencyPageHeader
        title="Revenue"
        subtitle="Tickets, subscriptions, tips, merch, sponsorship, payouts, refunds, and net revenue — exportable to CSV, Excel, and PDF."
      />
      {report ? (
        <AgencyRevenuePanel orgId={orgId} report={report} />
      ) : (
        <p className="text-sm text-muted-foreground">Sign in with agency access to view revenue.</p>
      )}
    </>
  );
}
