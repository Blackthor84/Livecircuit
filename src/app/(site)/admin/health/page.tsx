import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminHealthCards } from "@/components/admin/command-center/admin-health-cards";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { ADMIN_PIPELINE_TODOS } from "@/lib/admin/sections";
import { getAdminEntityCounts, getAdminPlatformOverview } from "@/lib/data/admin-command-center";

export const metadata: Metadata = { title: "Platform Health — Admin" };

export default async function AdminHealthPage() {
  const [overview, entityCounts] = await Promise.all([getAdminPlatformOverview(), getAdminEntityCounts()]);

  return (
    <AdminCommandShell
      title="Platform Health"
      subtitle="Infrastructure connectivity, catalog footprint, and pipeline readiness."
    >
      <div className="space-y-8">
        <AdminHealthCards health={overview.health} entityCounts={entityCounts} />
        <AdminTodoPanel
          title="Health telemetry TODOs"
          items={[
            "LiveKit webhook stream health (bitrate, packet loss, reconnect rate)",
            "Supabase connection pool / latency monitoring",
            "Stripe webhook delivery success rate dashboard",
            ...ADMIN_PIPELINE_TODOS,
          ]}
        />
      </div>
    </AdminCommandShell>
  );
}
