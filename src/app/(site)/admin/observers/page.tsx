import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminObserversPanel } from "@/components/admin/command-center/admin-observers-panel";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listObserverAccounts } from "@/lib/auth/observer";

export const metadata: Metadata = { title: "Observer Accounts — Admin" };

export default async function AdminObserversPage() {
  const accounts = await listObserverAccounts();

  return (
    <AdminCommandShell
      title="Observer Accounts"
      subtitle="Internal viewers who can enter any event without tickets and are excluded from public metrics."
    >
      <div className="space-y-8">
        <Card className="glass-panel border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">How observers work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Observers enter live events and venues without purchasing tickets.</p>
            <p>They do not increment public viewer counts, chat activity, or popularity metrics.</p>
            <p>Presence is logged internally in observer_presence for admin reporting only.</p>
          </CardContent>
        </Card>

        <AdminObserversPanel accounts={accounts} />

        <AdminTodoPanel
          title="Observer reporting TODOs"
          items={[
            "Observer presence timeline dashboard (event / venue sessions)",
            "Export observer audit log for compliance",
            "Venue observer access without ticket (mirror event flow)",
          ]}
        />
      </div>
    </AdminCommandShell>
  );
}
