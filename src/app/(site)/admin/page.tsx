import type { Metadata } from "next";
import { AdminCommandShell } from "@/components/admin/command-center/admin-command-shell";
import { AdminKpiGrid } from "@/components/admin/command-center/admin-kpi-grid";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { AdminTrendCharts } from "@/components/admin/command-center/admin-trend-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ADMIN_PIPELINE_TODOS } from "@/lib/admin/sections";
import { getAdminPlatformOverview } from "@/lib/data/admin-command-center";

export const metadata: Metadata = { title: "Command Center — Admin" };

export default async function AdminOverviewPage() {
  const overview = await getAdminPlatformOverview();

  return (
    <AdminCommandShell
      title="Command Center"
      subtitle="Executive overview of platform health, growth, and operational queues."
    >
      <div className="space-y-8">
        <AdminKpiGrid kpis={overview.kpis} />

        <AdminTrendCharts
          signupTrend={overview.signupTrend}
          revenueTrend={overview.revenueTrend}
          engagementTrend={overview.engagementTrend}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="glass-panel border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Operational queues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Pending verifications</span>
                <span className="font-semibold tabular-nums">{overview.queues.pendingVerifications}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Open moderation reports</span>
                <span className="font-semibold tabular-nums">{overview.queues.openReports}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Paid orders (refund queue)</span>
                <span className="font-semibold tabular-nums">{overview.queues.paidOrders}</span>
              </div>
              <Button href="/admin/moderation" variant="secondary" className="mt-2 w-full">
                Open moderation hub
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-panel border-white/10 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button href="/admin/live" variant="outline">
                Live operations
              </Button>
              <Button href="/admin/analytics" variant="outline">
                Analytics & segmentation
              </Button>
              <Button href="/admin/revenue" variant="outline">
                Revenue
              </Button>
              <Button href="/admin/observers" variant="outline">
                Observer accounts
              </Button>
              <Button href="/admin/venues" variant="outline">
                Venues
              </Button>
              <Button href="/admin/sponsors" variant="outline">
                Sponsorships
              </Button>
            </CardContent>
          </Card>
        </div>

        <AdminTodoPanel items={[...overview.todos, ...ADMIN_PIPELINE_TODOS]} />
      </div>
    </AdminCommandShell>
  );
}
