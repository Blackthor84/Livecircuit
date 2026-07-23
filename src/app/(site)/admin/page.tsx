import type { Metadata } from "next";
import {
  AdminModerationPanel,
  AdminRefundsPanel,
  AdminVerificationPanel,
} from "@/components/admin/admin-panels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireRoles } from "@/lib/auth/guards";
import { getAdminDashboardData } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireRoles(["admin"], "/");

  const { verifications, reports, orders } = await getAdminDashboardData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-muted-foreground">Users, verification, moderation, payouts, and venues.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" href="/admin/venues">
          Manage virtual venues
        </Button>
        <Button variant="outline" href="/admin/sponsors">
          Sponsor organizations
        </Button>
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
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
    </div>
  );
}
