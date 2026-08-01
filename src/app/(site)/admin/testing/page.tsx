import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { TestingCenterPanel } from "@/components/admin/testing/testing-center-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTestingAccessForUser } from "@/lib/testing/permissions";
import { countTestAccounts, listTestAccounts } from "@/lib/testing/server";
import { getSessionUser } from "@/lib/auth/session";
import { isImpersonating } from "@/lib/auth/impersonation";

export const metadata: Metadata = { title: "Testing Center — Admin" };

export default async function AdminTestingPage() {
  if (await isImpersonating()) redirect("/discover");

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin/testing");

  const access = await getTestingAccessForUser(user.id);
  if (access.level === "none") redirect("/");

  const [accounts, totalCount] = await Promise.all([listTestAccounts(100), countTestAccounts()]);

  return (
    <>
      <AdminPageHeader
        title="Testing Center"
        subtitle="Create realistic test users, impersonate them with production-identical sessions, and simulate platform activity."
      />
      <div className="space-y-8">
        <Card className="glass-panel border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Production-identical impersonation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Impersonation swaps your Supabase session to the test user — same RLS, APIs, and UI as a real account.</p>
            <p>No admin navigation, debug menus, or elevated permissions are visible while impersonating.</p>
            <p>Test accounts are excluded from notifications and default analytics.</p>
          </CardContent>
        </Card>

        <TestingCenterPanel
          accounts={accounts}
          totalCount={totalCount}
          canManage={access.canManageTestUsers}
          canImpersonate={access.canImpersonate}
        />
      </div>
    </>
  );
}
