import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminFans } from "@/lib/data/admin-entities";

export const metadata: Metadata = { title: "Fans — Admin" };

export default async function AdminFansPage() {
  const fans = await listAdminFans(100);

  return (
    <AdminCommandShell title="Fans" subtitle="Fan accounts and onboarding status. Use Analytics for segmentation.">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Fans ({fans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={fans}
            emptyMessage="No fans found."
            columns={[
              {
                key: "name",
                header: "Fan",
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.display_name ?? "—"}</p>
                    {row.username ? <p className="text-xs text-muted-foreground">@{row.username}</p> : null}
                  </div>
                ),
              },
              {
                key: "onboarding",
                header: "Onboarded",
                cell: (row) => (row.onboarding_completed ? "Yes" : "No"),
              },
              {
                key: "created",
                header: "Joined",
                cell: (row) => new Date(row.created_at).toLocaleDateString(),
              },
            ]}
          />
        </CardContent>
      </Card>
    </AdminCommandShell>
  );
}
