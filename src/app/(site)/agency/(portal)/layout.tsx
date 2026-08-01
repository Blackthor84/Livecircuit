import { redirect } from "next/navigation";
import { AgencyAccessError } from "@/components/agency/agency-access-error";
import { AgencyDashboardLayout } from "@/components/agency/agency-dashboard-layout";
import { loadAgencySessionForUser } from "@/lib/agency/server";
import { getImpersonationState } from "@/lib/auth/impersonation";
import { getHeaderUser, getSessionUser } from "@/lib/auth/session";
import { requireFeatureAccess } from "@/lib/features/guard";
import type { AgencyOrgAccessDeniedCode } from "@/lib/agency";

function mapSessionFailure(code: string): AgencyOrgAccessDeniedCode {
  switch (code) {
    case "no_membership":
      return "no_membership";
    case "organization_not_found":
      return "organization_not_found";
    case "permissions_missing":
      return "permissions_missing";
    case "subscription_missing":
      return "subscription_missing";
    case "not_configured":
      return "not_configured";
    default:
      return "no_membership";
  }
}

type Props = { children: React.ReactNode };

export default async function AgencyPortalLayout({ children }: Props) {
  await requireFeatureAccess("agency_portal");
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/agency/dashboard");

  console.info("[Agency Portal] Loading dashboard layout", { userId: user.id });
  const sessionResult = await loadAgencySessionForUser(user.id);
  if (!sessionResult.ok) {
    const impersonating = Boolean(await getImpersonationState());
    return (
      <AgencyAccessError
        orgId="—"
        code={mapSessionFailure(sessionResult.code)}
        message={sessionResult.message}
        impersonating={impersonating}
        failureCode={sessionResult.code}
        canRepair={Boolean(user.id)}
        userId={user.id}
      />
    );
  }

  const { session } = sessionResult;
  console.info("[Agency Portal] Dashboard loaded", {
    userId: user.id,
    orgId: session.orgId,
    memberRole: session.memberRole,
  });

  const headerUser = await getHeaderUser();

  return (
    <AgencyDashboardLayout
      orgId={session.orgId}
      orgName={session.organization.name as string}
      user={headerUser}
    >
      {children}
    </AgencyDashboardLayout>
  );
}
