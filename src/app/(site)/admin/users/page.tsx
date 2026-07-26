import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminEntityTable } from "@/components/admin/command-center/admin-entity-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAdminUsers } from "@/lib/data/admin-entities";

export const metadata: Metadata = { title: "Users — Admin" };

export default async function AdminUsersPage() {
  const users = await listAdminUsers(100);

  return (
    <AdminCommandShell title="Users" subtitle="All platform accounts by role and signup date.">
      <Card className="glass-panel border-white/10">
        <CardHeader>
          <CardTitle>Recent users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminEntityTable
            rows={users}
            emptyMessage="No users found."
            columns={[
              {
                key: "name",
                header: "User",
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.display_name ?? "—"}</p>
                    {row.username ? <p className="text-xs text-muted-foreground">@{row.username}</p> : null}
                  </div>
                ),
              },
              { key: "role", header: "Role", cell: (row) => <span className="capitalize">{row.role}</span> },
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
