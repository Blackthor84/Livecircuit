import type { Metadata } from "next";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminAgencies } from "@/lib/data/agencies";

export const metadata: Metadata = { title: "Agencies — Admin" };

export default async function AdminAgenciesPage() {
  const agencies = await listAdminAgencies(100);

  return (
    <>
      <AdminPageHeader
        title="Agencies"
        subtitle="Create, verify, suspend, and manage agency subscriptions, teams, and rosters."
      />
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Agency organizations ({agencies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={agencies}
            emptyMessage="No agencies yet."
            columns={[
              { key: "name", header: "Name", cell: (row) => row.name as string },
              { key: "slug", header: "Slug", cell: (row) => row.slug as string },
              { key: "plan", header: "Plan", cell: (row) => String(row.plan) },
              {
                key: "verified",
                header: "Verified",
                cell: (row) => (row.verified ? "Yes" : "No"),
              },
              {
                key: "test",
                header: "Test",
                cell: (row) => (row.is_test ? "Yes" : "No"),
              },
              {
                key: "created",
                header: "Created",
                cell: (row) => new Date(row.created_at as string).toLocaleDateString(),
              },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
