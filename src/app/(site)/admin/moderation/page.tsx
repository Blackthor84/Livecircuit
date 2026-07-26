import type { Metadata } from "next";
import {
  AdminModerationPanel,
  AdminRefundsPanel,
  AdminVerificationPanel,
} from "@/components/admin/admin-panels";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Moderation — Admin" };

export default async function AdminModerationPage() {
  const { verifications, reports, orders } = await getAdminDashboardData();

  return (
    <>
      <AdminPageHeader title="Moderation" subtitle="Verification queue, user reports, and refund operations." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Moderation queue</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminModerationPanel items={reports} />
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Verification requests</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminVerificationPanel items={verifications} />
          </CardContent>
        </Card>
      </div>
      <Card className="glass-panel mt-6 border-white/10">
        <CardHeader>
          <CardTitle>Refunds</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminRefundsPanel items={orders} />
        </CardContent>
      </Card>
    </>
  );
}
