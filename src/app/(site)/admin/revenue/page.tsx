import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/command-center/admin-dashboard-layout";
import { AdminTodoPanel } from "@/components/admin/command-center/admin-todo-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminRevenueSummary } from "@/lib/data/admin-entities";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = { title: "Revenue — Admin" };

export default async function AdminRevenuePage() {
  const revenue = await getAdminRevenueSummary();

  return (
    <>
      <AdminPageHeader title="Revenue" subtitle="Platform GMV, ticket volume, and tips from paid orders." />
      <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">GMV (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCents(revenue.gmv30d)}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">GMV (all time)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCents(revenue.gmvAllTime)}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Tickets (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{revenue.tickets30d}</p>
            </CardContent>
          </Card>
          <Card className="glass-panel border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-normal text-muted-foreground">Tips (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{formatCents(revenue.tips30d)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-panel border-white/10">
          <CardHeader>
            <CardTitle>Revenue by order type (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {!revenue.ordersByType.length ? (
              <p className="text-sm text-muted-foreground">No paid orders in the last 30 days.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {revenue.ordersByType.map((row) => (
                  <li key={row.type} className="flex items-center justify-between gap-4">
                    <span className="capitalize">{row.type.replace(/_/g, " ")}</span>
                    <span className="font-medium tabular-nums">{formatCents(row.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <AdminTodoPanel
          title="Revenue pipeline TODOs"
          items={[
            "Artist payout reconciliation dashboard (Stripe Connect not enabled)",
            "Refund rate and chargeback monitoring",
            "Sponsor contract revenue attribution",
          ]}
        />
      </div>
    </>
  );
}
