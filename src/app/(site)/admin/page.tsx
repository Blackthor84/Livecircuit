import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminOverviewMetrics } from "@/components/admin/command-center/admin-overview-metrics";
import { AdminOverviewSkeleton } from "@/components/admin/command-center/admin-overview-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Overview — Command Center" };

export default function AdminOverviewPage() {
  return (
    <>
      <AdminPageHeader
        title="Overview"
        subtitle="Platform snapshot — users, live activity, and moderation queues."
      />

      <Suspense fallback={<AdminOverviewSkeleton />}>
        <AdminOverviewMetrics />
      </Suspense>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button href="/admin/live" variant="outline" size="sm">
              Live Now
            </Button>
            <Button href="/admin/moderation" variant="outline" size="sm">
              Moderation
            </Button>
            <Button href="/admin/users" variant="outline" size="sm">
              Users
            </Button>
            <Button href="/admin/health" variant="outline" size="sm">
              System Health
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
