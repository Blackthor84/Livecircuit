import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminHealthCards } from "@/components/admin/command-center/admin-health-cards";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { ADMIN_PIPELINE_TODOS } from "@/lib/admin/sections";
import { getAdminEntityCounts, getAdminPlatformOverview } from "@/lib/data/admin-command-center";

export const metadata: Metadata = { title: "Platform Health — Admin" };

export default async function AdminHealthPage() {
  const [overview, entityCounts] = await Promise.all([getAdminPlatformOverview(), getAdminEntityCounts()]);

  return (
    <>
      <AdminPageHeader
        title="System Health"
        subtitle="Infrastructure connectivity, feature flags, platform settings, and pipeline readiness."
      />
      <div className="space-y-8">
        <section id="features">
          <h2 className="mb-4 text-lg font-semibold">Feature Flags</h2>
          <AdminHealthCards health={overview.health} entityCounts={entityCounts} />
        </section>
        <section id="settings">
          <h2 className="mb-4 text-lg font-semibold">Platform Settings</h2>
          <AdminTodoPanel
          title="Health telemetry TODOs"
          items={[
            "LiveKit webhook stream health (bitrate, packet loss, reconnect rate)",
            "Supabase connection pool / latency monitoring",
            "Stripe webhook delivery success rate dashboard",
            ...ADMIN_PIPELINE_TODOS,
          ]}
        />
        </section>
      </div>
    </>
  );
}
