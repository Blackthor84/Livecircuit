import { notFound, redirect } from "next/navigation";
import { AgencyDashboardLayout } from "@/components/agency/agency-dashboard-layout";
import { getAgencyOrganization } from "@/lib/data/agencies";
import { getHeaderUser, getSessionUser } from "@/lib/auth/session";
import { requireFeatureAccess } from "@/lib/features/guard";

type Props = { children: React.ReactNode; params: Promise<{ orgId: string }> };

export default async function AgencyOrgLayout({ children, params }: Props) {
  await requireFeatureAccess("agency_portal");
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/agency");

  const { orgId } = await params;
  const ctx = await getAgencyOrganization(orgId, user.id);
  if (!ctx) notFound();

  const headerUser = await getHeaderUser();

  return (
    <AgencyDashboardLayout orgId={orgId} orgName={ctx.organization.name as string} user={headerUser}>
      {children}
    </AgencyDashboardLayout>
  );
}
